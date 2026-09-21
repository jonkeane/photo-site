const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const bootstrap = readFileSync(join(__dirname, '../layouts/partials/resource-error-bootstrap.html'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1];

function setup() {
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 0;
  let now = 0;
  const window = {
    location: { href: 'https://photos.example/gallery/?private=value#photo' },
    addEventListener(type, callback) {
      listeners.set(type, [...(listeners.get(type) || []), callback]);
    },
    setTimeout(callback, delay) {
      timers.set(++nextTimer, { callback, delay });
      return nextTimer;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(bootstrap, {
    window, document: { baseURI: window.location.href }, URL,
    navigator: { onLine: true }, Date: { now: () => now },
  });
  return {
    window, timers,
    emit(type, target) { (listeners.get(type) || []).forEach((callback) => callback({ target })); },
    tick() {
      for (const [id, { callback, delay }] of [...timers]) {
        assert.ok(delay >= 1000 && delay <= 1500);
        now += delay;
        timers.delete(id);
        callback();
      }
    },
    reports: window.__sentryResourceErrorQueue,
  };
}

function image(attributes = { src: 'https://images.example/photo.jpg?signature=secret#fragment' }) {
  const attrs = { ...attributes };
  return {
    tagName: 'IMG', isConnected: true, complete: true, naturalWidth: 0,
    currentSrc: attributes.src || 'https://images.example/responsive.jpg?signature=secret',
    get src() { return attrs.src || ''; },
    getAttribute(name) { return attrs[name] ?? null; },
    hasAttribute(name) { return Object.hasOwn(attrs, name); },
    writes: [],
    setAttribute(name, value) { attrs[name] = value; this.writes.push([name, value]); },
    closest() { return null; },
    matches() { return false; },
  };
}

test('one delayed retry repairs the same image without reporting a recovered failure', () => {
  const h = setup();
  const img = image();
  h.emit('error', img);
  h.emit('error', img);
  assert.equal(h.reports.length, 0);
  assert.equal(h.timers.size, 1);
  h.tick();
  assert.deepEqual(img.writes, [['src', img.src]]);
  img.naturalWidth = 100;
  h.emit('load', img);
  h.tick();
  assert.equal(h.reports.length, 0);
  assert.equal(img.writes.length, 1);
});

test('a failed retry is queued once, with diagnostics and sanitized URLs', () => {
  const h = setup();
  const img = image();
  h.emit('error', img);
  h.tick();
  h.emit('error', img);
  h.emit('error', img);
  h.tick();
  assert.equal(h.reports.length, 1);
  assert.equal(img.writes.length, 1);
  const report = h.reports[0];
  assert.equal(report.url, 'https://images.example/photo.jpg');
  assert.equal(report.page, 'https://photos.example/gallery/');
  assert.equal(report.retryCount, 1);
  assert.ok(report.elapsedMs >= 1000);
  assert.equal(report.online, true);
  assert.equal(JSON.stringify(report).includes('secret'), false);
});

test('Sentry becoming ready during backoff receives only the final failure', () => {
  const h = setup();
  const captured = [];
  const img = image();
  h.emit('error', img);
  h.window.__sentryCaptureResourceError = (resource) => captured.push(resource);
  h.tick();
  assert.equal(captured.length, 0);
  h.emit('error', img);
  assert.equal(captured.length, 1);
  assert.equal(h.reports.length, 0);
});

test('each image retries even when another element already reported the same URL', () => {
  const h = setup();
  for (const img of [image(), image()]) {
    h.emit('error', img);
    h.tick();
    h.emit('error', img);
    assert.equal(img.writes.length, 1);
  }
  assert.equal(h.reports.length, 1);
});

for (const reason of ['loaded', 'removed', 'source changed', 'candidate changed', 'picture changed']) {
  test(`cancel stale retries when ${reason}`, () => {
    const h = setup();
    const img = image();
    const source = image({ srcset: 'first.jpg 1x, large.jpg 2x' });
    img.parentElement = { tagName: 'PICTURE', querySelectorAll: () => [source] };
    h.emit('error', img);
    if (reason === 'loaded') {
      img.naturalWidth = 100;
      h.emit('load', img);
    }
    if (reason === 'removed') img.isConnected = false;
    // Keep currentSrc stale to exercise source changes before browser selection.
    if (reason === 'source changed') img.setAttribute('src', 'replacement.jpg');
    if (reason === 'candidate changed') img.currentSrc = 'https://images.example/large.jpg';
    if (reason === 'picture changed') source.setAttribute('srcset', 'replacement.jpg');
    const writes = img.writes.length;
    h.tick();
    assert.equal(img.writes.length, writes);
    assert.equal(h.reports.length, 0);
    assert.equal(h.timers.size, 0);
  });
}

test('a new failed source gets its own retry budget', () => {
  const h = setup();
  const img = image();
  h.emit('error', img);
  h.tick();
  img.setAttribute('src', 'https://images.example/other.jpg');
  img.currentSrc = img.src;
  h.emit('error', img);
  assert.equal(h.reports.length, 0);
  h.tick();
  h.emit('error', img);
  assert.equal(h.reports.length, 1);
  assert.equal(h.reports[0].url, img.src);
});

test('srcset-only images retain their candidates and do not acquire a fallback src', () => {
  const h = setup();
  const img = image({ srcset: 'small.jpg 1x, large.jpg 2x', sizes: '100vw' });
  h.emit('error', img);
  h.tick();
  assert.deepEqual(img.writes, [['srcset', 'small.jpg 1x, large.jpg 2x']]);
  assert.equal(img.getAttribute('src'), null);
  assert.equal(img.getAttribute('sizes'), '100vw');
});

test('pagehide cancels retries and suppresses errors; pageshow permits retry again', () => {
  const h = setup();
  const img = image();
  h.emit('error', img);
  h.emit('pagehide');
  h.tick();
  h.emit('error', img);
  assert.equal(img.writes.length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.reports.length, 0);
  h.emit('pageshow');
  h.emit('error', img);
  h.tick();
  h.emit('error', img);
  assert.equal(img.writes.length, 1);
  assert.equal(h.reports.length, 1);
});

test('non-image resource errors still report immediately and deduplicate', () => {
  const h = setup();
  const script = { ...image(), tagName: 'SCRIPT', currentSrc: '', src: 'https://photos.example/app.js' };
  h.emit('error', script);
  h.emit('error', script);
  assert.equal(h.reports.length, 1);
  assert.equal(h.reports[0].element, 'script');
  assert.equal(h.timers.size, 0);
});
