/**
 * Compressor - GPT-4o-mini integration for conversation summarization
 */

import OpenAI from 'openai';
import { CompressedContext } from './types.js';

interface Message {
    role: string;
    content: string;
}

interface CompressionResult {
    success: boolean;
    data?: CompressedContext;
    error?: string;
    tokensUsed?: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for compression
 * Designed to extract structured information reliably
 */
const COMPRESSION_PROMPT = `You are a conversation compression expert. Your job is to extract key information from conversations and return it in a structured JSON format.

Analyze the conversation and extract:
1. **goal**: What is the user trying to accomplish? (array of strings, max 5 items)
2. **constraints**: What limitations or requirements were mentioned? (array, max 5)
3. **decisions**: What choices were made? (array, max 5)
4. **open_questions**: What questions remain unanswered? (array, max 5)
5. **key_facts**: Critical information to remember (array, max 5)
6. **summary**: One-paragraph overview of the conversation (string, max 150 words)

Rules:
- Be concise (10-80 characters per item)
- Focus on DECISIONS, not discussions
- Remove conversational filler
- Preserve technical details (file paths, function names, etc.)
- If a category has no items, return empty array

Return ONLY valid JSON matching this structure:
{
  "goal": ["item1", "item2"],
  "constraints": ["item1"],
  "decisions": ["item1", "item2"],
  "open_questions": ["item1"],
  "key_facts": ["item1"],
  "summary": "One paragraph summary."
}`;

/**
 * Converts message array to a readable format for GPT
 */
function formatMessagesForPrompt(messages: Message[]): string {
    return messages
        .map((msg, idx) => `[${idx + 1}] ${msg.role}: ${msg.content}`)
        .join('\n\n');
}

/**
 * Validates the compressed output structure
 */
function validateCompressedData(data: any): data is CompressedContext {
    return (
        typeof data === 'object' &&
        Array.isArray(data.goal) &&
        Array.isArray(data.constraints) &&
        Array.isArray(data.decisions) &&
        Array.isArray(data.open_questions) &&
        Array.isArray(data.key_facts) &&
        typeof data.summary === 'string'
    );
}

/**
 * Main compression function
 */
export async function compressConversation(
    messages: Message[]
): Promise<CompressionResult> {
    try {
        // Format conversation for the prompt
        const conversationText = formatMessagesForPrompt(messages);

        console.log(`[Compressor] Sending ${messages.length} messages to GPT-4o-mini`);

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: COMPRESSION_PROMPT },
                { role: 'user', content: `Compress this conversation:\n\n${conversationText}` }
            ],
            temperature: 0.3,  // Low temperature for consistency
            max_tokens: 1500,
            response_format: { type: 'json_object' }  // Force JSON output
        });

        const resultText = response.choices[0]?.message?.content;
        const tokensUsed = response.usage?.total_tokens || 0;

        if (!resultText) {
            return {
                success: false,
                error: 'Empty response from OpenAI'
            };
        }

        // Parse JSON response
        const parsedData = JSON.parse(resultText);

        // Validate structure
        if (!validateCompressedData(parsedData)) {
            console.error('[Compressor] Invalid data structure:', parsedData);
            return {
                success: false,
                error: 'Invalid compression output structure'
            };
        }

        console.log(`[Compressor] Success! Used ${tokensUsed} tokens`);

        return {
            success: true,
            data: parsedData,
            tokensUsed
        };

    } catch (error: any) {
        console.error('[Compressor] Error:', error);

        // Handle specific error types
        if (error.code === 'insufficient_quota') {
            return {
                success: false,
                error: 'OpenAI API quota exceeded. Please check your billing.'
            };
        }

        if (error.code === 'invalid_api_key') {
            return {
                success: false,
                error: 'Invalid OpenAI API key. Please check your .env file.'
            };
        }

        return {
            success: false,
            error: error.message || 'Unknown compression error'
        };
    }
}
