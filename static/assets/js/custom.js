(function($) {
	var	$window = $(window),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$main = $('#main'),
		$nanogallery = $('#nanogallery2'),
		$navPanelToggle = $('#navPanelToggle');

		$.fn._parallax = null;

		// append a menu always
		$navPanelToggle = $(
			'<a href="#navPanel" id="navPanelToggle">Menu</a>'
		)
			.appendTo($wrapper);

		// Change toggle styling once we've scrolled past the header.
		$header.unscrollex();
		$header.scrollex({
			bottom: '5vh',
			enter: function() {
				$navPanelToggle.removeClass('alt');
			},
			leave: function() {
				$navPanelToggle.addClass('alt');
			}
		});

		// Gallery back button
		var $galleryBackToggle = $('#galleryBackBtn');
		if ($galleryBackToggle.length > 0) {
			$main.unscrollex();

			// Change toggle styling once we've scrolled past the header.
			$nanogallery.scrollex({
				mode: 'top',
				enter: function() {
					$galleryBackToggle.addClass('alt');
				},
				leave: function() {
					$galleryBackToggle.removeClass('alt');
				}
			});
		}
})(jQuery);