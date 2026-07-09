import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SupabaseStorageProvider } from './supabase-storage-provider.mjs';

class FakeBucket {
  constructor(objects) { this.objects = objects; }
  async createSignedUploadUrl(path) { return { data: { signedUrl: `https://upload/${path}`, token: `token:${path}` }, error: null }; }
  async uploadToSignedUrl(path, token, bytes, options) {
    assert.equal(token, `token:${path}`);
    this.objects.set(path, { bytes: Buffer.from(bytes), contentType: options.contentType, version: 'v1', eTag: 'etag-1' });
    return { data: { path }, error: null };
  }
  async info(path) {
    const object = this.objects.get(path);
    if (!object) return { data: null, error: { message: 'not found' } };
    return { data: { size: object.bytes.length, contentType: object.contentType, version: object.version, eTag: object.eTag, metadata: {} }, error: null };
  }
  async download(path) {
    const object = this.objects.get(path);
    if (!object) return { data: null, error: { message: 'not found' } };
    return { data: new Blob([object.bytes], { type: object.contentType }), error: null };
  }
  async move(source, target) {
    const object = this.objects.get(source);
    if (!object) return { data: null, error: { message: 'not found' } };
    this.objects.set(target, { ...object, version: 'v2', eTag: 'etag-2' });
    this.objects.delete(source);
    return { data: { message: 'ok' }, error: null };
  }
  async createSignedUrl(path, seconds) { return { data: { signedUrl: `https://download/${path}?ttl=${seconds}` }, error: null }; }
  async remove(paths) { paths.forEach((path) => this.objects.delete(path)); return { data: paths, error: null }; }
}

class FakeClient {
  constructor() {
    this.objects = new Map();
    this.bucket = null;
    this.storage = {
      getBucket: async () => this.bucket ? { data: this.bucket, error: null } : { data: null, error: { message: 'not found' } },
      createBucket: async (id, options) => { this.bucket = { id, ...options }; return { data: this.bucket, error: null }; },
      from: () => new FakeBucket(this.objects),
    };
  }
}

test('performs signed upload, verifies hash, releases and signs download', async () => {
  const client = new FakeClient();
  const now = 1_800_000_000_000;
  const provider = new SupabaseStorageProvider({ client, bucket: 'private', clock: () => now });
  const bucket = await provider.ensurePrivateBucket({ fileSizeLimit: 5_000_000, allowedMimeTypes: ['text/plain'] });
  assert.equal(bucket.created, true);
  assert.equal(bucket.bucket.public, false);

  const source = 'quarantine/org/user/intent/proof.txt';
  const target = 'protected/org/user/intent/proof.txt';
  const payload = Buffer.from('storage proof');
  const intent = await provider.createUploadIntent({ objectId: 'intent-1', objectKey: source, contentType: 'text/plain', maxBytes: 100 });
  assert.equal(intent.immutableKey, true);
  await provider.uploadToIntent({ objectKey: source, uploadToken: intent.uploadToken, bytes: payload, contentType: 'text/plain' });

  const inspected = await provider.inspectAndHash({ objectKey: source, expectedContentType: 'text/plain', maxBytes: 100 });
  assert.equal(inspected.sha256, createHash('sha256').update(payload).digest('hex'));
  assert.equal(inspected.sizeBytes, payload.length);

  const released = await provider.releaseFromQuarantine({ sourceObjectKey: source, targetObjectKey: target });
  assert.equal(released.objectKey, target);
  assert.equal(client.objects.has(source), false);
  assert.equal(client.objects.has(target), true);

  const download = await provider.createDownloadIntent({ objectKey: target, expiresInSeconds: 60 });
  assert.match(download.downloadUrl, /^https:\/\/download\//);
  await provider.deleteObject({ objectKey: target });
  assert.equal(client.objects.size, 0);
});

test('refuses overwrite-like keys, MIME mismatch, oversized objects and premature download', async () => {
  const client = new FakeClient();
  const provider = new SupabaseStorageProvider({ client, bucket: 'private' });
  await assert.rejects(() => provider.createUploadIntent({ objectId: 'x', objectKey: 'protected/x.txt', contentType: 'text/plain', maxBytes: 10 }), /quarantined/);
  await assert.rejects(() => provider.createDownloadIntent({ objectKey: 'quarantine/x.txt' }), /not_released/);

  client.objects.set('quarantine/x.txt', { bytes: Buffer.from('12345'), contentType: 'text/plain', version: 'v1', eTag: 'e' });
  await assert.rejects(() => provider.inspectAndHash({ objectKey: 'quarantine/x.txt', expectedContentType: 'application/pdf', maxBytes: 10 }), /content_type_mismatch/);
  await assert.rejects(() => provider.inspectAndHash({ objectKey: 'quarantine/x.txt', expectedContentType: 'text/plain', maxBytes: 4 }), /file_too_large/);
});
