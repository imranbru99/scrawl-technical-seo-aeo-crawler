import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

/**
 * Checks if an IPv4 address is in private, loopback, link-local or reserved ranges.
 */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // invalid IP treated as unsafe
  }

  const [p0, p1] = parts;

  // 0.0.0.0/8
  if (p0 === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;
  // 10.0.0.0/8 (Private)
  if (p0 === 10) return true;
  // 172.16.0.0/12 (Private: 172.16.x.x - 172.31.x.x)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (p0 === 192 && p1 === 168) return true;
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Metadata: 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;
  // 100.64.0.0/10 (Carrier NAT)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
  // Multicast / Broadcast / Reserved (>= 224)
  if (p0 >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in private, loopback or link-local ranges.
 */
function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // Loopback
  if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
  // Unspecified
  if (lower === '::' || lower === '0:0:0:0:0:0:0:0') return true;
  // Unique local fc00::/7 (fc.. or fd..)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  // IPv4-mapped IPv6 ::ffff:192.0.2.128
  if (lower.startsWith('::ffff:')) {
    const embeddedIpv4 = lower.substring(7);
    if (isIP(embeddedIpv4) === 4) {
      return isPrivateIpv4(embeddedIpv4);
    }
  }

  return false;
}

/**
 * Checks whether an IP address is private, loopback, link-local, or cloud metadata.
 */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return isPrivateIpv4(ip);
  }
  if (version === 6) {
    return isPrivateIpv6(ip);
  }
  return true; // Unknown is treated as dangerous
}

export interface SecurityCheckResult {
  isSafe: boolean;
  ip?: string;
  reason?: string;
}

/**
 * Validates a hostname or IP for SSRF vulnerabilities.
 * If allowPrivate is false, resolves host to IP and rejects private/loopback/cloud metadata ranges.
 */
export async function validateHostSecurity(hostname: string, allowPrivate = false): Promise<SecurityCheckResult> {
  if (allowPrivate) {
    return { isSafe: true };
  }

  const cleanHost = hostname.trim().replace(/^\[|\]$/g, '');

  // Directly an IP?
  const ipType = isIP(cleanHost);
  if (ipType !== 0) {
    if (isPrivateIp(cleanHost)) {
      return { isSafe: false, ip: cleanHost, reason: `Private/loopback IP address (${cleanHost}) is forbidden` };
    }
    return { isSafe: true, ip: cleanHost };
  }

  // Localhost aliases
  const lower = cleanHost.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local') || lower.endsWith('.internal')) {
    return { isSafe: false, reason: `Localhost or internal domain name (${cleanHost}) is forbidden` };
  }

  try {
    const res = await lookup(cleanHost, { all: true });
    for (const record of res) {
      if (isPrivateIp(record.address)) {
        return {
          isSafe: false,
          ip: record.address,
          reason: `Hostname ${cleanHost} resolved to private/forbidden IP ${record.address}`,
        };
      }
    }
    return { isSafe: true, ip: res[0]?.address };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { isSafe: false, reason: `DNS lookup failed for ${cleanHost}: ${message}` };
  }
}
