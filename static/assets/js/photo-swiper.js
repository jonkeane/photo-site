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
			? 'Photo viewer. Double tap or press Escape to restore controls.'
			: 'Photo viewer. Double tap or press Enter for image-only view.');
		if (swiper.initialized) {
			swiper.zoom.out();
			swiper.update();
			updateNavigation();
		}
	}

	function setPhotoOnly(enabled) {
		if (destination || swiper.animating) return;
		const url = new URL(window.location.href);
		url.hash = enabled ? 'photo-only' : '';
		history.replaceState(history.state, '', url);
		// replaceState does not fire hashchange; also refresh the details drawer.
		window.dispatchEvent(new Event('hashchange'));
		viewer.focus({ preventScroll: true });
	}

	swiper.on('doubleTap', () => {
		setPhotoOnly(window.location.hash !== '#photo-only');
	});
	viewer.addEventListener('keydown', event => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			setPhotoOnly(window.location.hash !== '#photo-only');
		}
	});
	document.addEventListener('keydown', event => {
		if (event.key === 'Escape' && window.location.hash === '#photo-only') {
			setPhotoOnly(false);
		}
	});
	window.addEventListener('hashchange', updatePhotoOnly);
	window.addEventListener('pageshow', updatePhotoOnly);

	function navigationAllowed() {
		return !gestureBlocked && zoomScale <= 1 &&
			(!window.visualViewport || window.visualViewport.scale <= 1);
	}

	function updateNavigation() {
		const allowed = !destination && navigationAllowed();
		swiper.allowSlidePrev = allowed && initialIndex > 0;
		swiper.allowSlideNext = allowed && initialIndex < slides.length - 1;
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
	});
	swiper.on('slideChangeTransitionEnd', () => {
		if (!resetting && destination) window.photoNav.goToPhoto(destination);
	});

	window.visualViewport?.addEventListener('resize', updateNavigation);
	window.addEventListener('blur', () => {
		pointers.clear();
		gestureBlocked = true;
		updateNavigation();
	});
	window.addEventListener('pageshow', event => {
		if (!event.persisted) return;
		// A restored page must show its own photo and accept a new swipe.
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
