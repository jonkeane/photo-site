#!/usr/bin/env node
'use strict';

const { createHash } = require('node:crypto');
const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const SCANNED_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.xml']);

async function* filesUnder(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* filesUnder(name);
    else if (entry.isFile() && SCANNED_EXTENSIONS.has(path.extname(name))) yield name;
  }
}

function publicBase(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('R2_PUBLIC_BASE_URL must be a public HTTPS URL without query or fragment');
  }
  return value.replace(/\/+$/, '');
}

function manifestImages(manifests, base) {
  const images = new Map();
  for (const manifest of manifests) {
    for (const image of manifest.entries || []) {
      for (const rendition of [image, ...Object.values(image.renditions || {})]) {
        if (!rendition.key || rendition.source !== `${base}/${rendition.key}` ||
            !Number.isSafeInteger(rendition.bytes) || rendition.bytes < 1 ||
            !/^[a-f0-9]{64}$/.test(rendition.sha256)) {
          throw new Error(`Invalid image metadata in gallery ${manifest.galleryId}`);
        }
        const previous = images.get(rendition.key);
        if (previous && (previous.bytes !== rendition.bytes || previous.sha256 !== rendition.sha256)) {
          throw new Error(`Conflicting manifest metadata for ${rendition.key}`);
        }
        images.set(rendition.key, rendition);
      }
    }
  }
  return images;
}

async function readManifests(directory, base) {
  const names = (await readdir(directory)).filter((name) => name.endsWith('.json'));
  if (!names.length) throw new Error(`No gallery manifests in ${directory}`);
  return manifestImages(await Promise.all(names.map(async (name) =>
    JSON.parse(await readFile(path.join(directory, name), 'utf8')))), base);
}

function extractUrls(contents, base) {
  const urls = new Set();
  let index = 0;
  while ((index = contents.indexOf(`${base}/`, index)) !== -1) {
    const end = contents.slice(index).search(/[\s"'<>`,)\\]/);
    const raw = contents.slice(index, end === -1 ? undefined : index + end)
      .replace(/[;,]+$/, '').replace(/&amp;/g, '&');
    urls.add(raw);
    index += base.length + 1;
  }
  return urls;
}

async function renderedImages(directory, base, expected) {
  const referenced = new Map();
  const invalid = [];
  const basePath = new URL(base).pathname.replace(/\/$/, '');
  for await (const file of filesUnder(directory)) {
    for (const raw of extractUrls(await readFile(file, 'utf8'), base)) {
      let key;
      try {
        const url = new URL(raw);
        key = decodeURIComponent(url.pathname.slice(basePath.length + 1));
        if (url.search || url.hash || !key.startsWith('photos/') ||
            raw !== `${base}/${key}` || !expected.has(key)) throw new Error('unexpected image URL');
      } catch {
        invalid.push(`${path.relative(directory, file)}: ${raw}`);
        continue;
      }
      referenced.set(key, expected.get(key));
    }
  }
  if (invalid.length) throw new Error(`Unknown or malformed R2 URLs (${invalid.length}):\n${invalid.slice(0, 20).join('\n')}`);
  if (!referenced.size) throw new Error(`No R2 image URLs found in ${directory}; check the fresh Hugo build`);
  return referenced;
}

async function listedObjects(client, bucket) {
  const objects = new Map();
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket, Prefix: 'photos/', MaxKeys: 1000, ContinuationToken: token,
    }));
    for (const object of page.Contents || []) objects.set(object.Key, object.Size);
    if (page.IsTruncated && (!page.NextContinuationToken || page.NextContinuationToken === token)) {
      throw new Error('R2 listing was truncated without a usable continuation token');
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return objects;
}

function compareObjects(referenced, listed) {
  const failures = [];
  for (const [key, expected] of referenced) {
    if (!listed.has(key)) failures.push(`missing: ${key}`);
    else if (listed.get(key) !== expected.bytes) {
      failures.push(`size mismatch: ${key} (manifest ${expected.bytes}, R2 ${listed.get(key)})`);
    }
  }
  return failures;
}

function selectSamples(referenced, count, seed) {
  const keys = [...referenced.keys()];
  const rank = (key) => createHash('sha256').update(`${seed}:${key}`).digest('hex');
  keys.sort((a, b) => rank(a).localeCompare(rank(b)));
  const chosen = [];
  for (const size of ['large', 'gallery', 'thumbnail']) {
    const key = keys.find((item) => item.endsWith(`/${size}.jpg`));
    if (key && chosen.length < count) chosen.push(key);
  }
  for (const key of keys) {
    if (chosen.length >= count) break;
    if (!chosen.includes(key) && !chosen.some((item) => item.split('/')[1] === key.split('/')[1])) {
      chosen.push(key);
    }
  }
  for (const key of keys) {
    if (chosen.length >= count) break;
    if (!chosen.includes(key)) chosen.push(key);
  }
  return chosen;
}

async function verifyDownload(url, image, fetchImage = fetch) {
  const response = await fetchImage(url, { redirect: 'error', signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) throw new Error(`${url}: HTTP ${response.status}`);
  if (!/^image\/jpeg(?:;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new Error(`${url}: expected image/jpeg, got ${response.headers.get('content-type')}`);
  }
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > image.bytes) {
      throw new Error(`${url}: body exceeds manifest size ${image.bytes}`);
    }
    hash.update(chunk);
  }
  if (bytes !== image.bytes || hash.digest('hex') !== image.sha256) {
    throw new Error(`${url}: downloaded bytes differ from manifest`);
  }
}

async function run({ env = process.env, output = 'public', manifests = 'data/r2/galleries',
  fetchImage = fetch, client } = {}) {
  const base = publicBase(env.R2_PUBLIC_BASE_URL || '');
  const bucket = env.R2_BUCKET;
  const endpoint = env.R2_S3_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || (!client && (!accessKeyId || !secretAccessKey))) {
    throw new Error('Set R2_BUCKET, R2_S3_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
  }
  const sampleCount = Number(env.R2_IMAGE_SAMPLE_COUNT || 6);
  if (!Number.isSafeInteger(sampleCount) || sampleCount < 1) throw new Error('R2_IMAGE_SAMPLE_COUNT must be a positive integer');
  const expected = await readManifests(manifests, base);
  const referenced = await renderedImages(output, base, expected);
  const s3 = client || new S3Client({ region: 'auto', endpoint, forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey } });
  try {
    const listed = await listedObjects(s3, bucket);
    const failures = compareObjects(referenced, listed);
    if (failures.length) throw new Error(`R2 object check failed (${failures.length}):\n${failures.slice(0, 30).join('\n')}`);
    const seed = new Date().toISOString().slice(0, 10);
    const samples = selectSamples(referenced, sampleCount, seed);
    for (const key of samples) await verifyDownload(`${base}/${key}`, referenced.get(key), fetchImage);
    console.log(`R2 image check passed: ${referenced.size} rendered keys, ${listed.size} listed objects, ${samples.length} verified public downloads.`);
  } finally {
    if (!client) s3.destroy();
  }
}

if (require.main === module) run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

module.exports = { extractUrls, manifestImages, renderedImages, listedObjects, compareObjects,
  selectSamples, verifyDownload, run };
