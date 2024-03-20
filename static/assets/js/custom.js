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
			bottom: '500px',
			enter: function() {
				$navPanelToggle.removeClass('alt');
			},
			leave: function() {
				$navPanelToggle.addClass('alt');
			}
		});


		// showing and hiding one gallery on the main page

		// Select one of the hidden galleries on the front page to display
		// and load the images for it
		set_srcset = function() {
			child = $(this);
			child.attr("srcset", child.data('srcset'));
			child.removeAttr("data-srcset");

			child.attr("src", child.data('src'));
			child.removeAttr("data-src");
		}

		// inclusive of min and max
		function randomInt(min, max) {
			const minCeiled = Math.ceil(min);
			const maxFloored = Math.floor(max);
			return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
		};

		function showOneFeaturedPost() {
			var random = randomInt(0, $(".post.featured.hidden").length);

			var post_to_reveal = $(".post.featured.hidden").eq(random)
			post_to_reveal.find("picture").children().each(set_srcset);
			post_to_reveal.removeClass('hidden');
		}

		function hideAllFeaturedPost() {
			var post_to_reveal = $(".post.featured")
			post_to_reveal.addClass('hidden');
		}

		// append a menu always
		$shuffleButton = $(
			'<a class="button big right">shuffle</a>'
		)
			.appendTo($("#introTop"))
			.click(function () {
				hideAllFeaturedPost()
				showOneFeaturedPost()
			});

		// show one post to start
		$(document).ready(function() {
			showOneFeaturedPost();
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