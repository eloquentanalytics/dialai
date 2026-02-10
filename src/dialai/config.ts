/**
 * DIAL AI Configuration
 *
 * Environment variable handling for the dialai library.
 */

/**
 * Base URL for remote DIAL server (proxy mode).
 * When set, API calls are forwarded to this server.
 */
export const DIALAI_BASE_URL = process.env.DIALAI_BASE_URL ?? "";

/**
 * Port for HTTP server mode.
 * When set with --mcp flag, starts HTTP server instead of stdio.
 */
export const DIALAI_PORT = process.env.DIALAI_PORT
  ? parseInt(process.env.DIALAI_PORT, 10)
  : undefined;

/**
 * API token for authentication.
 * Used as Bearer token for HTTP server and proxy mode.
 */
export const DIALAI_API_TOKEN = process.env.DIALAI_API_TOKEN ?? "";

/**
 * Get configuration object with current environment values.
 */
export function getConfig(): {
  baseUrl: string;
  port: number | undefined;
  apiToken: string;
  isProxyMode: boolean;
  isHttpMode: boolean;
} {
  return {
    baseUrl: DIALAI_BASE_URL,
    port: DIALAI_PORT,
    apiToken: DIALAI_API_TOKEN,
    isProxyMode: DIALAI_BASE_URL.length > 0,
    isHttpMode: DIALAI_PORT !== undefined,
  };
}
