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

// These resources are intentionally non-critical: privacy/content blockers often
// prevent analytics from loading, and the site can fall back from web fonts and
// cosmetic/link-hint resources without losing functionality.
const isInformationalResourceFailure = (resource) => {
	const relTokens = (resource.rel || "").toLowerCase().split(/\s+/);
	if (resource.element === "link" && (
		relTokens.includes("prefetch") ||
		relTokens.includes("prerender") ||
		relTokens.includes("preconnect") ||
		relTokens.includes("dns-prefetch") ||
		relTokens.includes("icon") ||
		relTokens.includes("apple-touch-icon")
	)) {
		return true;
	}

	try {
		const hostname = new URL(resource.url).hostname.toLowerCase();
		return hostname === "www.googletagmanager.com" ||
			hostname === "googletagmanager.com" ||
			hostname === "fonts.googleapis.com" ||
			hostname === "fonts.gstatic.com";
	} catch (_) {
		return false;
	}
};

// The listener is installed at the start of <head> so it catches resources that
// fail before this Sentry bundle (which is loaded at the end of <body>) is ready.
// Image failures reach this queue/callback only after their delayed retry fails.
// Its queue is drained here, and later confirmed failures are sent immediately.
const captureResourceError = (resource) => {
	const browserImageFailure = resource.element === "img" && resource.retryCount === 1;
	const level = browserImageFailure ? "warning"
		: isInformationalResourceFailure(resource) ? "info" : "error";

	Sentry.withScope((scope) => {
		scope.setLevel(level);
		scope.setTag("resource.element", resource.element);
		scope.setTag("resource.severity", level);
		if (browserImageFailure) {
			scope.setTag("resource.failure_kind", "browser_image_load");
			scope.setTag("resource.online", typeof resource.online === "boolean"
				? String(resource.online) : "unknown");
		}
		scope.setContext("resource", resource);
		scope.setFingerprint(["resource-load-failure-v2", resource.element, resource.url]);
		Sentry.captureMessage(browserImageFailure
			? `Browser failed to load image after retry: ${resource.url}`
			: `Failed to load ${resource.element}: ${resource.url}`);
	});
};

window.__sentryCaptureResourceError = captureResourceError;
const queuedResourceErrors = window.__sentryResourceErrorQueue || [];
queuedResourceErrors.splice(0).forEach(captureResourceError);

// Export Sentry to the global window object in case it's needed elsewhere
window.Sentry = Sentry;
