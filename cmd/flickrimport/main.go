package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v5"
)

// Minimal, dependency-light Flickr importer that:
// - Scans content/gallery/* for gallery pages with a flickr_album param
// - Calls flickr.photosets.getPhotos with rich `extras` once per photoset (with pagination)
// - Optionally fetches photos.getExif (config flags)
// - Writes raw JSON responses under data/flickr/photosets/{slug}.json
// - Does NOT generate per-image markdown stubs.
// - Does NOT download any images; uses remote staticflickr URLs in templates.

// Environment / flags
//   FLICKR_API_KEY env var or -apikey flag
//   -onlySet <photoset_id> optional to limit run
//   (always fetch exif per photo)
//   -timeout http timeout (default 20s)

const (
	baseAPI = "https://api.flickr.com/services/rest/"
)

// doRequestWithBackoff performs an HTTP request with exponential backoff on 429 and transient errors.
func doRequestWithBackoff(client *http.Client, req *http.Request) (*http.Response, error) {
	operation := func() (*http.Response, error) {
		r, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		// Retry on 429 Too Many Requests
		if r.StatusCode == http.StatusTooManyRequests {
			r.Body.Close()
			return nil, backoff.Permanent(fmt.Errorf("http 429: too many requests"))
		}
		// Retry on 5xx errors (except 501 Not Implemented)
		if r.StatusCode >= 500 && r.StatusCode != http.StatusNotImplemented {
			r.Body.Close()
			return nil, fmt.Errorf("http %d: server error", r.StatusCode)
		}
		return r, nil
	}

	b := backoff.NewExponentialBackOff()
	ctx := context.Background()
	resp, err := backoff.Retry(ctx, operation, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(30*time.Second))
	return resp, err
}

type PhotosetsGetPhotosResp struct {
	Photoset struct {
		ID      string      `json:"id"`
		Owner   string      `json:"owner"`
		Photo   []Photo     `json:"photo"`
		Page    json.Number `json:"page"`
		Pages   json.Number `json:"pages"`
		PerPage json.Number `json:"perpage"`
		Total   json.Number `json:"total"`
	} `json:"photoset"`
	Stat    string                     `json:"stat"`
	Message string                     `json:"message,omitempty"`
	Code    int                        `json:"code,omitempty"`
	Exif    map[string]json.RawMessage `json:"exif,omitempty"`
}

type Photo struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description struct {
		_ string `json:"_content"`
	} `json:"description"`
	Tags       []string         `json:"tags"`
	DateUpload string           `json:"dateupload"`
	DateTaken  string           `json:"datetaken"`
	OwnerName  string           `json:"ownername"`
	License    string           `json:"license"`
	PathAlias  string           `json:"pathalias"`
	URLSq      string           `json:"url_sq"`
	URLT       string           `json:"url_t"`
	URLS       string           `json:"url_s"`
	URLN       string           `json:"url_n"`
	URLM       string           `json:"url_m"`
	URLZ       string           `json:"url_z"`
	URLC       string           `json:"url_c"`
	URLL       string           `json:"url_l"`
	URLH       string           `json:"url_h"`
	URLK       string           `json:"url_k"`
	URLO       string           `json:"url_o"`
	LastUpdate string           `json:"last_update"`
	Exif       *PhotoExifFields `json:"exif,omitempty"`
}

type PhotoExifFields struct {
	Model       string `json:"model,omitempty"`
	Lens        string `json:"lens,omitempty"`
	Flash       string `json:"flash,omitempty"`
	FocalLength string `json:"focallength,omitempty"`
	FStop       string `json:"fstop,omitempty"`
	Exposure    string `json:"exposure,omitempty"`
	ISO         string `json:"iso,omitempty"`
	Time        string `json:"time,omitempty"`
	Location    string `json:"location,omitempty"`
}

type PhotoExifResp struct {
	Photo json.RawMessage `json:"photo"`
	Stat  string          `json:"stat"`
}

type Config struct {
	APIKey      string
	HTTPTimeout time.Duration
	OnlySet     string
	ForceSlug   string
	ForceSetID  string
}

