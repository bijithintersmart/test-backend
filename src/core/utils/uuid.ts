import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure, standard-compliant UUID v7.
 * UUID v7 layout:
 * - 48 bits: Unix timestamp in milliseconds
 * - 4 bits: Version (always 7)
 * - 12 bits: Random
 * - 2 bits: Variant (always 10xx, i.e., 8, 9, a, or b)
 * - 62 bits: Random
 */
export function uuidv7(): string {
  const timestamp = Date.now();
  const randomBytesBuffer = randomBytes(10);

  // Format timestamp to hex (12 hex digits = 6 bytes = 48 bits)
  const timestampHex = timestamp.toString(16).padStart(12, '0');

  // Format 12-bit random part and set version to 7
  const randomPart1 = ((randomBytesBuffer.readUInt16BE(0) & 0x0fff) | 0x7000)
    .toString(16)
    .padStart(4, '0');

  // Format variant and 62-bit random part
  const randomPart2 = ((randomBytesBuffer.readUInt16BE(2) & 0x3fff) | 0x8000)
    .toString(16)
    .padStart(4, '0');

  const randomPart3 = randomBytesBuffer.slice(4).toString('hex');

  return `${timestampHex.slice(0, 8)}-${timestampHex.slice(8, 12)}-${randomPart1}-${randomPart2}-${randomPart3}`;
}
