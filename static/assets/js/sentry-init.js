import * as Sentry from '@sentry/browser';

// Initialize Sentry
Sentry.init({
	dsn: "https://c1e2e76e9cbeea844e4e57d45c958c39@o4510529776189440.ingest.us.sentry.io/4510529780842496",
	integrations: [Sentry.browserTracingIntegration()],
	// Set tracesSampleRate to 1.0 to capture 100% of transactions for testing
	// In production, consider lowering this to 0.1-0.2 to reduce volume
	tracesSampleRate: 1.0,
	// Control which URLs should have distributed tracing enabled
	// Includes localhost for development and production domains
	tracePropagationTargets: ["localhost:1313", "localhost", /^https:\/\/[^/]+\.jonkeane\.com/],
	// Setting this option to true will send default PII data to Sentry
	sendDefaultPii: false,
});

// Capture resource loading errors (images, CSS, JavaScript)
// Uses capture phase (true) since resource errors don't bubble
document.body.addEventListener("error", (event) => {
	if (!event.target) return;

	if (event.target.tagName === 'IMG') {
		Sentry.captureMessage(`Failed to load image: ${event.target.src}`, 'error');
	}

}, true);

// Export Sentry to the global window object in case it's needed elsewhere
window.Sentry = Sentry;
