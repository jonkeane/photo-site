const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../static/assets/js/sentry-init.js'), 'utf8')
  .replace("import * as Sentry from '@sentry/browser';", '');

function reporter(queued = []) {
  const events = [];
  let scope;
  const Sentry = {
    browserTracingIntegration() { return {}; },
    init() {},
    withScope(callback) {
      scope = {
        setLevel(level) { this.level = level; },
        setTag() {},
        setContext() {},
        setFingerprint(fingerprint) { this.fingerprint = fingerprint; },
      };
      callback(scope);
    },
    captureMessage(message) { events.push({ message, fingerprint: scope.fingerprint }); },
  };
  const window = { __sentryResourceErrorQueue: queued };
  vm.runInNewContext(source, { Sentry, window, URL });
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
