# Flickr Importer

Go-based pre-build tool to ingest Flickr photoset metadata and generate Hugo content stubs.

## Requirements
- Go 1.21+
- Flickr API key: obtain from https://www.flickr.com/services/apps/create/ (non-commercial, apply)

## Usage

**Build:**
```sh
go build ./cmd/flickrimport
```

**Run (all galleries):**
```sh
export FLICKR_API_KEY=your-key-here
./flickrimport
```

**Run (single photoset):**
```sh
./flickrimport -apikey YOUR_KEY -onlySet 72177720327085511
```

**Flags:**
- `-apikey`: Flickr API key (or use `FLICKR_API_KEY` env var)
- `-onlySet`: Limit run to a specific photoset ID
- `-refresh`: Re-fetch metadata even if already cached
- `-exif`: Fetch EXIF per photo (not yet implemented, reserved for future)
- `-info`: Fetch full info per photo (not yet implemented)
- `-timeout`: HTTP timeout (default 20s)

## What it does
1. Scans `content/gallery/*.md` for `flickr_album: "ID"` lines
2. Calls `flickr.photosets.getPhotos` with rich `extras` to get metadata+remote URLs
3. Writes raw JSON response to `data/flickr/photosets/{slug}.json`
4. Generates minimal stub markdown per photo: `content/gallery/{slug}/{photo_id}.md`
5. Does NOT download images; templates reference remote staticflickr.com URLs.

## Integration with Netlify
Add as a pre-build step in `netlify.toml`:
```toml
[build]
  command = "FLICKR_API_KEY=$FLICKR_API_KEY ./flickrimport && hugo --gc --minify"
  publish = "public"
```
Set `FLICKR_API_KEY` as an environment variable in Netlify UI.

## Flickr API Credentials Setup
Store your API key in an environment variable (not committed). For local dev, you can create a `.envrc` or export it:
```sh
export FLICKR_API_KEY=abcdef1234567890
```

Note: This tool currently supports **public photosets only**. OAuth for private sets is reserved for future extension.
