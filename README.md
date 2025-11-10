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

## Flickr API Integration

To fetch photoset metadata, you need a Flickr API key:
1. Get key at https://www.flickr.com/services/apps/create/
2. Export as environment variable: `export FLICKR_API_KEY=your-key-here`
3. Run importer: `./bin/flickrimport` (or `go run ./cmd/flickrimport`)

For Netlify deployments, add `FLICKR_API_KEY` in site settings → Environment variables.
