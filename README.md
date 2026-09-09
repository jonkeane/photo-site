# photo-site
A Hugo static site for displaying photography portfolios with Flickr integration.

[![Netlify Status](https://api.netlify.com/api/v1/badges/0e4d43d8-6f63-49b4-b1b6-dbe795e53fda/deploy-status)](https://app.netlify.com/sites/xenodochial-curie-fec15a/deploys)

## Architecture

This site uses **build-time static generation** rather than runtime JavaScript galleries:
- Go CLI tool fetches Flickr photoset metadata via REST API
- Raw JSON responses stored in `data/flickr/photosets/`
- Hugo generates one HTML page per photo 
- Images served directly from Flickr CDN 

## Development

Install netlify-cli with `brew install netlify-cli` and then:

```
netlify dev
```

Which will also simulate edge functions, etc.

Alternatively, hugo directly:

```
hugo serve
```

Install JavaScript dependencies with `npm ci` before building. Photo pages use
Swiper's Zoom module inside the existing image area. Each page includes its
previous/current/next images; completing a swipe loads the adjacent photo's page.
Pinch zoom and panning stay within the image, and details open with the button.

When changing the viewer, check on a touch device: swipe once in each direction,
pan a zoomed image against both edges, lift one finger during a pinch, pinch back
to fit and keep dragging, then start a fresh swipe. Also check the first/last
photo, browser back/forward, and portrait/landscape orientation.

## Flickr API Integration

To fetch photoset metadata, you need a Flickr API key:
1. Get key at https://www.flickr.com/services/apps/create/
2. Export as environment variable: `export FLICKR_API_KEY=your-key-here`
3. Run importer: `flickrimport` (or `go run ./cmd/flickrimport`)
4. For private photos, you'll need to setup OAuth `export FLICKR_CONSUMER_KEY=your-key-here`, `export FLICKR_CONSUMER_SECRET=your-secret-here` and then `flickrimport -initOAuth`
 
Run `go test ./...` to check dimension round-tripping and gallery rendering
fixtures (the rendering checks require `hugo` on your PATH).
