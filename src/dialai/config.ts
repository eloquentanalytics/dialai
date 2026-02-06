/**
 * Configuration for DIAL proxy mode
 */

export interface ProxyConfig {
  /** Forward all requests to remote MCP server at this URL */
  baseUrl: string | undefined;
  /** Port to expose HTTP endpoint (for acting as remote server) */
  port: number | undefined;
  /** Auth token (sent as Bearer token, validated on receive) */
  apiToken: string | undefined;
}

/**
 * Read proxy configuration from environment variables
 */
export function getConfig(): ProxyConfig {
  const portStr = process.env.DIALAI_PORT;
  const port = portStr ? parseInt(portStr, 10) : undefined;

  if (port !== undefined && (isNaN(port) || port < 1 || port > 65535)) {
    throw new Error(`Invalid DIALAI_PORT: ${portStr} (must be 1-65535)`);
  }

  return {
    baseUrl: process.env.DIALAI_BASE_URL,
    port,
    apiToken: process.env.DIALAI_API_TOKEN,
  };
}
