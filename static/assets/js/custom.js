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
	navigating: false,
	goToPhoto: function (url) {
		if (this.navigating) return;
		this.navigating = true;
		sessionStorage.setItem(this.storageKey, 'true');
		// Carry the image-only view through photo navigation, including arrow keys.
		if (window.location.hash === '#photo-only') {
			var destination = new URL(url, window.location.href);
			destination.hash = 'photo-only';
			url = destination.href;
		}
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

window.addEventListener('pageshow', function () {
	photoNav.navigating = false;
});

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

	// Details are opened explicitly so image gestures only affect the photo.
	if ($('.photo-drawer').length > 0) {
		function updateDrawerToggle() {
			var open = window.location.hash === '#details';
			$('body').toggleClass('scrolled', open);
			$('.drawer-toggle').toggleClass('close', open).toggleClass('open', !open)
				.attr('href', open ? '#' : '#details').attr('aria-expanded', String(open));
		}

		updateDrawerToggle();
		$(window).on('hashchange pageshow', updateDrawerToggle);
		$('.photo-drawer').on('click', '.drawer-toggle', function (e) {
			e.preventDefault();
			var url = new URL(window.location.href);
			url.hash = $(this).hasClass('open') ? 'details' : '';
			history.replaceState(history.state, '', url);
			updateDrawerToggle();
		});
	}

	// Various changes that must run after the document is ready
	$(document).ready(function () {
		// show one post to start
		showOneFeaturedPost();
	});

	// // Prefetch images using Fetch API
	// // necesary because Safari doesn't support <link rel="prefetch">
	// (function () {
	// 	// Check if fetch is supported
	// 	if (!window.fetch) return;

	// 	// Use requestIdleCallback if available, otherwise setTimeout
	// 	var scheduleWork = window.requestIdleCallback || function (cb) {
	// 		setTimeout(cb, 200);
	// 	};

	// 	scheduleWork(function () {
	// 		// Find all prefetch link tags in the head
	// 		var prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
	// 		if (prefetchLinks.length === 0) return;

	// 		prefetchLinks.forEach(function (link) {
	// 			var url = link.getAttribute('href');
	// 			if (!url) return;

	// 			fetch(url, {
	// 				method: 'GET',
	// 				cache: 'force-cache',
	// 				priority: 'low',

	// 			}).catch(function () {
	// 				// Silently ignore prefetch errors
	// 			});
	// 		});
	// 	});
	// })();

	// InfiniteScroll requires a next link during initialization. Single-page
	// listings still render the pagination container, but without that link.
	function initInfiniteScroll(selector, options) {
		if ($('.pagination a.next[href]').length === 0) return;
		$(selector).infiniteScroll(options);
	}

	initInfiniteScroll('.grid', {
		// options
		path: '.next',
		append: '.grid-item',
		history: false,
		hideNav: '.pagination',
	});

	initInfiniteScroll('.posts', {
		// options
		path: '.next',
		append: 'article',
		history: false,
		hideNav: '.pagination',
	});
})(jQuery);
