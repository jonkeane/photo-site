# photo-site
A site for displaying photos

[![Netlify Status](https://api.netlify.com/api/v1/badges/0e4d43d8-6f63-49b4-b1b6-dbe795e53fda/deploy-status)](https://app.netlify.com/sites/xenodochial-curie-fec15a/deploys)

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

## Flickr API
In order to use the flickr API to get image details, one must set the `params.nanog.flickr_api` with a valid flickr API key one can also set `HUGOxPARAMSxNANOGxflickr_apikey` (for e.g. netlify's deploy)