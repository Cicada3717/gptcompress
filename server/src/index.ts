import 'dotenv/config';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    CallToolRequest,
    Tool,
    ListResourcesRequestSchema,
    ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CompressedContext } from './types.js';
import { optimizeMessages } from './optimizer.js';
import { compressConversation } from './compressor.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIDGET_HTML } from './widget.js';

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
        name: 'GPTCompress',
        description: `**Conversation Compression Tool**

Compresses long ChatGPT conversations while extracting structured insights.

⚠️ DISPLAY INSTRUCTION FOR MODEL:
Display the COMPLETE tool output to the user WITHOUT modification.
Do NOT add your own summary or explanation.
The tool returns pre-formatted content - show it verbatim.

**When to use:**
- User says: "compress this", "@gptcompress", "compress conversation"
- Conversation exceeds 50 messages
- User needs structured summary

**Output format:**
Returns markdown with 6 categories:
1. Summary (2-3 sentences)
2. Goals (actionable objectives)
3. Decisions Made (confirmed choices)
4. Open Questions (unresolved items)
5. Constraints (limitations noted)
6. Key Facts (important context)
Plus compression metrics

**IMPORTANT:** Show the entire formatted output as-is.`,
        // @ts-ignore - _meta is standard for OpenAI Apps
        _meta: {
            "openai/outputTemplate": "ui://compress/result.html",
            "openai/toolInvocation/invoking": "Compressing...",
            "openai/toolInvocation/invoked": "Compression complete"
        },
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
        },
        // @ts-ignore - annotations recommended by OpenAI Apps guide
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    } as any
];

// ... (existing code)




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

    // Resource Handlers for UI Widget
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [{
            uri: "ui://compress/result.html",
            name: "Compression Widget",
            mimeType: "text/html+skybridge"
        }]
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        if (request.params.uri === "ui://compress/result.html") {
            return {
                contents: [{
                    uri: "ui://compress/result.html",
                    mimeType: "text/html+skybridge",
                    text: WIDGET_HTML,
                    _meta: {
                        "openai/widgetPrefersBorder": false,
                        "openai/widgetDomain": process.env.RAILWAY_PUBLIC_DOMAIN || "gptcompress-production.up.railway.app",
                        "openai/widgetContentSecurityPolicy": "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
                    }
                }]
            };
        }
        throw new Error(`Resource not found: ${request.params.uri}`);
    });

    server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
        const toolName = request.params.name;

        // Accept both current name and legacy name as alias
        if (toolName !== 'GPTCompress' && toolName !== 'compress_conversation') {
            throw new Error(`Unknown tool: ${toolName} `);
        }

        console.log(`[MCP] Tool called: ${toolName} `);

        const args = CompressionInputSchema.parse(request.params.arguments);
        const messageCount = args.messages.length;

        console.log(`[MCP] Received compression request for ${messageCount} messages`);

        // VALIDATION: Strict message limits
        if (messageCount < 5) {
            return {
                content: [{
                    type: 'text',
                    text: "⚠️ **Conversation too short:** Please provide at least 5 messages for compression. For shorter chats, just ask ChatGPT to summarize directly."
                }],
                isError: true
            };
        }
        if (messageCount > 500) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ **Conversation too long:** Maximum limit is 500 messages (you provided ${messageCount}). Please shorten the conversation.`
                }],
                isError: true
            };
        }

        const optimizationResult = optimizeMessages(args.messages);
        console.log(`[MCP] Optimization: ${optimizationResult.originalCount} \u2192 ${optimizationResult.optimizedCount} messages`);
        console.log(`[MCP] Token savings: ${optimizationResult.tokensEstimate.savedPercent}% `);

        const compressionResult = await compressConversation(optimizationResult.optimized);

        if (!compressionResult.success) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Compression failed: ${compressionResult.error} `
                }],
                isError: true
            };
        }

        console.log(`[MCP] Compression complete.Used ${compressionResult.tokensUsed} tokens`);

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

        // Create beautiful formatted text output with clear branding
        // Create clean Markdown output for direct display
        // Professional Report Format
        const reportOutput = `
# 📊 Conversation Analysis Report

## Executive Summary
${data.summary}

---

## Strategic Insights

### 🎯 Primary Goals & Objectives
${data.goal.length > 0 ? data.goal.map((g, i) => `${i + 1}. ${g}`).join('\n') : '*No specific goals identified.*'}

### ✅ Decisions Made & Actions Confirmed
${data.decisions.length > 0 ? data.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n') : '*No formal decisions recorded.*'}

### ❓ Open Questions Requiring Resolution
${data.open_questions.length > 0 ? data.open_questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '*All questions resolved.*'}

### 🔒 Constraints & Limitations Noted
${data.constraints.length > 0 ? data.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n') : '*No constraints identified.*'}

### 📌 Key Facts & Reference Points
${data.key_facts.length > 0 ? data.key_facts.map((f, i) => `${i + 1}. ${f}`).join('\n') : '*No key facts extracted.*'}

---

## Compression Performance

| Metric | Value | Details |
|--------|-------|---------|
| **Original Conversation** | ${optimizationResult.originalCount} msgs | Full context |
| **Compressed Output** | ${optimizationResult.optimizedCount} msgs | Optimized context |
| **Token Usage** | ${compressionResult.tokensUsed} | Total tokens required |
| **Efficiency Estimate** | ${optimizationResult.tokensEstimate.savedPercent}% | Estimated savings |

---

*Generated by GPTCompress using customized definition*
`.trim();

        return {
            content: [{
                type: 'text',
                text: reportOutput
            }],
            _meta: {
                "openai/outputTemplate": "ui://compress/result.html",
                "openai/toolInvocation/invoked": "Compression complete. Full analysis below:",
                "openai/presentationMode": "structured"
            },
            // Dual-mode output for visibility + machine readability
            structuredContent: {
                summary: data.summary,
                goal: data.goal,
                decisions: data.decisions,
                open_questions: data.open_questions,
                constraints: data.constraints,
                key_facts: data.key_facts,
                stats: `${optimizationResult.originalCount} → ${optimizationResult.optimizedCount} messages`
            }
        } as any; // Cast to allow structuredContent
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
        await transport.onerror?.(error as Error);
    }
}

