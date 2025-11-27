# Flickr Importer

Go-based pre-build tool to ingest Flickr photoset metadata and generate Hugo content stubs.

## Requirements
- Go 1.21+
- Flickr API credentials: obtain from https://www.flickr.com/services/apps/create/ (non-commercial, apply)

## Authentication

### Option 1: OAuth (Recommended for downloading assets)

OAuth is required for downloading original photos from private albums or accessing user-specific data.

**Setup:**
1. Get your Consumer Key and Consumer Secret from https://www.flickr.com/services/apps/create/
2. Initialize OAuth (one-time setup):
```sh
export FLICKR_CONSUMER_KEY=your-consumer-key
export FLICKR_CONSUMER_SECRET=your-consumer-secret
./flickrimport -initOAuth
```
3. Follow the prompts to authorize the application in your browser
4. Your access token will be saved to `~/.flickr_oauth_token`
5. `export FLICKR_OAUTH_TOKEN=$(cat ~/.flickr_oauth_token)`

### Option 2: API Key (For public photosets only)

For reading public photosets, you can use just the API key:
```sh
export FLICKR_API_KEY=your-key-here
./flickrimport
```

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

**Download assets to local folder:**
```sh
# Using OAuth (recommended)
./flickrimport -downloadAssets -assetsSetID 72177720330584233

# Using API key (for public albums only)
./flickrimport -downloadAssets -assetsSetID 72177720330584233 -apikey YOUR_KEY
```

**Flags:**
- `-apikey`: Flickr API key (or use `FLICKR_API_KEY` env var) - legacy method
- `-consumerKey`: Flickr OAuth consumer key (or use `FLICKR_CONSUMER_KEY` env var)
- `-consumerSecret`: Flickr OAuth consumer secret (or use `FLICKR_CONSUMER_SECRET` env var)
- `-initOAuth`: Initialize OAuth flow to get access token (one-time setup)
- `-tokenFile`: Path to OAuth token file (default: `~/.flickr_oauth_token`)
- `-onlySet`: Limit run to a specific photoset ID
- `-downloadAssets`: Download original photos from specified album to `assets/` folder
- `-assetsSetID`: Photoset ID for assets download (default: 72177720330584233)
- `-timeout`: HTTP timeout (default 20s)
- `-slug`: Explicit slug for writing data (bypass discovery)
- `-set`: Explicit photoset id (bypass discovery)

## What it does
1. Scans `content/gallery/*.md` for `flickr_album: "ID"` lines
2. Calls `flickr.photosets.getPhotos` with rich `extras` to get metadata+remote URLs
3. Writes raw JSON response to `data/flickr/photosets/{slug}.json`
4. Fetches EXIF data for each photo to get camera, lens, and exposure info
5. Does NOT download images by default; templates reference remote staticflickr.com URLs.

## Assets Download Mode

When using `-downloadAssets`, the tool will:
1. Fetch all photos from the specified album
2. Download original resolution files using `url_o`
3. Extract original filenames from EXIF data
4. Save to `assets/bg/` if title is "background", otherwise `assets/gallery/`
5. Skip files that already exist locally

## Integration with Netlify
Add as a pre-build step in `netlify.toml`:
```toml
[build]
  command = "FLICKR_API_KEY=$FLICKR_API_KEY ./flickrimport && hugo --gc --minify"
  publish = "public"

[build.environment]
  FLICKR_API_KEY = "" # Set in Netlify UI
  # Or for OAuth:
  FLICKR_CONSUMER_KEY = ""
  FLICKR_CONSUMER_SECRET = ""
```
Set credentials as environment variables in Netlify UI.

## Flickr API Credentials Setup
Store your credentials in environment variables (not committed). For local dev, you can create a `.envrc` or export them:
```sh
export FLICKR_API_KEY=abcdef1234567890
export FLICKR_CONSUMER_KEY=your-consumer-key
export FLICKR_CONSUMER_SECRET=your-consumer-secret
```