func main() {
	cfg := loadConfig()
	if cfg.APIKey == "" {
		fmt.Fprintln(os.Stderr, "FLICKR_API_KEY not set; pass -apikey or env var")
		os.Exit(1)
	}

	ctx := context.Background()
	client := &http.Client{Timeout: cfg.HTTPTimeout}

	// Direct mode: fetch a specific set and write to a specific slug.
	if cfg.ForceSetID != "" {
		slug := cfg.ForceSlug
		if slug == "" {
			slug = cfg.ForceSetID
		}
		ps, err := fetchPhotosetAll(ctx, client, cfg.APIKey, cfg.ForceSetID)
		if err != nil {
			fatal(err)
		}
		if err := writePhotosetJSON(slug, ps); err != nil {
			fatal(err)
		}
		fmt.Println("Done.")
		return
	}

	// Discover galleries by scanning content/gallery for .md with flickr_album
	galleries, err := findGalleries("content/gallery")
	if err != nil {
		fatal(err)
	}
	if len(galleries) == 0 {
		fmt.Println("No galleries found.")
		return
	}

	for _, g := range galleries {
		if cfg.OnlySet != "" && g.PhotosetID != cfg.OnlySet {
			continue
		}
		fmt.Printf("Ingesting photoset %s (%s)\n", g.PhotosetID, g.Slug)

		// Fetch all photos in set with extras
		ps, err := fetchPhotosetAll(ctx, client, cfg.APIKey, g.PhotosetID)
		if err != nil {
			fatal(err)
		}

		// Detector: check for existing JSON and compare dateupload
		jsonPath := filepath.Join("data", "flickr", "photosets", g.Slug+".json")
		var oldPhotos map[string]string // photoID -> dateupload
		var oldExif map[string]*PhotoExifFields
		var oldTags map[string][]string // photoID -> tags
		oldPhotos = make(map[string]string)
		oldExif = make(map[string]*PhotoExifFields)
		oldTags = make(map[string][]string)
		if _, err := os.Stat(jsonPath); err == nil {
			// JSON exists, load it
			b, err := os.ReadFile(jsonPath)
			if err == nil {
				var oldData PhotosetsGetPhotosResp
				if err := json.Unmarshal(b, &oldData); err == nil {
					for _, p := range oldData.Photoset.Photo {
						oldPhotos[p.ID] = p.DateUpload
						if p.Exif != nil {
							oldExif[p.ID] = p.Exif
						}
						oldTags[p.ID] = p.Tags
					}
				}
			}
		}

		// Only fetch EXIF and tags for new/updated photos
		for i := range ps.Photoset.Photo {
			photo := &ps.Photoset.Photo[i]
			oldDate, exists := oldPhotos[photo.ID]
			if exists && oldDate == photo.DateUpload && oldExif[photo.ID] != nil {
				// No change, reuse old EXIF and tags
				photo.Exif = oldExif[photo.ID]
				photo.Tags = oldTags[photo.ID]
				continue
			}
			// Fetch EXIF
			exifRaw, err := fetchPhotoExif(ctx, client, cfg.APIKey, photo.ID)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to fetch exif for photo %s: %v\n", photo.ID, err)
				continue
			}
			exifFields := extractExifFields(exifRaw)
			photo.Exif = exifFields

			// Fetch accurate tags
			infoRaw, err := fetchPhotoInfo(ctx, client, cfg.APIKey, photo.ID)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Warning: failed to fetch info for photo %s: %v\n", photo.ID, err)
			} else {
				photo.Tags = extractTagsFromInfo(infoRaw)
			}
			time.Sleep(120 * time.Millisecond) // be polite
		}

		// Persist raw JSON for Hugo data consumption
		if err := writePhotosetJSON(g.Slug, ps); err != nil {
			fatal(err)
		}
	}

	fmt.Println("Done.")
}

func loadConfig() Config {
	var cfg Config
	apikey := os.Getenv("FLICKR_API_KEY")
	flag.StringVar(&apikey, "apikey", apikey, "Flickr API key")
	flag.DurationVar(&cfg.HTTPTimeout, "timeout", 20*time.Second, "HTTP timeout")
	flag.StringVar(&cfg.OnlySet, "onlySet", "", "Limit to a single photoset id")
	flag.StringVar(&cfg.ForceSlug, "slug", "", "Explicit slug for writing data (bypass discovery)")
	flag.StringVar(&cfg.ForceSetID, "set", "", "Explicit photoset id (bypass discovery)")
	flag.Parse()
	cfg.APIKey = apikey
	return cfg
}

