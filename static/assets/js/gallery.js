import params from "@params";

jQuery("#nanogallery2").nanogallery2({
	"viewerToolbar":   {
			"standard":   "label, linkOriginalButton, infoButton",
			"minimized":  "label, linkOriginalButton, infoButton, cart" },
	"viewerTools":    {
			"topLeft":   "fullscreenButton, zoomButton",
			"topRight":  "info, linkOriginalButton, playPauseButton, closeButton" },
	"kind":             "flickr",
	"thumbnailLabel": {displayDescription: false, display: false},
	"userID":           params.flickr_userid,
	"flickrAPIKey":     params.flickr_apikey,
	"flickrExif":       true,
	"minimalSlug":       true,
	"fnPopupMediaInfo": function (item, title, content) {
		var title = item.title;
				function unescape(str){
					return str.replace(/&lt;/g, "<")
								.replace(/&gt;/g, ">")
								.replace(/&quot;/g, '"')
								.replace(/&amp;/g, "&");
				}

			content = '<div class="nGY2PopupOneItemText">' + unescape(item.description);
			if( item.author != '' ) {
			content += '<br/>' + 'by ' + item.author;
			}
				content += '</div>'
				var sexif = '';
			if( item.exif.model != '' || item.exif.lens != '' ) {
			sexif  += '📷'
					sexif += item.exif.model  == '' ? '' : '&nbsp;' + item.exif.model
					if( item.exif.model != '' && item.exif.lens != '' ) {
						sexif += '&nbsp;·'
					}
					sexif += item.exif.lens  == '' ? '' : '&nbsp;' + item.exif.lens;
			}
			if( item.exif.focallength != '' || item.exif.fstop != '' || item.exif.exposure != '' || item.exif.iso != '' || item.exif.time != '' ) {
				sexif += '<br/>';
				sexif += '📸';
				var sexif_items = [];
			sexif_items.push(item.exif.focallength == '' ? '' : '&nbsp; ' + item.exif.focallength);
				sexif_items.push(item.exif.exposure == '' ? '' : '&nbsp; ' + item.exif.exposure+'s');
			sexif_items.push(item.exif.fstop == '' ? '' : '&nbsp; f/' + item.exif.fstop);
			sexif_items.push(item.exif.iso == '' ? '' : '&nbsp; ' + item.exif.iso+'iso');
				sexif += sexif_items.join('&nbsp;·')
				if( item.exif.flash != '' ) {
					sexif += '<br>';
					sexif += item.exif.flash == '' ? '' : 'flash: ' + item.exif.flash;
				}
			if( item.exif.time != '' ) {
					sexif += '<br/>';
			// var date = new Date(parseInt(item.exif.time));
			// sexif += ' &nbsp; '+date.toLocaleDateString();
			sexif += 'Captured at&nbsp; ' + item.exif.time;
			}
			}
				content += '<div class="nGY2PopupOneItemText">' + sexif + '</div>';

				if( item.tags.length > 0 ) {
					tags = ''
					for(var i = 0; i < item.tags.length; i++) {
						tags += '#' + item.tags[i] + '&emsp;&emsp;';
					}
					content += '<div class="nGY2PopupOneItemText">' + tags + '</div>';
				}

		return {content: content, title: title}; },
	"thumbnailHeight":  300,
	"thumbnailWidth":   "auto",
	"album": params.flickr_album,
	"tagBlockList": params.tagBlockList,
	"thumbnailBorderVertical": 0,
	"thumbnailBorderHorizontal": 0,
	"thumbnailHoverEffect2": "imageScale105",
	"thumbnailAlignment": "center",
	"thumbnailGutterWidth": 2,
	"thumbnailGutterHeight": 2
});