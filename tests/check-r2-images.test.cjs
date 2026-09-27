const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { mkdtemp, mkdir, writeFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const {
  extractUrls, renderedImages, listedObjects, compareObjects, selectSamples, run,
} = require('../scripts/check-r2-images.cjs');

const base = 'https://images.example.com';
const body = Buffer.from('example jpeg bytes');
const sha256 = createHash('sha256').update(body).digest('hex');
const key = 'photos/catalog/photo/large.jpg';
const image = { key, source: `${base}/${key}`, bytes: body.length, sha256 };

test('extracts deduplicated URLs from ordinary, metadata, and data attributes', () => {
  const html = `<img src="${image.source}"><meta content="${image.source}">` +
    `<img data-srcset="${image.source} 2x">`;
  assert.deepEqual([...extractUrls(html, base)], [image.source]);
});

test('paginates R2 listing and compares all referenced object sizes', async () => {
  const requests = [];
  const client = { async send(command) {
    requests.push(command.input);
    return requests.length === 1
      ? { Contents: [{ Key: key, Size: body.length }], IsTruncated: true, NextContinuationToken: 'next' }
      : { Contents: [{ Key: 'photos/catalog/photo/gallery.jpg', Size: 20 }], IsTruncated: false };
  } };
  const listed = await listedObjects(client, 'bucket');
  assert.equal(requests.length, 2);
  assert.equal(requests[1].ContinuationToken, 'next');
  assert.deepEqual(compareObjects(new Map([[key, image]]), listed), []);
  assert.match(compareObjects(new Map([[key, { bytes: 1 }]]), listed)[0], /size mismatch/);
  assert.match(compareObjects(new Map([['photos/missing.jpg', image]]), listed)[0], /missing/);
});

test('checks the fresh render, listed key, and downloaded public bytes', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'r2-image-check-'));
  try {
    const output = path.join(root, 'public');
    const manifests = path.join(root, 'manifests');
    await mkdir(output);
    await mkdir(manifests);
    await writeFile(path.join(output, 'index.html'), `<img src="${image.source}">`);
    await writeFile(path.join(manifests, 'gallery.json'), JSON.stringify({
      galleryId: 'gallery', entries: [image],
    }));
    const env = { R2_PUBLIC_BASE_URL: base, R2_BUCKET_NAME: 'bucket', R2_S3_ENDPOINT: 'https://r2.example' };
    const client = { async send() { return { Contents: [{ Key: key, Size: body.length }] }; } };
    const fetchImage = async (url) => {
      assert.equal(url, image.source);
      return new Response(body, { headers: { 'content-type': 'image/jpeg' } });
    };
    await run({ env, output, manifests, client, fetchImage });
    assert.deepEqual([...await renderedImages(output, base, new Map([[key, image]]))], [[key, image]]);
    await writeFile(path.join(output, 'index.html'), `<img src="${base}/photos/catalog/unknown/large.jpg">`);
    await assert.rejects(run({ env, output, manifests, client, fetchImage }), /Unknown or malformed R2 URLs/);
    await writeFile(path.join(output, 'index.html'), `<img src="${image.source}">`);
    await assert.rejects(run({ env, output, manifests, client,
      fetchImage: async () => new Response(Buffer.from('wrong'), { headers: { 'content-type': 'image/jpeg' } }),
    }), /downloaded bytes differ from manifest/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('samples every available rendition and rotates the rest with a seed', () => {
  const keys = ['large', 'gallery', 'thumbnail', 'other'].map((name) => `photos/n/id/${name}.jpg`);
  const chosen = selectSamples(new Map(keys.map((item) => [item, {}])), 3, '2026-09-26');
  assert.equal(chosen.length, 3);
  assert.deepEqual(new Set(chosen.map((item) => item.split('/').at(-1))),
    new Set(['large.jpg', 'gallery.jpg', 'thumbnail.jpg']));
});
