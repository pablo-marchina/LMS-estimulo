import { createHash } from 'node:crypto';

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`${name}_required`);
  return value;
}

function unwrap(result, operation) {
  if (result?.error) {
    const message = result.error.message ?? result.error.error ?? String(result.error);
    throw new Error(`${operation}_failed:${message}`);
  }
  return result?.data;
}

function normalizeContentType(value) {
  return String(value ?? '').split(';', 1)[0].trim().toLowerCase();
}

function isAlreadyExists(error) {
  const text = String(error?.message ?? error ?? '').toLowerCase();
  return text.includes('already exists') || text.includes('duplicate');
}

export class SupabaseStorageProvider {
  constructor({ client, bucket, providerName = 'supabase_storage', clock = () => Date.now() }) {
    this.client = required(client, 'client');
    this.bucket = required(bucket, 'bucket');
    this.providerName = providerName;
    this.clock = clock;
  }

  async ensurePrivateBucket({ fileSizeLimit, allowedMimeTypes }) {
    required(fileSizeLimit, 'file_size_limit');
    required(allowedMimeTypes, 'allowed_mime_types');
    const existing = await this.client.storage.getBucket(this.bucket);
    if (!existing?.error && existing?.data) return { created: false, bucket: existing.data };

    const created = await this.client.storage.createBucket(this.bucket, {
      public: false,
      fileSizeLimit,
      allowedMimeTypes,
    });
    if (created?.error && !isAlreadyExists(created.error)) unwrap(created, 'create_bucket');
    return { created: !created?.error, bucket: created?.data ?? { id: this.bucket, name: this.bucket, public: false } };
  }

  async createUploadIntent({ objectId, objectKey, contentType, maxBytes }) {
    required(objectId, 'object_id');
    required(objectKey, 'object_key');
    required(contentType, 'content_type');
    if (!objectKey.startsWith('quarantine/')) throw new Error('upload_key_must_be_quarantined');
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new Error('invalid_max_bytes');

    const bucket = this.client.storage.from(this.bucket);
    const signed = unwrap(await bucket.createSignedUploadUrl(objectKey, { upsert: false }), 'create_signed_upload');
    return {
      objectId,
      provider: this.providerName,
      bucket: this.bucket,
      objectKey,
      uploadUrl: signed.signedUrl,
      uploadToken: signed.token,
      providerExpiresAt: new Date(this.clock() + 2 * 60 * 60 * 1000).toISOString(),
      requiredHeaders: { 'content-type': normalizeContentType(contentType) },
      maxBytes,
      immutableKey: true,
    };
  }

  async uploadToIntent({ objectKey, uploadToken, bytes, contentType }) {
    const bucket = this.client.storage.from(this.bucket);
    return unwrap(await bucket.uploadToSignedUrl(objectKey, uploadToken, bytes, {
      contentType: normalizeContentType(contentType),
      upsert: false,
    }), 'signed_upload');
  }

  async inspectAndHash({ objectKey, expectedContentType, maxBytes }) {
    const bucket = this.client.storage.from(this.bucket);
    const info = unwrap(await bucket.info(objectKey), 'object_info');
    const sizeBytes = Number(info.size ?? info.metadata?.size ?? 0);
    const contentType = normalizeContentType(
      info.contentType ?? info.content_type ?? info.metadata?.mimetype ?? info.metadata?.contentType
    );
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) throw new Error('invalid_provider_size');
    if (sizeBytes > maxBytes) throw new Error('file_too_large');
    if (contentType !== normalizeContentType(expectedContentType)) throw new Error('content_type_mismatch');

    const blob = unwrap(await bucket.download(objectKey), 'object_download');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength !== sizeBytes) throw new Error('provider_size_mismatch');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    return {
      provider: this.providerName,
      bucket: this.bucket,
      objectKey,
      sizeBytes,
      contentType,
      sha256,
      etag: info.eTag ?? info.etag ?? null,
      providerObjectVersion: info.version ?? info.versionId ?? null,
      providerMetadata: info.metadata ?? {},
    };
  }

  async releaseFromQuarantine({ sourceObjectKey, targetObjectKey }) {
    if (!sourceObjectKey.startsWith('quarantine/')) throw new Error('source_not_quarantined');
    const expected = sourceObjectKey.replace(/^quarantine\//, 'protected/');
    if (targetObjectKey !== expected) throw new Error('invalid_release_target');
    const bucket = this.client.storage.from(this.bucket);
    unwrap(await bucket.move(sourceObjectKey, targetObjectKey), 'release_move');
    const info = unwrap(await bucket.info(targetObjectKey), 'released_object_info');
    return {
      provider: this.providerName,
      bucket: this.bucket,
      objectKey: targetObjectKey,
      etag: info.eTag ?? info.etag ?? null,
      providerObjectVersion: info.version ?? info.versionId ?? null,
    };
  }

  async createDownloadIntent({ objectKey, expiresInSeconds = 60, download = true }) {
    if (!objectKey.startsWith('protected/')) throw new Error('file_not_released');
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 300) {
      throw new Error('invalid_download_ttl');
    }
    const bucket = this.client.storage.from(this.bucket);
    const signed = unwrap(
      await bucket.createSignedUrl(objectKey, expiresInSeconds, { download }),
      'create_signed_download'
    );
    return {
      provider: this.providerName,
      bucket: this.bucket,
      objectKey,
      downloadUrl: signed.signedUrl,
      expiresAt: new Date(this.clock() + expiresInSeconds * 1000).toISOString(),
    };
  }

  async deleteObject({ objectKey }) {
    const bucket = this.client.storage.from(this.bucket);
    unwrap(await bucket.remove([objectKey]), 'delete_object');
    return { deleted: true, provider: this.providerName, bucket: this.bucket, objectKey };
  }
}
