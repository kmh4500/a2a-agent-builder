import { NextRequest } from "next/server";

/**
 * Get the base URL from the request headers
 * Supports both HTTP and HTTPS protocols
 * Works with forwarded headers from proxies (Vercel, etc.)
 */
export function getBaseUrl(request: NextRequest): string {
  // Check for forwarded protocol and host (common in proxy/load balancer setups)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Fallback to standard host header
  const host = request.headers.get('host');
  if (host) {
    // Determine protocol based on host (localhost defaults to http, others to https)
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  // Final fallback (should rarely happen)
  return 'http://localhost:3001';
}
