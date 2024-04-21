import params from "@params";

var gallery = jQuery("#nanogallery2");
var flickrAlbum = gallery.attr("flickrAlbum");
var tagBlockList = gallery.attr("tagBlockList");

gallery.nanogallery2({
	"viewerToolbar":   {
			"standard":   "label, copyURL, infoButton",
			"minimized":  "label, copyURL, infoButton, cart" },
	"viewerTools":    {
			"topLeft":   "fullscreenButton, zoomButton",
			"topRight":  "info, copyURL, playPauseButton, closeButton" },
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

		function removeSubstringsFromString(string, substringsToRemove) {
			let removedSubstring = '';
			let modifiedString = string;

			for (let i = 0; i < substringsToRemove.length; i++) {
				const substring = substringsToRemove[i];
				if (modifiedString.includes(substring)) {
					modifiedString = modifiedString.replace(substring, '').trim();
					removedSubstring = substring;
					break; // Stop loop after first substring removal
				}
			}

			return [ removedSubstring, modifiedString ];
		}

		var content = '<div class="nGY2PopupOneItemText">' + unescape(item.description);
		if( item.author != '' ) {
			content += '<br/>' + 'by ' + item.author;
		};
		content += '</div>';
		var sexif = '';
		if( item.exif.model != '' || item.exif.lens != '' ) {
			// Extract film emulsion form the model name (a convention from filmshots, carried through lightroom)
			const emulsions = [
				'Cat Labs',
				'Fuji Pro 400H',
				'Fuji Provia',
				'Fuji Velvia',
				'Kodak E100',
				'Kodak Ektar',
				'Kodak Gold',
				'Kodak Portra',
				'Kodak T-Max'
			];
			const [ emulsion, model ] = removeSubstringsFromString(item.exif.model, emulsions);

			if (emulsion != '') {
				sexif  += '🎞';
				sexif += '&nbsp;' + emulsion;
				sexif += '<br/>';
			};

			// Add model + lens
			sexif  += '📷';
			sexif += model  == '' ? '' : '&nbsp;' + model;
			if( model != '' && item.exif.lens != '' ) {
				sexif += '&nbsp;·';
			};
			sexif += item.exif.lens  == '' ? '' : '&nbsp;' + item.exif.lens;
		};
		if( item.exif.focallength != '' || item.exif.fstop != '' || item.exif.exposure != '' || item.exif.iso != '' || item.exif.time != '' ) {
			sexif += '<br/>';
			sexif += '📸';
			var sexif_items = [];
			sexif_items.push(item.exif.focallength == '' ? '' : '&nbsp; ' + item.exif.focallength);
			sexif_items.push(item.exif.exposure == '' ? '' : '&nbsp; ' + item.exif.exposure+'s');
			sexif_items.push(item.exif.fstop == '' ? '' : '&nbsp; f/' + item.exif.fstop);
			sexif_items.push(item.exif.iso == '' ? '' : '&nbsp; ' + item.exif.iso+'iso');
			sexif_items = sexif_items.filter((word) => word != '');

			sexif += sexif_items.join('&nbsp;·');
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
			tags = '';
			for(var i = 0; i < item.tags.length; i++) {
				tags += '#' + item.tags[i] + '&emsp;&emsp;';
			}
			content += '<div class="nGY2PopupOneItemText">' + tags + '</div>';
		}

		return {content: content, title: title};
	},
	"thumbnailHeight":  300,
	"thumbnailWidth":   "auto",
	"album": flickrAlbum,
	"tagBlockList": tagBlockList,
	"thumbnailBorderVertical": 0,
	"thumbnailBorderHorizontal": 0,
	"thumbnailHoverEffect2": "imageScale105",
	"thumbnailAlignment": "center",
	"thumbnailGutterWidth": 2,
	"thumbnailGutterHeight": 2
});