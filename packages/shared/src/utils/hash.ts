import { createHash } from 'node:crypto';

/**
 * Standard SHA-256 hex digest.
 */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Fast 64-bit FNV-1a hash for string tokens.
 */
function fnv1a64(str: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash;
}

/**
 * Computes a 64-bit SimHash hex string from a list of tokens (or word ngrams).
 * SimHash is locality-sensitive: small text changes yield small Hamming distances.
 */
export function simhash(tokens: string[]): string {
  if (tokens.length === 0) {
    return '0'.repeat(16);
  }

  const v = new Int32Array(64);

  // Count token frequencies
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) || 0) + 1);
  }

  for (const [token, weight] of frequencies.entries()) {
    const tokenHash = fnv1a64(token);
    for (let i = 0; i < 64; i++) {
      const bit = (tokenHash >> BigInt(i)) & 1n;
      if (bit === 1n) {
        v[i] += weight;
      } else {
        v[i] -= weight;
      }
    }
  }

  let fingerprint = 0n;
  for (let i = 0; i < 64; i++) {
    if (v[i] > 0) {
      fingerprint |= 1n << BigInt(i);
    }
  }

  return fingerprint.toString(16).padStart(16, '0');
}

/**
 * Computes Hamming distance between two 64-bit hex SimHash values.
 * Distance <= 3 typically indicates near-duplicate content.
 */
export function simhashHammingDistance(hashA: string, hashB: string): number {
  try {
    const a = BigInt('0x' + hashA);
    const b = BigInt('0x' + hashB);
    let xor = a ^ b;
    let distance = 0;
    while (xor > 0n) {
      if ((xor & 1n) === 1n) {
        distance++;
      }
      xor >>= 1n;
    }
    return distance;
  } catch {
    return 64;
  }
}

/**
 * SimHash similarity score from 0.0 to 1.0 (1.0 = identical).
 */
export function simhashSimilarity(hashA: string, hashB: string): number {
  const dist = simhashHammingDistance(hashA, hashB);
  return Math.max(0, (64 - dist) / 64);
}
