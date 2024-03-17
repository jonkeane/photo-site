/*
	Massively by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body'),
		$wrapper = $('#wrapper'),
		$header = $('#header'),
		$nav = $('#nav'),
		$main = $('#main'),
		$nanogallery = $('#nanogallery2'),
		$navPanelToggle, $navPanel, $navPanelInner;

	// Breakpoints.
		breakpoints({
			default:   ['1681px',   null       ],
			xlarge:    ['1281px',   '1680px'   ],
			large:     ['981px',    '1280px'   ],
			medium:    ['737px',    '980px'    ],
			small:     ['481px',    '736px'    ],
			xsmall:    ['361px',    '480px'    ],
			xxsmall:   [null,       '360px'    ]
		});


	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
				// start loading the second image in the slider
                pic_children = $("#theCarousel-image-1").children();
                pic_children.each(set_srcset);
			}, 100);
		});

	// Scrolly.
		$('.scrolly').scrolly();

	// Nav Panel.

		// Toggle.
			$navPanelToggle = $(
				'<a href="#navPanel" id="navPanelToggle">Menu</a>'
			)
				.appendTo($wrapper);

			// Change toggle styling once we've scrolled past the header.
				$header.scrollex({
					bottom: '500px',
					enter: function() {
						$navPanelToggle.removeClass('alt');
					},
					leave: function() {
						$navPanelToggle.addClass('alt');
					}
				});

		// Panel.
			$navPanel = $(
				'<div id="navPanel">' +
					'<nav>' +
					'</nav>' +
					'<a href="#navPanel" class="close"></a>' +
				'</div>'
			)
				.appendTo($body)
				.panel({
					delay: 500,
					hideOnClick: true,
					hideOnSwipe: true,
					resetScroll: true,
					resetForms: true,
					side: 'right',
					target: $body,
					visibleClass: 'is-navPanel-visible'
				});

			// Get inner.
				$navPanelInner = $navPanel.children('nav');

			// Move nav content on breakpoint change.
				var $navContent = $nav.children();

				breakpoints.on('>medium', function() {

					// NavPanel -> Nav.
						$navContent.appendTo($nav);

					// Flip icon classes.
						$nav.find('.icons, .icon')
							.removeClass('alt');

				});

				breakpoints.on('<=medium', function() {

					// Nav -> NavPanel.
						$navContent.appendTo($navPanelInner);

					// Flip icon classes.
						$navPanelInner.find('.icons, .icon')
							.addClass('alt');

				});

			// Hack: Disable transitions on WP.
				if (browser.os == 'wp'
				&&	browser.osVersion < 10)
					$navPanel
						.css('transition', 'none');

	// Intro.
		var $intro = $('#intro');

		if ($intro.length > 0) {

			// Hack: Fix flex min-height on IE.
				if (browser.name == 'ie') {
					$window.on('resize.ie-intro-fix', function() {

						var h = $intro.height();

						if (h > $window.height())
							$intro.css('height', 'auto');
						else
							$intro.css('height', h);

					}).trigger('resize.ie-intro-fix');
				}

			// Hide intro on scroll (> small).
				breakpoints.on('>small', function() {

					$main.unscrollex();

					$main.scrollex({
						mode: 'bottom',
						top: '25vh',
						bottom: '-50vh',
						enter: function() {
							$intro.addClass('hidden');
						},
						leave: function() {
							$intro.removeClass('hidden');
						}
					});

				});

			// Hide intro on scroll (<= small).
				breakpoints.on('<=small', function() {

					$main.unscrollex();

					$main.scrollex({
						mode: 'middle',
						top: '15vh',
						bottom: '-15vh',
						enter: function() {
							$intro.addClass('hidden');
						},
						leave: function() {
							$intro.removeClass('hidden');
						}
					});

			});

		}
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


// Bootsrape carousel/slider functions
// function to set the src and srcset
set_srcset = function() {
    child = $(this);
    child.attr("srcset", child.data('srcset'));
    child.removeAttr("data-srcset");

    child.attr("src", child.data('src'));
    child.removeAttr("data-src");
}

// from https://coderwall.com/p/6qaeya/lazy-carousel-in-bootstrap
// load the next image when the carousel is sliding
$(function() {
  return $(".carousel.lazy").on("slid.bs.carousel", function(ev) {
    // this should already be done, but just in case!
    var pic_node;
    pic_node = $(ev.relatedTarget).find("picture");
    pic_children = pic_node.children();
    pic_children.each(set_srcset);

    // the next image too
    var next_pic_node;
    next_pic_node = $(ev.relatedTarget).next().find("picture");
    next_pic_children = next_pic_node.children();
    next_pic_children.each(set_srcset);
  });
});


// swipe for carousel
// TODO: prevent vertical swiping?
$(document).ready(function() {
    $('.carousel').bcSwipe({ threshold: 50 });
});

// TODO: https://coderwall.com/p/uf2pka/normalize-twitter-bootstrap-carousel-slide-heights normalize at least what has been seen so far.