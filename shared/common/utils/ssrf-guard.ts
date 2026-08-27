import { lookup } from 'dns/promises';
import { isIP } from 'net';

const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [ipToInt('0.0.0.0'), ipToInt('0.255.255.255')],
  [ipToInt('10.0.0.0'), ipToInt('10.255.255.255')],
  [ipToInt('100.64.0.0'), ipToInt('100.127.255.255')], // CGNAT
  [ipToInt('127.0.0.0'), ipToInt('127.255.255.255')],
  [ipToInt('169.254.0.0'), ipToInt('169.254.255.255')], // link-local / cloud metadata
  [ipToInt('172.16.0.0'), ipToInt('172.31.255.255')],
  [ipToInt('192.0.0.0'), ipToInt('192.0.0.255')],
  [ipToInt('192.168.0.0'), ipToInt('192.168.255.255')],
  [ipToInt('198.18.0.0'), ipToInt('198.19.255.255')],
  [ipToInt('224.0.0.0'), ipToInt('255.255.255.255')], // multicast/reserved
];

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([start, end]) => n >= start && n <= end);
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fe80:') || // link-local
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') || // unique local
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:192.168.')
  );
}

export class UnsafeUrlError extends Error {}

/**
 * Valida que una URL externa provista por el usuario sea http(s) y que resuelva
 * a una IP pública, para evitar SSRF hacia redes internas / metadata del cluster.
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('URL inválida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeUrlError('Solo se permiten URLs http/https.');
  }

  const hostname = parsed.hostname;
  if (hostname === 'localhost') {
    throw new UnsafeUrlError('No se permiten URLs locales.');
  }

  const ipVersion = isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    throw new UnsafeUrlError('No se permiten URLs de redes privadas.');
  }
  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    throw new UnsafeUrlError('No se permiten URLs de redes privadas.');
  }

  if (!ipVersion) {
    const resolved = await lookup(hostname, { all: true }).catch(() => {
      throw new UnsafeUrlError('No se pudo resolver el host.');
    });
    for (const { address, family } of resolved) {
      if (family === 4 && isPrivateIPv4(address)) {
        throw new UnsafeUrlError('El host resuelve a una red privada.');
      }
      if (family === 6 && isPrivateIPv6(address)) {
        throw new UnsafeUrlError('El host resuelve a una red privada.');
      }
    }
  }

  return parsed;
}
