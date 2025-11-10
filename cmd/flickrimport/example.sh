# Example: minimal test run showing the flickrimport tool
# This script is for documentation/testing only; requires a valid FLICKR_API_KEY.

# Build the tool
go build ./cmd/flickrimport

# Run on a single photoset (replace with a real API key and photoset ID from your hugo config)
# FLICKR_API_KEY=your-key-here ./flickrimport -onlySet 72177720327085511

# Output:
# - data/flickr/photosets/iceland-2022.json (raw Flickr API response)
# - content/gallery/iceland-2022/*.md (stub pages per photo)
