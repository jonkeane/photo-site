# photo-site
A Hugo static site for displaying photography portfolios backed by Cloudflare R2.

[![Netlify Status](https://api.netlify.com/api/v1/badges/0e4d43d8-6f63-49b4-b1b6-dbe795e53fda/deploy-status)](https://app.netlify.com/sites/xenodochial-curie-fec15a/deploys)

## Architecture

This site uses **build-time static generation** rather than runtime JavaScript galleries:
- The R2 importer writes gallery manifests to `data/r2/galleries/`
- Hugo generates one HTML page per photo 
- Images are served from the R2 public domain

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
Double-tap the photo (or focus the viewer and press Enter) to fit the whole image
to the viewport on a black background with the page controls hidden. Swiping or
using the arrow keys keeps this view on adjacent photos. Double-tap again or press
Escape to restore the controls. Pinch zoom remains available in either view.

When changing the viewer, check on a touch device: swipe once in each direction,
pan a zoomed image against both edges, lift one finger during a pinch, pinch back
to fit and keep dragging, then start a fresh swipe. Also check the first/last
photo, browser back/forward, and portrait/landscape orientation.

## R2 gallery manifests

The deployment workflow refreshes the R2 manifests before each Hugo build. To
refresh them locally, provide the public image base URL and run the importer:

```
R2_PUBLIC_BASE_URL=... \
  go run github.com/jonkeane/publish-to-r2/uploader/cmd/r2import@latest
```
 
Run `hugo --minify` to verify the site build (with `hugo` on your PATH).
