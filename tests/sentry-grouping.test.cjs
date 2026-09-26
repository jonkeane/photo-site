const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../static/assets/js/sentry-init.js'), 'utf8')
  .replace("import * as Sentry from '@sentry/browser';", '');

function reporter(queued = [], navigator = { onLine: true }) {
  const events = [];
  let scope;
  const Sentry = {
    browserTracingIntegration() { return {}; },
    init() {},
    withScope(callback) {
      scope = {
        setLevel(level) { this.level = level; },
        setTag(key, value) { (this.tags ||= {})[key] = value; },
        setContext(key, value) { (this.context ||= {})[key] = value; },
        setFingerprint(fingerprint) { this.fingerprint = fingerprint; },
      };
      callback(scope);
    },
    captureMessage(message) {
      events.push({ message, fingerprint: scope.fingerprint, level: scope.level,
        tags: scope.tags, context: scope.context });
    },
  };
  const window = { __sentryResourceErrorQueue: queued };
  vm.runInNewContext(source, { Sentry, window, URL, navigator });
  return { capture: window.__sentryCaptureResourceError, events, queue: queued };
}

test('new resource fingerprints separate images by URL and scripts by type, not page', () => {
  const { capture, events } = reporter();
  const url = 'https://images.example/thumbnail.jpg';
  capture({ element: 'img', url, page: 'https://photos.example/one/' });
  capture({ element: 'img', url, page: 'https://photos.example/two/' });
  capture({ element: 'img', url: 'https://images.example/large.jpg', page: 'https://photos.example/one/' });
  capture({ element: 'script', url, page: 'https://photos.example/one/' });

  const fingerprints = events.map(({ fingerprint }) => Array.from(fingerprint));
  assert.deepEqual(fingerprints, [
    ['resource-load-failure-v2', 'img', url],
    ['resource-load-failure-v2', 'img', url],
    ['resource-load-failure-v2', 'img', 'https://images.example/large.jpg'],
    ['resource-load-failure-v2', 'script', url],
  ]);
  assert.equal(events[0].message.includes('photos.example'), false);
});

test('queued failures use the same fingerprint as live failures', () => {
  const url = 'https://images.example/thumbnail.jpg';
  const { capture, events, queue } = reporter([{ element: 'img', url }]);
  capture({ element: 'img', url });
  assert.deepEqual(events.map(({ fingerprint }) => Array.from(fingerprint)), [
    ['resource-load-failure-v2', 'img', url],
    ['resource-load-failure-v2', 'img', url],
  ]);
  assert.equal(queue.length, 0);
});

test('exhausted image retries report browser warnings with filterable failure-time tags', () => {
  const url = 'https://images.example/photo.jpg';
  const queued = [
    { element: 'img', url, retryCount: 1, elapsedMs: 1250, online: false },
    { element: 'img', url: 'https://images.example/other.jpg', retryCount: 1, online: 'unknown' },
  ];
  const { capture, events, queue } = reporter(queued, { onLine: true });
  capture({ element: 'img', url, retryCount: 1, online: true });

  assert.equal(queue.length, 0);
  assert.deepEqual(events.map(({ level }) => level), ['warning', 'warning', 'warning']);
  assert.deepEqual(events.map(({ tags }) => tags['resource.online']), ['false', 'unknown', 'true']);
  for (const event of events) {
    assert.equal(event.tags['resource.severity'], 'warning');
    assert.equal(event.tags['resource.failure_kind'], 'browser_image_load');
    assert.match(event.message, /^Browser failed to load image after retry:/);
  }
  assert.equal(events[0].context.resource.retryCount, 1);
  assert.equal(events[0].context.resource.elapsedMs, 1250);
  assert.equal(events[0].context.resource.online, false);
});

test('other resource failures retain their existing severity and tags', () => {
  const { capture, events } = reporter();
  capture({ element: 'script', url: 'https://photos.example/app.js' });
  capture({ element: 'script', url: 'https://www.googletagmanager.com/gtm.js' });
  capture({ element: 'img', url: 'https://images.example/photo.jpg' });

  assert.deepEqual(events.map(({ level }) => level), ['error', 'info', 'error']);
  for (const event of events) {
    assert.equal(event.tags['resource.severity'], event.level);
    assert.equal(event.tags['resource.failure_kind'], undefined);
    assert.equal(event.tags['resource.online'], undefined);
  }
});
