package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestSafeTitle(t *testing.T) {
	cases := []struct{ in, want string }{
		{"  Hello  ", "Hello"},
		{"", "Untitled"},
		{"Test Photo", "Test Photo"},
	}
	for _, tc := range cases {
		got := safeTitle(tc.in)
		if got != tc.want {
			t.Errorf("safeTitle(%q) = %q; want %q", tc.in, got, tc.want)
		}
	}
}

func TestPhotoJSONUnmarshal(t *testing.T) {
	sample := `{
		"photoset": {
			"id": "123",
			"photo": [
				{
					"id": "456",
					"title": "Sunset",
					"url_h": "https://example.com/img_h.jpg",
					"datetaken": "2022-01-01 12:00:00"
				}
			],
			"page": 1,
			"pages": 1
		},
		"stat": "ok"
	}`
	var resp PhotosetsGetPhotosResp
	if err := json.NewDecoder(bytes.NewReader([]byte(sample))).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Stat != "ok" {
		t.Errorf("stat=%s; want ok", resp.Stat)
	}
	if len(resp.Photoset.Photo) != 1 {
		t.Fatalf("photo count=%d; want 1", len(resp.Photoset.Photo))
	}
	p := resp.Photoset.Photo[0]
	if p.ID != "456" || p.Title != "Sunset" || p.URLH != "https://example.com/img_h.jpg" {
		t.Errorf("photo parsed incorrectly: %+v", p)
	}
}

func TestPhotoDimensionsRoundTrip(t *testing.T) {
	for _, quoted := range []bool{false, true} {
		t.Run(fmt.Sprintf("quoted=%t", quoted), func(t *testing.T) {
			input := map[string]any{"id": "123", "tags": []string{"landscape"}}
			for _, size := range strings.Fields("sq t s n m z c l h k o") {
				for axis, value := range map[string]int{"width": 640, "height": 427} {
					var dimension any = value
					if quoted {
						dimension = fmt.Sprint(value)
					}
					input[axis+"_"+size] = dimension
				}
			}
			data, err := json.Marshal(input)
			if err != nil {
				t.Fatal(err)
			}
			var photo Photo
			if err := json.Unmarshal(data, &photo); err != nil {
				t.Fatal(err)
			}
			var response PhotosetsGetPhotosResp
			response.Photoset.Photo = []Photo{photo}
			originalDir, err := os.Getwd()
			if err != nil {
				t.Fatal(err)
			}
			if err := os.Chdir(t.TempDir()); err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() {
				if err := os.Chdir(originalDir); err != nil {
					t.Fatal(err)
				}
			})
			if err := writePhotosetJSON("dimensions", &response); err != nil {
				t.Fatal(err)
			}
			data, err = os.ReadFile("data/flickr/photosets/dimensions.json")
			if err != nil {
				t.Fatal(err)
			}
			var saved struct {
				Photoset struct {
					Photo []map[string]any `json:"photo"`
				} `json:"photoset"`
			}
			if err := json.Unmarshal(data, &saved); err != nil {
				t.Fatal(err)
			}
			for _, size := range strings.Fields("sq t s n m z c l h k o") {
				for axis, want := range map[string]float64{"width": 640, "height": 427} {
					key := axis + "_" + size
					if got := saved.Photoset.Photo[0][key]; got != want {
						t.Errorf("%s = %v, want %v", key, got, want)
					}
				}
			}
		})
	}
	data, err := json.Marshal(Photo{})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "width_") || strings.Contains(string(data), "height_") {
		t.Fatal("missing dimensions should be omitted")
	}
}

