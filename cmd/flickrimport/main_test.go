package main

import (
	"bytes"
	"encoding/json"
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
