import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

function ipToNumber(address: string): number {
  return (
    address
      .split('.')
      .reduce((value, octet) => (value << 8) + Number(octet), 0) >>> 0
  );
}

const PRIVATE_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [ipToNumber('10.0.0.0'), ipToNumber('10.255.255.255')],
  [ipToNumber('100.64.0.0'), ipToNumber('100.127.255.255')],
  [ipToNumber('127.0.0.0'), ipToNumber('127.255.255.255')],
  [ipToNumber('169.254.0.0'), ipToNumber('169.254.255.255')],
  [ipToNumber('172.16.0.0'), ipToNumber('172.31.255.255')],
  [ipToNumber('192.168.0.0'), ipToNumber('192.168.255.255')],
];

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const numericAddress = ipToNumber(address);
    return PRIVATE_IPV4_RANGES.some(
      ([start, end]) => numericAddress >= start && numericAddress <= end
    );
  }
  const normalized = address.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  );
}

export async function assertTargetAllowed(target: URL): Promise<void> {
  const allowlist = new Set(
    (process.env.TARGET_HOST_ALLOWLIST ?? '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  );
  if (allowlist.has(target.hostname.toLowerCase())) {
    return;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS targets are supported');
  }
  const addresses = await lookup(target.hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Target resolves to a blocked private address');
  }
}
