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

// ===== SECURITY: API Key Validation =====
if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.error('Please create a .env file with your OpenAI API key');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.warn('⚠️  OpenAI API key format looks incorrect (should start with sk-)');
}

// Use PORT env var or default to 3000
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0'; // Explicitly bind to Docker interface
// Prefer PUBLIC_URL, then construct from Railway var, then localhost
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const publicUrl = process.env.PUBLIC_URL || (railwayDomain ? `https://${railwayDomain}` : `http://localhost:${port}`);

// ===== SECURITY: CORS Whitelist =====
const ALLOWED_ORIGINS = [
    'https://chat.openai.com',
    'https://chatgpt.com',
    publicUrl
];

const TOOLS: Tool[] = [
    {
        name: 'compress_conversation',
        description: 'ALWAYS use this tool when the conversation exceeds 15 messages OR when the user asks to compress, summarize, extract decisions, or preserve context. Extracts goals, decisions, constraints, open questions, and key facts from conversation history into a structured, compressed format. Essential for maintaining context in long conversations.',
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

// ===== Session Management with Timeout Cleanup =====
type SessionRecord = {
    server: Server;
    transport: SSEServerTransport;
    lastActivity: number;
};
const sessions = new Map<string, SessionRecord>();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Session cleanup interval
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions) {
        if (now - session.lastActivity > SESSION_TIMEOUT) {
            console.log('[Cleanup] Removing stale session:', sessionId);
            session.server.close().catch(console.error);
            sessions.delete(sessionId);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes

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
                resources: {},  // Enable resources capability for widget
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

        const data = compressionResult.data;

        // Safety check
        if (!data) {
            return {
                content: [{
                    type: 'text',
                    text: '⚠️ Compression succeeded but no data was returned.'
                }]
            };
        }

        // Create beautiful formatted text output
        let formattedOutput = `✨ **Conversation Compressed Successfully**\n\n`;
        formattedOutput += `📊 **Stats:** ${optimizationResult.originalCount} → ${optimizationResult.optimizedCount} messages (${optimizationResult.tokensEstimate.savedPercent}% tokens saved)\n\n`;
        formattedOutput += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Summary
        formattedOutput += `📝 **Summary**\n${data.summary}\n\n`;

        // Goals
        if (data.goal && data.goal.length > 0) {
            formattedOutput += `🎯 **Goals**\n`;
            data.goal.forEach((item: string, i: number) => {
                formattedOutput += `${i + 1}. ${item}\n`;
            });
            formattedOutput += `\n`;
        }

        // Key Decisions
        if (data.decisions && data.decisions.length > 0) {
            formattedOutput += `✅ **Key Decisions**\n`;
            data.decisions.forEach((item: string, i: number) => {
                formattedOutput += `${i + 1}. ${item}\n`;
            });
            formattedOutput += `\n`;
        }

        // Constraints
        if (data.constraints && data.constraints.length > 0) {
            formattedOutput += `⚠️ **Constraints**\n`;
            data.constraints.forEach((item: string, i: number) => {
                formattedOutput += `${i + 1}. ${item}\n`;
            });
            formattedOutput += `\n`;
        }

        // Open Questions
        if (data.open_questions && data.open_questions.length > 0) {
            formattedOutput += `❓ **Open Questions**\n`;
            data.open_questions.forEach((item: string, i: number) => {
                formattedOutput += `${i + 1}. ${item}\n`;
            });
            formattedOutput += `\n`;
        }

        // Key Facts
        if (data.key_facts && data.key_facts.length > 0) {
            formattedOutput += `💡 **Key Facts**\n`;
            data.key_facts.forEach((item: string, i: number) => {
                formattedOutput += `${i + 1}. ${item}\n`;
            });
        }

        return {
            content: [{
                type: 'text',
                text: formattedOutput
            }]
        };
    });

    return server;
}

// SSE and POST paths
const ssePath = '/mcp';
const postPath = '/mcp/messages';

async function handleSseRequest(req: IncomingMessage, res: ServerResponse) {
    // ===== SECURITY: CORS Whitelist =====
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    console.log('[SSE] New connection request from:', origin);

    const server = createMcpServer();
    const transport = new SSEServerTransport(postPath, res);
    const sessionId = transport.sessionId;

    console.log('[SSE] Created session:', sessionId);
    sessions.set(sessionId, { server, transport, lastActivity: Date.now() });

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
    // ===== SECURITY: CORS Whitelist =====
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
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

    // Update session activity
    session.lastActivity = Date.now();

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
                // OpenAI Domain Verification
                if (req.method === 'GET' && url.pathname === '/.well-known/openai-apps-challenge') {
                    const verificationToken = 'oUXPM8bm8bX-lniFLgkOdBwQhd3xlM6FsvCFsjr2w9k';
                    res.writeHead(200, {
                        'Content-Type': 'text/plain',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'no-cache'
                    });
                    res.end(verificationToken);
                    return;
                }

                // SSE endpoint
                if (req.method === 'GET' && url.pathname === ssePath) {
                    await handleSseRequest(req, res);
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

// ===== SECURITY: Request Timeout =====
httpServer.setTimeout(30000); // 30 second timeout

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