// Exercise the real content adapter and gallery partial without Flickr, theme,
// or npm dependencies. These fixtures also cover legacy cached metadata.
func TestGalleryDimensions(t *testing.T) {
	hugo, err := exec.LookPath("hugo")
	if err != nil {
		t.Skip("hugo is required for gallery rendering fixtures")
	}
	root, err := filepath.Abs("../..")
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name       string
		second     string
		justified  bool
		attributes string
		ratio      string
	}{
		{"portrait", `"url_c":"/portrait.jpg","width_c":"400","height_c":"600","width_sq":150,"height_sq":150`, true, `width="400" height="600"`, "0.6666666666666666"},
		{"legacy", `"url_z":"/legacy.jpg"`, false, `width="4" height="3"`, "1.3333333333333333"},
		{"wrong-rendition", `"url_z":"/legacy.jpg","url_c":"/portrait.jpg","width_c":400,"height_c":600`, false, `width="4" height="3"`, "1.3333333333333333"},
		{"zero", `"url_z":"/legacy.jpg","width_z":0,"height_z":600`, false, `width="4" height="3"`, "1.3333333333333333"},
		{"negative", `"url_z":"/legacy.jpg","width_z":400,"height_z":-600`, false, `width="4" height="3"`, "1.3333333333333333"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			write := func(name, content string) {
				t.Helper()
				path := filepath.Join(dir, name)
				if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
					t.Fatal(err)
				}
				if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
					t.Fatal(err)
				}
			}
			for _, name := range []string{"content/gallery/_content.gotmpl", "layouts/partials/gallerys/photoset-grid.html"} {
				data, err := os.ReadFile(filepath.Join(root, name))
				if err != nil {
					t.Fatal(err)
				}
				write(name, string(data))
			}
			write("hugo.toml", "baseURL = 'https://example.org/'\ndisableKinds = ['taxonomy', 'term', 'RSS', 'sitemap']\n")
			write("content/gallery/fixture/_index.md", "---\ntitle: Fixture\n---\n")
			write("layouts/index.html", "Fixture")
			write("layouts/_default/single.html", "{{ .Title }}")
			write("layouts/_default/list.html", `{{ partial "gallerys/photoset-grid.html" (dict "Photosubset" .RegularPages.ByDate) }}`)
			write("data/flickr/photosets/fixture.json", fmt.Sprintf(`{"photoset":{"id":"album","photo":[
				{"id":"2","title":"Portrait","datetaken":"2025-01-02","tags":[],"exif":{"model":"Camera","lens":"Lens"},%s},
				{"id":"1","title":"Landscape","datetaken":"2025-01-01","tags":[],"exif":{"model":"Camera","lens":"Lens"},"url_z":"/landscape.jpg","width_z":600,"height_z":400}
			]}}`, tc.second))
			cmd := exec.Command(hugo, "--source", dir)
			if output, err := cmd.CombinedOutput(); err != nil {
				t.Fatalf("hugo: %v\n%s", err, output)
			}
			data, err := os.ReadFile(filepath.Join(dir, "public/gallery/fixture/index.html"))
			if err != nil {
				t.Fatal(err)
			}
			html := string(data)
			if got := strings.Contains(html, `class="grid has-dimensions"`); got != tc.justified {
				t.Errorf("justified = %t, want %t\n%s", got, tc.justified, html)
			}
			if got := strings.Contains(html, `class="grid-item missing-dimensions"`); got == tc.justified {
				t.Errorf("missing-dimensions marker = %t, justified = %t", got, tc.justified)
			}
			for _, want := range []string{`width="600" height="400"`, "--photo-ratio: 1.5", tc.attributes, "--photo-ratio: " + tc.ratio, `href="/gallery/fixture/1/"`, `href="/gallery/fixture/2/"`, `loading="lazy"`, `decoding="async"`} {
				if !strings.Contains(html, want) {
					t.Errorf("missing %s\n%s", want, html)
				}
			}
			wantSource := `/legacy.jpg`
			if tc.justified {
				wantSource = `/portrait.jpg`
			}
			if !strings.Contains(html, `src="`+wantSource+`"`) {
				t.Errorf("wrong rendition selected\n%s", html)
			}
			if strings.Index(html, `alt="Landscape"`) > strings.Index(html, `alt="Portrait"`) {
				t.Error("photo order changed")
			}
		})
	}
}
