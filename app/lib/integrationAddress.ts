export type ConnectionAddress = { protocol: 'http' | 'https'; host: string; port: number; path: string };
export function parseConnectionAddress(value: string): ConnectionAddress {
  try {
    const url = new URL(value);
    return { protocol: url.protocol === 'https:' ? 'https' : 'http', host: url.hostname.replace(/^\[|\]$/g, ''), port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), path: url.pathname };
  } catch {
    return { protocol: 'http', host: '', port: 1818, path: '/api/mcp/receive' };
  }
}
export function buildConnectionAddress(address: ConnectionAddress) {
  const host = address.host.trim().replace(/^\[|\]$/g, '');
  return `${address.protocol}://${host.includes(':') ? `[${host}]` : host}:${address.port}${address.path}`;
}
