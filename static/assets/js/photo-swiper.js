import Swiper from 'swiper';
import { Zoom } from 'swiper/modules';

const viewer = document.querySelector('.photo-swiper');

if (viewer) {
	const slides = Array.from(viewer.querySelectorAll('.swiper-slide'));
	const initialIndex = slides.findIndex(slide => slide.dataset.current === 'true');
	const pointers = new Set();
	let gestureBlocked = false;
	let zoomScale = 1;
	let destination = null;
	let resetting = false;
	let navigationTimeout = null;
	let desktopGestureScale = null;
	const swiper = new Swiper(viewer, {
		init: false,
		modules: [Zoom],
		initialSlide: initialIndex,
		slidesPerView: 1,
		slidesPerGroup: 1,
		loop: false,
		threshold: 10,
		speed: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
		preventInteractionOnTransition: true,
		edgeSwipeDetection: true,
		zoom: { maxRatio: 5, toggle: false },
	});

	function updatePhotoOnly() {
		const enabled = window.location.hash === '#photo-only';
		document.documentElement.classList.toggle('photo-only', enabled);
		viewer.setAttribute('aria-label', enabled
			? 'Photo viewer. Pinch to zoom, or press Escape or Close to reset zoom and restore controls.'
			: 'Photo viewer. Double tap or press Enter for image-only view. Pinch to zoom; Escape resets zoom.');
		if (swiper.initialized) {
			resetZoom();
			swiper.update();
			updateNavigation();
		}
	}

	function setPhotoOnly(enabled, focusViewer = enabled) {
		// Exiting must work even while a slide is transitioning.
		if (enabled && (destination || swiper.animating)) return;
		const url = new URL(window.location.href);
		url.hash = enabled ? 'photo-only' : '';
		history.replaceState(history.state, '', url);
		// replaceState does not fire hashchange; also refresh the details drawer.
		window.dispatchEvent(new Event('hashchange'));
		if (enabled && focusViewer) viewer.focus({ preventScroll: true });
		else {
			document.activeElement?.blur?.();
			viewer.blur();
		}
	}

	function resetZoom() {
		desktopGestureScale = null;
		swiper.zoom.out();
		gestureBlocked = pointers.size > 1;
		updateNavigation();
	}

	document.querySelector('.photo-close')?.addEventListener('click', () => setPhotoOnly(false));

	function zoomElements() {
		const slide = slides[swiper.activeIndex];
		const container = slide?.querySelector('.swiper-zoom-container');
		const image = container?.querySelector('picture, img, svg, canvas, .swiper-zoom-target');
		return slide && container && image ? { slide, container, image } : null;
	}

	function currentPan(container) {
		const transform = window.getComputedStyle(container).transform;
		if (!transform || transform === 'none') return { x: 0, y: 0 };
		const matrix = new window.DOMMatrix(transform);
		return { x: matrix.e, y: matrix.f };
	}

	function setPan(x, y, scale = zoomScale) {
		const elements = zoomElements();
		if (!elements) return;
		const imageWidth = elements.image.offsetWidth || elements.image.clientWidth;
		const imageHeight = elements.image.offsetHeight || elements.image.clientHeight;
		const minX = Math.min(elements.slide.offsetWidth / 2 - imageWidth * scale / 2, 0);
		const minY = Math.min(elements.slide.offsetHeight / 2 - imageHeight * scale / 2, 0);
		const nextX = Math.max(minX, Math.min(-minX, x));
		const nextY = Math.max(minY, Math.min(-minY, y));
		elements.container.style.transitionDuration = '0ms';
		elements.container.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
	}

	function panBy(deltaX, deltaY) {
		const elements = zoomElements();
		if (!elements) return;
		const pan = currentPan(elements.container);
		setPan(pan.x - deltaX, pan.y - deltaY);
	}

	swiper.on('doubleTap', () => {
		// A pointer gesture should not add a keyboard focus outline to the image.
		setPhotoOnly(window.location.hash !== '#photo-only', false);
	});
	viewer.addEventListener('keydown', event => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			setPhotoOnly(window.location.hash !== '#photo-only');
		}
	});
	document.addEventListener('keydown', event => {
		if (event.key !== 'Escape') return;
		if (window.location.hash === '#photo-only') {
			event.preventDefault();
			setPhotoOnly(false);
		} else if (zoomScale > 1) {
			event.preventDefault();
			resetZoom();
		}
	});
	window.addEventListener('hashchange', updatePhotoOnly);
	window.addEventListener('pageshow', updatePhotoOnly);

	function zoomTo(scale) {
		if (destination || swiper.animating) return;
		const next = Math.max(1, Math.min(5, scale));
		if (next === 1) {
			swiper.zoom.out();
		} else {
			const elements = zoomElements();
			const pan = elements ? currentPan(elements.container) : { x: 0, y: 0 };
			const previousScale = zoomScale;
			// Seed the centered pan position: Swiper otherwise treats the first
			// numeric zoom as if a pointer were at the top-left of the page.
			if (zoomScale === 1) swiper.zoom.in(1);
			swiper.zoom.in(next);
			// Swiper has no wheel-pan API. Preserve the current trackpad pan when
			// changing scale and keep it within the newly scaled image bounds.
			if (previousScale > 1) {
				setPan(pan.x * next / previousScale, pan.y * next / previousScale, next);
			}
		}
	}

	// Desktop trackpad pinches arrive as Ctrl-wheel in Chromium and Firefox;
	// ordinary two-finger scrolling pans a zoomed image. At 1x, ordinary wheel
	// events remain untouched so the page still scrolls normally.
	viewer.addEventListener('wheel', event => {
		const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewer.clientHeight : 1;
		if (event.ctrlKey) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if (desktopGestureScale === null) {
				zoomTo(zoomScale * Math.exp(-event.deltaY * unit * 0.01));
			}
		} else if (zoomScale > 1 && desktopGestureScale === null) {
			event.preventDefault();
			event.stopImmediatePropagation();
			panBy(event.deltaX * unit, event.deltaY * unit);
		}
	}, { capture: true, passive: false });

	// Safari reports trackpad pinches as GestureEvents. Touchscreen pinches are
	// already handled by Swiper's two-pointer zoom support.
	viewer.addEventListener('gesturestart', event => {
		event.preventDefault();
		desktopGestureScale = pointers.size > 1 ? null : zoomScale;
	}, { passive: false });
	viewer.addEventListener('gesturechange', event => {
		event.preventDefault();
		if (desktopGestureScale !== null) zoomTo(desktopGestureScale * event.scale);
	}, { passive: false });
	viewer.addEventListener('gestureend', event => {
		event.preventDefault();
		desktopGestureScale = null;
	}, { passive: false });

	function navigationAllowed() {
		return !gestureBlocked && zoomScale <= 1 &&
			(!window.visualViewport || window.visualViewport.scale <= 1);
	}

	function updateNavigation() {
		const allowed = !destination && navigationAllowed();
		swiper.allowSlidePrev = allowed && initialIndex > 0;
		swiper.allowSlideNext = allowed && initialIndex < slides.length - 1;
	}

	function finishNavigation() {
		if (resetting || !destination) return;
		window.clearTimeout(navigationTimeout);
		navigationTimeout = null;
		window.photoNav.goToPhoto(destination);
	}

	function resetSlide() {
		resetting = true;
		swiper.allowSlidePrev = true;
		swiper.allowSlideNext = true;
		swiper.slideTo(initialIndex, 0, false);
		resetting = false;
		updateNavigation();
	}

	// This only gates navigation; Swiper still recognizes and handles gestures.
	// Capture runs before Swiper, including when a second finger lands mid-drag.
	document.addEventListener('pointerdown', event => {
		if (pointers.size === 0) {
			gestureBlocked = zoomScale > 1;
		}
		pointers.add(event.pointerId);
		if (pointers.size > 1) {
			gestureBlocked = true;
			if (!destination) resetSlide();
		}
		updateNavigation();
	}, { capture: true, passive: true });

	function releasePointer(event) {
		if (event.type === 'pointercancel') gestureBlocked = true;
		pointers.delete(event.pointerId);
		// Keep the latch through Swiper's release handlers. Only a fresh gesture
		// may navigate, even if a pinch ended at scale 1 with one finger left.
		updateNavigation();
	}
	document.addEventListener('pointerup', releasePointer, { capture: true, passive: true });
	document.addEventListener('pointercancel', releasePointer, { capture: true, passive: true });

	swiper.on('zoomChange', (_, scale) => {
		// The event precedes Swiper updating its own zoom.scale property.
		zoomScale = scale;
		if (pointers.size > 0 && scale > 1) gestureBlocked = true;
		updateNavigation();
	});
	// Image loads and viewport changes can make Swiper recalculate its locks.
	swiper.on('update resize', updateNavigation);
	swiper.on('slideChangeTransitionStart', () => {
		if (resetting || destination || swiper.activeIndex === initialIndex) return;
		if (!navigationAllowed()) {
			resetSlide();
			return;
		}
		destination = slides[swiper.activeIndex].dataset.photoUrl;
		swiper.allowTouchMove = false;
		updateNavigation();
		// A swipe can begin while the page's preload styles suppress transitions,
		// or its CSS transition can otherwise be interrupted. In either case
		// transitionend never fires, so keep a bounded fallback rather than leaving
		// touch locked.
		navigationTimeout = window.setTimeout(
			finishNavigation,
			(Number(swiper.params.speed) || 0) + 100,
		);
	});
	swiper.on('slideChangeTransitionEnd', finishNavigation);

	window.visualViewport?.addEventListener('resize', updateNavigation);
	window.addEventListener('blur', () => {
		pointers.clear();
		gestureBlocked = true;
		updateNavigation();
	});
	window.addEventListener('pageshow', event => {
		if (!event.persisted) return;
		// A restored page must show its own photo and accept a new swipe.
		window.clearTimeout(navigationTimeout);
		navigationTimeout = null;
		pointers.clear();
		gestureBlocked = false;
		destination = null;
		swiper.allowTouchMove = true;
		swiper.zoom.out();
		resetSlide();
	});

	updatePhotoOnly();
	swiper.init();
	updateNavigation();
}
