/**
 * Compressor - GPT-4o integration for conversation summarization
 * OPTIMIZED FOR OPENAI TESTING PHASE
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
 * System prompt for compression - OPTIMIZED FOR QUALITY
 * Designed to extract structured information reliably
 */
const COMPRESSION_PROMPT = `You are GPTCompress, an expert conversation compression tool. Extract key information and return structured JSON.

Extract from the conversation:
1. **goal**: User's objectives (array, 3-7 items, be specific)
2. **constraints**: Limitations, requirements, rules mentioned (array, 3-7 items)
3. **decisions**: Choices made, solutions agreed upon (array, 3-7 items)
4. **open_questions**: Unresolved questions, pending items (array, 2-5 items)
5. **key_facts**: Critical technical details, names, numbers, paths (array, 3-7 items)
6. **summary**: Comprehensive overview of the conversation (string, 100-200 words)

Quality Rules:
- Be thorough - capture ALL important information
- Be specific - include exact names, numbers, file paths, technical terms
- Focus on DECISIONS and OUTCOMES, not just discussion
- Preserve context that would be needed to continue the conversation
- Each item should be self-contained and understandable independently

Return ONLY valid JSON:
{
  "goal": ["specific goal 1", "specific goal 2"],
  "constraints": ["constraint 1"],
  "decisions": ["decision 1", "decision 2"],
  "open_questions": ["question 1"],
  "key_facts": ["fact 1", "fact 2"],
  "summary": "Comprehensive paragraph summary."
}`;

/**
 * Converts message array to a readable format for GPT
 */
function formatMessagesForPrompt(messages: Message[]): string {
    return messages
        .map((msg, idx) => `[${idx + 1}] ${msg.role.toUpperCase()}: ${msg.content}`)
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
 * Main compression function - USING GPT-4O FOR BEST QUALITY
 */
export async function compressConversation(
    messages: Message[]
): Promise<CompressionResult> {
    try {
        // Format conversation for the prompt
        const conversationText = formatMessagesForPrompt(messages);

        console.log(`[Compressor] Sending ${messages.length} messages to GPT-4o`);
        const startTime = Date.now();

        // Call OpenAI API with GPT-4o for best results
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',  // BEST MODEL for testing phase
            messages: [
                { role: 'system', content: COMPRESSION_PROMPT },
                { role: 'user', content: `Compress this conversation thoroughly:\n\n${conversationText}` }
            ],
            temperature: 0.2,  // Lower for more consistent output
            max_tokens: 2000,  // More tokens for comprehensive output
            response_format: { type: 'json_object' }  // Force JSON output
        });

        const elapsed = Date.now() - startTime;
        const resultText = response.choices[0]?.message?.content;
        const tokensUsed = response.usage?.total_tokens || 0;

        console.log(`[Compressor] Response in ${elapsed}ms, used ${tokensUsed} tokens`);

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

        console.log(`[Compressor] Success! Extracted ${parsedData.goal.length} goals, ${parsedData.decisions.length} decisions`);

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