type Gallery struct {
	Slug       string
	PhotosetID string
}

var fmSetRe = regexp.MustCompile(`(?m)^flickr_album:\s*"?([0-9]+)"?`)

func findGalleries(root string) ([]Gallery, error) {
	var out []Gallery
	// Strategy:
	// 1. Prefer _index.md inside a directory (content/gallery/{slug}/_index.md)
	// 2. Fallback to legacy flat file (content/gallery/{slug}.md)
	entries, err := os.ReadDir(root)
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		name := e.Name()
		// Skip top-level index or non-md files
		if e.IsDir() {
			// Look for _index.md within directory
			idx := filepath.Join(root, name, "_index.md")
			if b, err := os.ReadFile(idx); err == nil {
				if m := fmSetRe.FindStringSubmatch(string(b)); len(m) == 2 {
					out = append(out, Gallery{Slug: name, PhotosetID: m[1]})
					continue
				}
			}
		}
		// Legacy: flat markdown file named {slug}.md
		if strings.HasSuffix(name, ".md") && !strings.HasPrefix(name, "_") {
			path := filepath.Join(root, name)
			b, err := os.ReadFile(path)
			if err != nil {
				continue
			}
			if m := fmSetRe.FindStringSubmatch(string(b)); len(m) == 2 {
				slug := strings.TrimSuffix(name, filepath.Ext(name))
				out = append(out, Gallery{Slug: slug, PhotosetID: m[1]})
			}
		}
	}
	return out, nil
}

func fetchPhotosetAll(ctx context.Context, client *http.Client, apiKey, setID string) (*PhotosetsGetPhotosResp, error) {
	perPage := 500
	page := 1
	var all []Photo
	var header PhotosetsGetPhotosResp
	for {
		resp, err := fetchPhotosetPage(ctx, client, apiKey, setID, page, perPage)
		if err != nil {
			return nil, err
		}
		if resp.Stat != "ok" {
			return nil, fmt.Errorf("flickr error: code=%d message=%s", resp.Code, resp.Message)
		}
		if page == 1 {
			header = *resp
		}
		all = append(all, resp.Photoset.Photo...)
		pagesInt, err := resp.Photoset.Pages.Int64()
		if err != nil {
			return nil, fmt.Errorf("invalid pages value: %v", err)
		}
		if int64(page) >= pagesInt || len(resp.Photoset.Photo) == 0 {
			break
		}
		page++
		time.Sleep(120 * time.Millisecond) // be polite
	}
	header.Photoset.Photo = all
	return &header, nil
}

func fetchPhotosetPage(ctx context.Context, client *http.Client, apiKey, setID string, page, perPage int) (*PhotosetsGetPhotosResp, error) {
	q := url.Values{}
	q.Set("method", "flickr.photosets.getPhotos")
	q.Set("api_key", apiKey)
	q.Set("photoset_id", setID)
	q.Set("format", "json")
	q.Set("nojsoncallback", "1")
	q.Set("page", fmt.Sprintf("%d", page))
	q.Set("per_page", fmt.Sprintf("%d", perPage))
	q.Set("extras", strings.Join([]string{
		"date_upload", "date_taken", "owner_name", "license", "path_alias", "last_update",
		"url_sq", "url_t", "url_s", "url_n", "url_m", "url_z", "url_c", "url_l", "url_h", "url_k", "url_o",
	}, ","))

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, baseAPI+"?"+q.Encode(), nil)
	res, err := doRequestWithBackoff(client, req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		b, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("http %d: %s", res.StatusCode, string(b))
	}
	var data PhotosetsGetPhotosResp
	dec := json.NewDecoder(res.Body)
	if err := dec.Decode(&data); err != nil {
		return nil, err
	}
	return &data, nil
}

