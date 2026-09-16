/**
 * risk-mcp Worker — a second Worker alongside the static site's own
 * "demo-risk-system" Worker (see docs/mcp-server.md and
 * docs/implementation-plan.md#phase-3). It holds the D1 binding and serves
 * two things: a JSON API for the browser (/api/*) and the MCP endpoint
 * (/mcp). The static site calls it cross-origin, hence CORS below.
 *
 * This exists as a separate Worker with its own wrangler.toml specifically
 * so that the root wrangler.toml — owned by the deploy pipeline — never has
 * to change.
 */

import { handleApi } from './routes.js';
import { handleMcp } from './mcp.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
};

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === '/mcp') {
      return withCors(await handleMcp(request, env));
    }

    if (path.startsWith('/api/')) {
      return withCors(await handleApi(request, env, path));
    }

    if (path === '/' || path === '/health') {
      return withCors(new Response(JSON.stringify({ ok: true, service: 'risk-mcp' }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
};
