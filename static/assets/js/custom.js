// Photo navigation helpers
// These functions handle navigation between photos while properly managing browser history
var photoNav = {
	// Key used to track if user navigated from within the site
	storageKey: 'photoSiteNav',
	// Key to store the gallery URLs for this session
	galleryKey: 'photoSiteGallery',
	// Key to track if we injected history (need popstate handling)
	injectedKey: 'photoSiteInjected',

	// Mark that we're navigating within the site and go to the URL without adding to history
	goToPhoto: function (url) {
		sessionStorage.setItem(this.storageKey, 'true');
		location.replace(url);
	},

	// Go back - uses history.back() if user navigated here from site, otherwise goes to gallery URL
	goBack: function (galleryUrl) {
		if (sessionStorage.getItem(this.storageKey)) {
			history.back();
		} else {
			location.href = galleryUrl;
		}
	},

	// Mark that we're entering a photo from a gallery (for normal link clicks)
	markNavigation: function () {
		sessionStorage.setItem(this.storageKey, 'true');
	},

	// Initialize history on a photo page
	// This ensures gallery URLs are in history so back button works correctly
	// parentUrls should be ordered from root to immediate parent, e.g., ['/gallery/', '/gallery/iceland-2022/']
	initPhotoPage: function (parentUrls) {
	// Only inject if user landed directly on this page (not from within the site)
		if (!sessionStorage.getItem(this.storageKey)) {
			var currentUrl = window.location.href;

			// Normalize to array
			if (!Array.isArray(parentUrls)) {
				parentUrls = [parentUrls];
			}

			// Convert to full URLs
			var fullUrls = parentUrls.map(function (url) {
				return new URL(url, window.location.origin).href;
			});

			// Store the gallery URLs for later use
			sessionStorage.setItem(this.galleryKey, JSON.stringify(fullUrls));

			// Replace current entry with the root parent
			history.replaceState({ photoNav: 'gallery', url: fullUrls[0] }, '', fullUrls[0]);

			// Push each subsequent parent
			for (var i = 1; i < fullUrls.length; i++) {
				history.pushState({ photoNav: 'gallery', url: fullUrls[i] }, '', fullUrls[i]);
			}

			// Push current page as final entry
			history.pushState({ photoNav: 'photo', url: currentUrl }, '', currentUrl);

			// Mark that we injected history (popstate handler needed)
			sessionStorage.setItem(this.injectedKey, 'true');

			// Mark that navigation is set up
			sessionStorage.setItem(this.storageKey, 'true');
		}
	}
};

// Handle browser back/forward navigation - only for injected history entries
window.addEventListener('popstate', function (event) {
	// Only handle if we injected history AND hit one of our gallery entries
	if (sessionStorage.getItem(photoNav.injectedKey) && event.state && event.state.photoNav === 'gallery') {
		// User pressed back and hit our injected gallery entry - navigate to it
		var url = event.state.url;
		if (!url) {
			// Fallback to stored gallery URLs
			try {
				var galleries = JSON.parse(sessionStorage.getItem(photoNav.galleryKey));
				url = galleries[galleries.length - 1];
			} catch (e) {
				// If all else fails, go to /gallery/
				url = '/gallery/';
			}
		}
		window.location.href = url;
	}
});

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
				photoNav.goToPhoto(prevLink.attr('url'));
			}
		}
		// Right arrow key (39) - go to next
		else if (e.keyCode === 39) {
			var nextLink = $('a.next[rel="next"]');
			if (nextLink.length > 0) {
				photoNav.goToPhoto(nextLink.attr('url'));
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

		// Touch swipe support for opening/closing drawer on mobile
		var drawerTouchStartY = 0;
		var drawerTouchEndY = 0;
		var drawerMinSwipeDistance = 50;

		var main = document.querySelector('#main');
		main.addEventListener('touchmove', function (event) {
			event.stopPropagation();
		});
		main.addEventListener('touchstart', function (e) {
			drawerTouchStartY = e.changedTouches[0].screenY;
		}, false);

		main.addEventListener('touchend', function (e) {
			drawerTouchEndY = e.changedTouches[0].screenY;
			handleDrawerSwipe();
		}, false);

		function handleDrawerSwipe() {
			var swipeDistanceY = drawerTouchStartY - drawerTouchEndY;

			if (Math.abs(swipeDistanceY) > drawerMinSwipeDistance) {
				if (swipeDistanceY > 0) {
					// Swipe up - open drawer
					$('body').addClass('scrolled');
					$('.drawer-toggle.open').removeClass('open').addClass('close').attr('href', '#');
					// Add hash to URL
					if (window.location.hash !== '#details') {
						history.replaceState(null, '', '#details');
					}
				} else {
					// Swipe down - close drawer (only if at top)
					var scrollPos = $window.scrollTop();
					if (scrollPos <= scrollThreshold) {
						$('body').removeClass('scrolled');
						$('.drawer-toggle.close').removeClass('close').addClass('open').attr('href', '#details');
						// Remove hash from URL
						if (window.location.hash === '#details') {
							history.replaceState(null, '', window.location.pathname);
						}
						// Scroll back to top
						$('html, body').animate({ scrollTop: 0 }, 300);
					}
				}
			}
		}
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
							window.location.replace(prevLink.attr('url'));
						}
					} else {
						// Scroll right - go to next
						var nextLink = $('a.next[rel="next"]');
						if (nextLink.length > 0) {
							window.location.replace(nextLink.attr('url'));
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
							window.location.replace(prevLink.attr('url'));
						}
					} else {
						// Swipe left - go to next
						var nextLink = $('a.next[rel="next"]');
						if (nextLink.length > 0) {
							window.location.replace(nextLink.attr('url'));
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
			// Find all prefetch link tags in the head
			var prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
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
})(jQuery);