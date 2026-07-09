import { createHash, randomUUID } from 'node:crypto';

export const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export function scanProofBytes({ bytes, contentType, expectedSizeBytes, expectedSha256 }) {
  const buffer = Buffer.from(bytes);
  const normalizedContentType = String(contentType ?? '').split(';', 1)[0].trim().toLowerCase();
  if (normalizedContentType !== 'text/plain') {
    return {
      scanStatus: 'unsupported',
      threats: [],
      statusReasons: [{ code: 'proof_scanner_text_only', contentType: normalizedContentType }],
      scannerProvider: 'e12-proof-integrity-scanner',
      scannerVersion: '1.0.0',
      providerReference: randomUUID(),
    };
  }
  if (buffer.length !== expectedSizeBytes) throw new Error('file_size_mismatch');
  const actualSha256 = createHash('sha256').update(buffer).digest('hex');
  if (actualSha256 !== String(expectedSha256).toLowerCase()) throw new Error('file_hash_mismatch');
  const infected = buffer.toString('utf8').includes(EICAR_SIGNATURE);
  return {
    scanStatus: infected ? 'infected' : 'clean',
    threats: infected ? [{ name: 'EICAR-Test-File', category: 'test_signature' }] : [],
    statusReasons: [{ code: 'technical_proof_only', sha256Verified: true }],
    scannerProvider: 'e12-proof-integrity-scanner',
    scannerVersion: '1.0.0',
    providerReference: randomUUID(),
  };
}