func writePhotosetJSON(slug string, ps *PhotosetsGetPhotosResp) error {
	dir := filepath.Join("data", "flickr", "photosets")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	path := filepath.Join(dir, slug+".json")
	b, err := json.MarshalIndent(ps, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0o644)
}

// Fetch EXIF data for a photo
func fetchPhotoExif(ctx context.Context, client *http.Client, apiKey, photoID string) (json.RawMessage, error) {
	q := url.Values{}
	q.Set("method", "flickr.photos.getExif")
	q.Set("api_key", apiKey)
	q.Set("photo_id", photoID)
	q.Set("format", "json")
	q.Set("nojsoncallback", "1")

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, baseAPI+"?"+q.Encode(), nil)
	res, err := doRequestWithBackoff(client, req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		b, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("http %d: %s", res.StatusCode, string(b))
	}
	var data PhotoExifResp
	dec := json.NewDecoder(res.Body)
	if err := dec.Decode(&data); err != nil {
		return nil, err
	}
	if data.Stat != "ok" {
		return nil, fmt.Errorf("flickr error: %s", data.Stat)
	}
	return data.Photo, nil
}

// Fetch photo info (for accurate tags)
func fetchPhotoInfo(ctx context.Context, client *http.Client, apiKey, photoID string) (json.RawMessage, error) {
	q := url.Values{}
	q.Set("method", "flickr.photos.getInfo")
	q.Set("api_key", apiKey)
	q.Set("photo_id", photoID)
	q.Set("format", "json")
	q.Set("nojsoncallback", "1")

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, baseAPI+"?"+q.Encode(), nil)
	res, err := doRequestWithBackoff(client, req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != 200 {
		b, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("http %d: %s", res.StatusCode, string(b))
	}
	var data struct {
		Photo json.RawMessage `json:"photo"`
		Stat  string          `json:"stat"`
	}
	dec := json.NewDecoder(res.Body)
	if err := dec.Decode(&data); err != nil {
		return nil, err
	}
	if data.Stat != "ok" {
		return nil, fmt.Errorf("flickr error: %s", data.Stat)
	}
	return data.Photo, nil
}

// Extract tags from photo info JSON
func extractTagsFromInfo(raw json.RawMessage) []string {
	var parsed struct {
		Tags struct {
			Tag []struct {
				Raw string `json:"raw"`
			} `json:"tag"`
		} `json:"tags"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil
	}
	var tags []string
	for _, t := range parsed.Tags.Tag {
		tags = append(tags, t.Raw)
	}
	return tags
}

// Extract only the requested EXIF fields from the raw JSON
func extractExifFields(raw json.RawMessage) *PhotoExifFields {
	var parsed struct {
		Camera string `json:"camera"`
		Exif   []struct {
			Tag string `json:"tag"`
			Raw struct {
				Content string `json:"_content"`
			} `json:"raw"`
			Cleaned struct {
				Content string `json:"_content"`
			} `json:"clean"`
		} `json:"exif"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return nil
	}
	fields := &PhotoExifFields{}
	if parsed.Camera != "" {
		fields.Model = parsed.Camera
	}
	for _, e := range parsed.Exif {
		raw_val := e.Raw.Content
		cleaned_val := e.Cleaned.Content
		if cleaned_val == "" {
			cleaned_val = raw_val
		}
		switch e.Tag {
		case "LensModel":
			fields.Lens = cleaned_val
		case "Flash":
			fields.Flash = cleaned_val
		case "FocalLength":
			fields.FocalLength = cleaned_val
		case "FNumber":
			fields.FStop = cleaned_val
		case "ExposureTime":
			fields.Exposure = raw_val
		case "ISO":
			fields.ISO = cleaned_val
		case "DateTimeOriginal":
			fields.Time = cleaned_val
		case "LOLcation":
			fields.Location = cleaned_val
		}
	}
	return fields
}

func safeTitle(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "Untitled"
	}
	return s
}

func fatal(err error) {
	if err == nil {
		return
	}
	var e *url.Error
	if errors.As(err, &e) {
		fmt.Fprintf(os.Stderr, "Error: %v\n", e)
	} else {
		fmt.Fprintln(os.Stderr, err)
	}
	os.Exit(1)
}
