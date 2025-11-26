(function ($) {
	var $window = $(window),
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
		enter: function () {
			$navPanelToggle.removeClass('alt');
		},
		leave: function () {
			$navPanelToggle.addClass('alt');
		}
	});


	// showing and hiding one gallery on the main page

	// Select one of the hidden galleries on the front page to display
	// and load the images for it
	set_srcset = function () {
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
		if (postToReveal.length > 0) {
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
	var $photosetGrid = $('.photoset-grid');
	if ($galleryBackToggle.length > 0 && $photosetGrid.length > 0) {
		$main.unscrollex();

		// Change toggle styling once we've scrolled to the photo-grid.
		$photosetGrid.scrollex({
			mode: 'top',
			enter: function () {
				$galleryBackToggle.addClass('alt');
			},
			leave: function () {
				$galleryBackToggle.removeClass('alt');
			}
		});
	}

	// Keyboard navigation for photo galleries
	$(document).on('keydown', function (e) {
		// Left arrow key (37) - go to previous
		if (e.keyCode === 37) {
			var prevLink = $('a.previous[rel="prev"]');
			if (prevLink.length > 0) {
				window.location.href = prevLink.attr('href');
			}
		}
		// Right arrow key (39) - go to next
		else if (e.keyCode === 39) {
			var nextLink = $('a.next[rel="next"]');
			if (nextLink.length > 0) {
				window.location.href = nextLink.attr('href');
			}
		}
	});

	// Photo drawer scroll detection
	if ($('.photo-drawer').length > 0) {
		var scrollThreshold = 5; // Small threshold to avoid flickering at top
		var wheelTimeout;
		var isWheeling = false;

		// Function to update drawer toggle button state
		function updateDrawerToggle() {
			if (window.location.hash === '#details') {
				$('body').addClass('scrolled');
				$('.drawer-toggle.open').removeClass('open').addClass('close').attr('href', '#');
			} else {
				$('body').removeClass('scrolled');
				$('.drawer-toggle.close').removeClass('close').addClass('open').attr('href', '#details');
			}
		}

		function checkHashForDrawer() {
			updateDrawerToggle();
		}

		// Check on page load
		checkHashForDrawer();

		// Check when hash changes
		$(window).on('hashchange', checkHashForDrawer);

		// Handle wheel events for immediate responsiveness
		$window.on('wheel', function (e) {
			var deltaX = e.originalEvent.deltaX;
			var deltaY = e.originalEvent.deltaY;

			// Only trigger drawer if vertical scroll is dominant
			if (Math.abs(deltaY) > Math.abs(deltaX)) {
				isWheeling = true;

				// Clear any existing timeout
				clearTimeout(wheelTimeout);

				if (deltaY > 0) {
					// Scrolling down - open drawer
					$('body').addClass('scrolled');
					$('.drawer-toggle.open').removeClass('open').addClass('close').attr('href', '#');
					// Add hash to URL if not already there
					if (window.location.hash !== '#details') {
						history.replaceState(null, '', '#details');
					}
				} else if (deltaY < 0) {
					// Scrolling up - check if we should close
					var scrollPos = $window.scrollTop();
					if (scrollPos <= scrollThreshold) {
						$('body').removeClass('scrolled');
						$('.drawer-toggle.close').removeClass('close').addClass('open').attr('href', '#details');
						// Remove hash from URL
						if (window.location.hash === '#details') {
							history.replaceState(null, '', window.location.pathname);
						}
					}
				}					// Re-enable scroll event handling after wheeling stops
				wheelTimeout = setTimeout(function () {
					isWheeling = false;
				}, 150);
			}
		});

		// Handle drawer toggle button clicks
		$('.photo-drawer').on('click', '.drawer-toggle', function (e) {
			e.preventDefault();

			if ($(this).hasClass('open')) {
				// Opening the drawer
				$('body').addClass('scrolled');
				$(this).removeClass('open').addClass('close').attr('href', '#');
				// Add hash to URL
				history.replaceState(null, '', '#details');
			} else if ($(this).hasClass('close')) {
				// Closing the drawer
				$('body').removeClass('scrolled');
				$(this).removeClass('close').addClass('open').attr('href', '#details');
				// Remove hash from URL
				history.replaceState(null, '', window.location.pathname);
				// Scroll back to top
				$('html, body').animate({ scrollTop: 0 }, 300);
			}
		});
	}

	// Horizontal scroll/swipe navigation for photo galleries
	if ($('#photo-single').length > 0) {
		var horizontalScrollAccumulator = 0;
		var scrollThreshold = 50; // Amount of horizontal scroll needed to trigger navigation
		var scrollTimeout;
		var navigationEnabled = false; // Disabled on page load
		var loadCooldownPeriod = 600; // Milliseconds after page load before navigation is enabled

		// Enable navigation after a cooldown period on page load
		setTimeout(function () {
			navigationEnabled = true;
		}, loadCooldownPeriod);

		// Handle horizontal wheel events (trackpad horizontal scrolling)
		$('#photo-single').on('wheel', function (e) {
			// Don't process if navigation is not enabled yet (page just loaded)
			if (!navigationEnabled) {
				return;
			}

			var deltaX = e.originalEvent.deltaX;
			var deltaY = e.originalEvent.deltaY;

			// Only process if horizontal scroll is dominant
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				e.preventDefault(); // Prevent default horizontal scroll

				horizontalScrollAccumulator += deltaX;

				// Clear the timeout to reset accumulator
				clearTimeout(scrollTimeout);
				scrollTimeout = setTimeout(function () {
					horizontalScrollAccumulator = 0;
				}, 300);

				// Navigate when threshold is reached
				if (Math.abs(horizontalScrollAccumulator) >= scrollThreshold) {
					if (horizontalScrollAccumulator < 0) {
						// Scroll left - go to previous
						var prevLink = $('a.previous[rel="prev"]');
						if (prevLink.length > 0) {
							window.location.href = prevLink.attr('href');
						}
					} else {
						// Scroll right - go to next
						var nextLink = $('a.next[rel="next"]');
						if (nextLink.length > 0) {
							window.location.href = nextLink.attr('href');
						}
					}
					horizontalScrollAccumulator = 0;
				}
			}
		});

		// Touch swipe support for mobile
		var touchStartX = 0;
		var touchEndX = 0;
		var touchStartY = 0;
		var touchEndY = 0;
		var minSwipeDistance = 50;

		var photoSingle = document.getElementById('photo-single');

		photoSingle.addEventListener('touchstart', function (e) {
			touchStartX = e.changedTouches[0].screenX;
			touchStartY = e.changedTouches[0].screenY;
		}, false);

		photoSingle.addEventListener('touchend', function (e) {
			touchEndX = e.changedTouches[0].screenX;
			touchEndY = e.changedTouches[0].screenY;
			handleSwipe();
		}, false);

		function handleSwipe() {
			var swipeDistanceX = touchEndX - touchStartX;
			var swipeDistanceY = touchEndY - touchStartY;

			// Only register as horizontal swipe if horizontal movement is greater than vertical
			if (Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
				if (Math.abs(swipeDistanceX) > minSwipeDistance) {
					if (swipeDistanceX > 0) {
						// Swipe right - go to previous
						var prevLink = $('a.previous[rel="prev"]');
						if (prevLink.length > 0) {
							window.location.href = prevLink.attr('href');
						}
					} else {
						// Swipe left - go to next
						var nextLink = $('a.next[rel="next"]');
						if (nextLink.length > 0) {
							window.location.href = nextLink.attr('href');
						}
					}
				}
			}
		}
	}

	// Various changes that must run after the document is ready
	$(document).ready(function () {
		// show one post to start
		showOneFeaturedPost();
	});

	// Prefetch images using Fetch API
	// necesary because Safari doesn't support <link rel="prefetch">
	(function () {
		// Check if fetch is supported
		if (!window.fetch) return;

		// Use requestIdleCallback if available, otherwise setTimeout
		var scheduleWork = window.requestIdleCallback || function (cb) {
			setTimeout(cb, 200);
		};

		scheduleWork(function () {
			var prefetchData = document.getElementById('prefetch-data');
			if (!prefetchData) return;

			// Find all link tags inside the prefetch-data div
			var prefetchLinks = prefetchData.querySelectorAll('link');
			if (prefetchLinks.length === 0) return;

			prefetchLinks.forEach(function (link) {
				var url = link.getAttribute('href');
				if (!url) return;

				fetch(url, {
					method: 'GET',
					cache: 'force-cache',
					priority: 'low',

				}).catch(function () {
					// Silently ignore prefetch errors
				});
			});
		});
	})();

	$('.grid').infiniteScroll({
		// options
		path: '.next',
		append: '.grid-item',
		history: false,
		hideNav: '.pagination',
	});
})(jQuery);