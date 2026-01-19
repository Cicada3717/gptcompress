import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolRequest,
    Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CompressedContext } from './types.js';
import { optimizeMessages } from './optimizer.js';
import { compressConversation } from './compressor.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Use PORT env var or default to 3000
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0'; // Explicitly bind to Docker interface
// Prefer PUBLIC_URL, then construct from Railway var, then localhost
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const publicUrl = process.env.PUBLIC_URL || (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`);

// Define tools
const TOOLS: Tool[] = [
    {
        name: 'compress_conversation',
        description: 'Extract key context from long conversations',
        inputSchema: {
            type: 'object',
            properties: {
                messages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            role: { type: 'string' },
                            content: { type: 'string' }
                        }
                    }
                }
            },
            required: ['messages']
        }
    }
];

// Session management
type SessionRecord = {
    server: Server;
    transport: SSEServerTransport;
};
const sessions = new Map<string, SessionRecord>();

// Factory function to create a server instance
function createMcpServer(): Server {
    const server = new Server(
        {
            name: 'gptcompress',
            version: '0.1.0',
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    const MessageSchema = z.object({
        role: z.string(),
        content: z.string()
    });

    const CompressionInputSchema = z.object({
        messages: z.array(MessageSchema)
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
        if (request.params.name !== 'compress_conversation') {
            throw new Error(`Unknown tool: ${request.params.name}`);
        }

        const args = CompressionInputSchema.parse(request.params.arguments);
        const messageCount = args.messages.length;

        console.log(`[MCP] Received compression request for ${messageCount} messages`);

        const optimizationResult = optimizeMessages(args.messages);
        console.log(`[MCP] Optimization: ${optimizationResult.originalCount} \u2192 ${optimizationResult.optimizedCount} messages`);
        console.log(`[MCP] Token savings: ${optimizationResult.tokensEstimate.savedPercent}%`);

        const compressionResult = await compressConversation(optimizationResult.optimized);

        if (!compressionResult.success) {
            return {
                content: [{
                    type: 'text',
                    text: `\u274C Compression failed: ${compressionResult.error}`
                }],
                isError: true
            };
        }

        console.log(`[MCP] Compression complete. Used ${compressionResult.tokensUsed} tokens`);

        return {
            content: [{
                type: 'text',
                text: `\u2705 Compressed ${messageCount} messages (saved ${optimizationResult.tokensEstimate.savedPercent}% tokens)`
            }],
            structuredContent: compressionResult.data,
            _meta: {
                'openai/outputTemplate': `${publicUrl}/widget`,
            }
        };
    });

    return server;
}

// SSE and POST paths
const ssePath = '/mcp';
const postPath = '/mcp/messages';

async function handleSseRequest(res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('[SSE] New connection request');

    const server = createMcpServer();
    const transport = new SSEServerTransport(postPath, res);
    const sessionId = transport.sessionId;

    console.log('[SSE] Created session:', sessionId);
    sessions.set(sessionId, { server, transport });

    transport.onclose = async () => {
        console.log('[SSE] Session closed:', sessionId);
        sessions.delete(sessionId);
        await server.close();
    };

    transport.onerror = (error) => {
        console.error('[SSE] Transport error:', error);
    };

    try {
        await server.connect(transport);
        console.log('[SSE] Server connected for session:', sessionId);
    } catch (error) {
        sessions.delete(sessionId);
        console.error('[SSE] Failed to start session:', error);
        if (!res.headersSent) {
            res.writeHead(500).end('Failed to establish SSE connection');
        }
    }
}

async function handlePostMessage(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');

    const sessionId = url.searchParams.get('sessionId');

    console.log('[POST] Session ID:', sessionId);
    console.log('[POST] Active sessions:', Array.from(sessions.keys()));

    if (!sessionId) {
        console.error('[POST] Missing sessionId');
        res.writeHead(400).end('Missing sessionId query parameter');
        return;
    }

    const session = sessions.get(sessionId);
    if (!session) {
        console.error('[POST] Session not found:', sessionId);
        res.writeHead(404).end('Unknown session');
        return;
    }

    try {
        console.log('[POST] Handling message...');
        await session.transport.handlePostMessage(req, res);
        console.log('[POST] Message handled successfully');
    } catch (error) {
        console.error('[POST] Failed to process message:', error);
        if (!res.headersSent) {
            res.writeHead(500).end('Failed to process message');
        }
    }
}

// HTTP Server
const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
        console.log(`[REQUEST] ${req.method} ${req.url}`);

        const url = new URL(req.url!, `http://${req.headers.host ?? 'localhost'}`);

        // CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'content-type',
            });
            res.end();
            return;
        }

        // Health check endpoint
        if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'gptcompress', version: '0.1.0' }));
            return;
        }

        // Widget endpoint
        if (req.method === 'GET' && url.pathname === '/widget') {
            try {
                const widgetPath = join(__dirname, '..', '..', 'App', 'widget.html');
                const html = readFileSync(widgetPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } catch (error) {
                console.error(`Widget not found at path: ${join(__dirname, '..', '..', 'widget', 'premium.html')}`);
                res.writeHead(404).end('Widget not found');
            }
            return;
        }

        // Widget CSS
        if (req.method === 'GET' && url.pathname === '/widget/premium.css') {
            try {
                const cssPath = join(__dirname, '..', '..', 'widget', 'premium.css');
                const css = readFileSync(cssPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(css);
            } catch (error) {
                res.writeHead(404).end('CSS not found');
            }
            return;
        }

        // OpenAPI Spec
        if (req.method === 'GET' && url.pathname === '/openapi.yaml') {
            try {
                const specPath = join(__dirname, '..', '..', 'App', 'openapi.yaml');
                let spec = readFileSync(specPath, 'utf-8');
                // Dynamic replacement of URL
                spec = spec.replace(/<YOUR_RAILWAY_URL>/g, publicUrl);
                res.writeHead(200, { 'Content-Type': 'text/yaml' });
                res.end(spec);
            } catch (error) {
                res.writeHead(404).end('OpenAPI spec not found');
            }
            return;
        }

        // AI Plugin Manifest
        if (req.method === 'GET' && url.pathname === '/.well-known/ai-plugin.json') {
            try {
                const manifestPath = join(__dirname, '..', '..', 'App', '.well-known', 'ai-plugin.json');
                let manifest = readFileSync(manifestPath, 'utf-8');
                // Dynamic replacement of URL
                manifest = manifest.replace(/<YOUR_RAILWAY_URL>/g, publicUrl);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(manifest);
            } catch (error) {
                res.writeHead(404).end('Manifest not found');
            }
            return;
        }

        // Widget JavaScript (Legacy support or if needed)
        if (req.method === 'GET' && url.pathname === '/widget/premium.js') {
            try {
                const jsPath = join(__dirname, '..', '..', 'widget', 'premium.js');
                const js = readFileSync(jsPath, 'utf-8');
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(js);
            } catch (error) {
                res.writeHead(404).end('JavaScript not found');
            }
            return;
        }

        // SSE endpoint
        if (req.method === 'GET' && url.pathname === ssePath) {
            await handleSseRequest(res);
            return;
        }

        // POST messages endpoint - accept both /mcp and /mcp/messages
        if (req.method === 'POST' && (url.pathname === postPath || url.pathname === ssePath)) {
            await handlePostMessage(req, res, url);
            return;
        }

        // Default 404
        res.writeHead(404).end('Not Found');
    }
);

httpServer.on('clientError', (err: Error, socket) => {
    console.error('HTTP client error:', err);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

httpServer.listen(port, host, () => {
    console.log(`GPTCompress MCP Server running on ${host}:${port}`);
    console.log(`  ---------------------------------------------------`);
    console.log(`  Public URL Configured: ${publicUrl}`);
    console.log(`  Port: ${port}`);
    console.log(`  Host: ${host}`);
    console.log(`  OPENAI_API_KEY set: ${!!process.env.OPENAI_API_KEY}`);
    console.log(`  ---------------------------------------------------`);
    console.log(`  Widget Template URL:   ${publicUrl}/widget`);
    console.log(`  ---------------------------------------------------`);
    console.log(`  SSE endpoint: GET ${publicUrl}${ssePath}`);
    console.log(`  POST endpoint: POST ${publicUrl}${postPath}?sessionId=...`);
    console.log(`  Widget: GET ${publicUrl}/widget`);
});
