(function($) {
	var	$window = $(window),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$main = $('#main'),
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
			var hiddenPosts = $(".post.featured.hidden");

			var postToReveal = $(".post.featured.hidden.nextup");
			if(postToReveal.length > 0) {
				// already have a next up, so need to randomly select a next up
				var hiddenPostsUp = hiddenPosts.not('.nextup');
				var random = randomInt(0, hiddenPostsUp.length - 1);
				var nextUp = hiddenPostsUp.eq(random);
			} else {
				// don't have one, so select a random one
				var random = randomInt(0, hiddenPosts.length - 1);
				var postToReveal = hiddenPosts.eq(random);

				// but then also select a random one of the rest for next up
				var notNextUp = hiddenPosts.not(postToReveal);
				var random = randomInt(0, notNextUp.length - 1);
				var nextUp = notNextUp.eq(random);
			}

			postToReveal.find("picture").children().each(set_srcset);
			postToReveal.removeClass('hidden');
			postToReveal.removeClass('nextup');

			// Set the next one up, but don't reveal it yet.
			nextUp.find("picture").children().each(set_srcset);
			nextUp.addClass('nextup');
		}

		function hideAllFeaturedPost() {
			var featuredPosts = $(".post.featured")
	
			featuredPosts.addClass('hidden');
		}

		// append a menu always
		$shuffleButton = $(
			'<a class="button big right">shuffle</a>'
		)
			.appendTo($("#introTop"))
			.click(function () {
				hideAllFeaturedPost();
				showOneFeaturedPost();
			});

		// Gallery back button
		var $galleryBackToggle = $('#galleryBackBtn');
		if($galleryBackToggle.length > 0) {
			$main.unscrollex();
		}

		// Various changes that must run after the document is ready
		$(document).ready(function() {
			// show one post to start
			showOneFeaturedPost();
		});
})(jQuery);