/**
 * MCP endpoint — Streamable HTTP transport (JSON-RPC 2.0 over a single POST),
 * responding with a plain JSON body rather than opening an SSE stream, since
 * these tools never need to push a message the client didn't ask for.
 *
 * See docs/mcp-server.md for the tool contract this implements.
 */

import { TOOLS, TOOLS_BY_NAME } from './tools.js';
import { ValidationError, NotFoundError } from './errors.js';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'meridian-risk', version: '1.0.0' };

const JSONRPC_PARSE_ERROR = -32700;
const JSONRPC_METHOD_NOT_FOUND = -32601;
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_INTERNAL_ERROR = -32603;

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleRequest(env, req) {
  const { method, params, id } = req;

  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions:
        'Read-only tools over the Meridian Risk operational risk database. Start with risk_summary for ' +
        '"how are we doing?", or list_reference to resolve a department/system/person name before filtering.',
    });
  }

  if (method === 'ping') return rpcResult(id, {});

  if (method === 'tools/list') {
    return rpcResult(id, {
      tools: TOOLS.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
      })),
    });
  }

  if (method === 'tools/call') {
    const name = params?.name;
    const tool = TOOLS_BY_NAME.get(name);
    if (!tool) return rpcError(id, JSONRPC_INVALID_PARAMS, `Unknown tool "${name}".`);
    try {
      const { structured, text } = await tool.handler(env, params?.arguments || {});
      return rpcResult(id, {
        content: [{ type: 'text', text }],
        structuredContent: structured,
        isError: false,
      });
    } catch (err) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        return rpcResult(id, { content: [{ type: 'text', text: err.message }], isError: true });
      }
      console.error(`tools/call ${name} failed:`, err);
      return rpcResult(id, { content: [{ type: 'text', text: 'Internal error executing tool.' }], isError: true });
    }
  }

  // Notifications and lifecycle methods this stateless server has nothing to do for.
  if (method === 'notifications/initialized' || method?.startsWith('notifications/')) {
    return undefined;
  }

  return rpcError(id, JSONRPC_METHOD_NOT_FOUND, `Unknown method "${method}".`);
}

export async function handleMcp(request, env) {
  if (request.method === 'GET' || request.method === 'DELETE') {
    return new Response('This MCP server is stateless and does not support server-initiated streams or sessions.', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(rpcError(null, JSONRPC_PARSE_ERROR, 'Invalid JSON.'), 200);
  }

  const isBatch = Array.isArray(body);
  const requests = isBatch ? body : [body];
  const responses = [];

  for (const req of requests) {
    if (!req || typeof req.method !== 'string') {
      responses.push(rpcError(req?.id, JSONRPC_INVALID_PARAMS, 'Malformed JSON-RPC request.'));
      continue;
    }
    try {
      const result = await handleRequest(env, req);
      if (result) responses.push(result);
    } catch (err) {
      console.error('MCP request failed:', err);
      responses.push(rpcError(req.id, JSONRPC_INTERNAL_ERROR, 'Internal error.'));
    }
  }

  if (responses.length === 0) return new Response(null, { status: 202 });
  return jsonResponse(isBatch ? responses : responses[0], 200);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