// Handle stateless POST requests (no SSE session required)
async function handleStatelessToolCall(req: IncomingMessage, res: ServerResponse) {
    // Set CORS headers
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Content-Type', 'application/json');

    try {
        // Read request body
        const body = await new Promise<string>((resolve, reject) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => resolve(data));
            req.on('error', reject);
        });

        const jsonRpcRequest = JSON.parse(body);
        console.log('[Stateless] Received JSON-RPC request:', jsonRpcRequest.method);

        // Handle initialize
        if (jsonRpcRequest.method === 'initialize') {
            res.writeHead(200);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: jsonRpcRequest.id,
                result: {
                    protocolVersion: '2024-11-05',
                    serverInfo: {
                        name: 'gptcompress',
                        version: '0.1.0'
                    },
                    capabilities: {
                        tools: {},
                        resources: {}
                    }
                }
            }));
            return;
        }

        // Handle tools/list
        if (jsonRpcRequest.method === 'tools/list') {
            res.writeHead(200);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: jsonRpcRequest.id,
                result: { tools: TOOLS }
            }));
            return;
        }

        // Handle resources/list
        if (jsonRpcRequest.method === 'resources/list') {
            res.writeHead(200);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: jsonRpcRequest.id,
                result: {
                    resources: [{
                        uri: "ui://compress/result.html",
                        name: "Compression Widget",
                        mimeType: "text/html+skybridge"
                    }]
                }
            }));
            return;
        }

        // Handle resources/read
        if (jsonRpcRequest.method === 'resources/read') {
            const uri = jsonRpcRequest.params?.uri;
            if (uri === "ui://compress/result.html") {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id || null,
                    result: {
                        contents: [{
                            uri: "ui://compress/result.html",
                            mimeType: "text/html+skybridge",
                            text: WIDGET_HTML,
                            _meta: {
                                "openai/widgetPrefersBorder": false,
                                "openai/widgetDomain": process.env.RAILWAY_PUBLIC_DOMAIN || "gptcompress-production.up.railway.app",
                                "openai/widgetContentSecurityPolicy": "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
                            }
                        }]
                    }
                }));
            } else {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    error: {
                        code: -32602,
                        message: `Resource not found: ${uri}`
                    }
                }));
            }
            return;
        }

        // Handle tools/call
        if (jsonRpcRequest.method === 'tools/call') {
            const toolName = jsonRpcRequest.params?.name;

            // Accept both tool names as aliases
            if (toolName !== 'GPTCompress' && toolName !== 'compress_conversation') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    error: {
                        code: -32601,
                        message: `Unknown tool: ${toolName} `
                    }
                }));
                return;
            }

            console.log(`[Stateless] Tool called: ${toolName} `);

            // Validate and parse arguments
            const MessageSchema = z.object({
                role: z.string(),
                content: z.string()
            });
            const CompressionInputSchema = z.object({
                messages: z.array(MessageSchema)
            });

            const args = CompressionInputSchema.parse(jsonRpcRequest.params.arguments);
            const messageCount = args.messages.length;

            console.log(`[Stateless] Compression request for ${messageCount} messages`);

            // VALIDATION: Strict message limits
            if (messageCount < 5) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    result: {
                        content: [{
                            type: 'text',
                            text: "⚠️ **Conversation too short:** Please provide at least 5 messages for compression.",
                        }],
                        isError: true
                    }
                }));
                return;
            }
            if (messageCount > 500) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    result: {
                        content: [{
                            type: 'text',
                            text: `❌ **Conversation too long:** Maximum limit is 500 messages (you provided ${messageCount}).`,
                        }],
                        isError: true
                    }
                }));
                return;
            }

            // Execute compression
            const optimizationResult = optimizeMessages(args.messages);
            console.log(`[Stateless] Optimization: ${optimizationResult.originalCount} → ${optimizationResult.optimizedCount} messages`);

            const compressionResult = await compressConversation(optimizationResult.optimized);

            if (!compressionResult.success) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: jsonRpcRequest.id,
                    result: {
                        content: [{
                            type: 'text',
                            text: `❌ Compression failed: ${compressionResult.error} `
                        }],
                        isError: true
                    }
                }));
                return;
            }

            // Format successful response (Markdown)
            const data = compressionResult.data!;  // Non-null since success=true
            // Hybrid Response Format (Concise Text + Rich Structure)
            // Professional Report Format (Tables + Headers)
            const reportOutput = `
# 📊 Conversation Analysis Report

## Executive Summary
${data.summary}

---

## Strategic Insights

### 🎯 Primary Goals & Objectives
${data.goal.length > 0 ? data.goal.map((g, i) => `${i + 1}. ${g}`).join('\n') : '*No specific goals identified.*'}

### ✅ Decisions Made & Actions Confirmed
${data.decisions.length > 0 ? data.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n') : '*No formal decisions recorded.*'}

### ❓ Open Questions Requiring Resolution
${data.open_questions.length > 0 ? data.open_questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '*All questions resolved.*'}

### 🔒 Constraints & Limitations Noted
${data.constraints.length > 0 ? data.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n') : '*No constraints identified.*'}

### 📌 Key Facts & Reference Points
${data.key_facts.length > 0 ? data.key_facts.map((f, i) => `${i + 1}. ${f}`).join('\n') : '*No key facts extracted.*'}

---

## Compression Performance

| Metric | Value | Details |
|--------|-------|---------|
| **Original Conversation** | ${optimizationResult.originalCount} msgs | Full context |
| **Compressed Output** | ${optimizationResult.optimizedCount} msgs | Optimized context |
| **Token Usage** | ${compressionResult.tokensUsed} | Total tokens required |
| **Efficiency Estimate** | ${optimizationResult.tokensEstimate.savedPercent}% | Estimated savings |

---

*Generated by GPTCompress using customized definition*
`.trim();

            res.writeHead(200);
            res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: jsonRpcRequest.id,
                result: {
                    content: [{
                        type: 'text',
                        text: reportOutput
                    }],
                    _meta: {
                        "openai/toolInvocation/invoked": "Compression complete. Full analysis below:",
                        "openai/presentationMode": "structured"
                    },
                    structuredContent: {
                        summary: data.summary,
                        goal: data.goal,
                        decisions: data.decisions,
                        open_questions: data.open_questions,
                        constraints: data.constraints,
                        key_facts: data.key_facts,
                        stats: `${optimizationResult.originalCount} → ${optimizationResult.optimizedCount} messages`
                    }
                }
            }));
            console.log('[Stateless] Response sent successfully');
            return;
        }

        // Unknown method
        res.writeHead(200);
        res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: jsonRpcRequest.id,
            error: {
                code: -32601,
                message: `Method not found: ${jsonRpcRequest.method} `
            }
        }));

    } catch (error) {
        console.error('[Stateless] Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32603,
                message: String(error)
            }
        }));
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

    // Route to stateless handler if no sessionId
    if (!sessionId) {
        console.log('[POST] No sessionId - routing to stateless handler');
        return handleStatelessToolCall(req, res);
    }

    const session = sessions.get(sessionId);

    if (!session) {
        console.error('[POST] Session not found:', sessionId);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'Session not found',
            message: 'Please establish SSE connection first',
            retryable: false
        }));
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
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Failed to process message',
                message: String(error),
                retryable: true
            }));
        }
    }
}

// HTTP Server
const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
        console.log(`[REQUEST] ${req.method} ${req.url} `);

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

        // OpenAI Domain Verification
        if (req.method === 'GET' && url.pathname === '/.well-known/openai-apps-challenge') {
            const verificationToken = 'oUXPM8bm8bX-IniFLgkOdBwQhd3xlM6FsvCFsjr2w9k';
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
httpServer.setTimeout(120000); // 120 second timeout (increased from 30s to allow for AI processing)

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
