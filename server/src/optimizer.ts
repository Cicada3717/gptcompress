/**
 * Message Optimizer - Reduces token count before API calls
 * Strategy: Keep start (goals) + end (current state), filter middle noise
 */

interface Message {
  role: string;
  content: string;
}

export interface OptimizationResult {
  optimized: Message[];
  originalCount: number;
  optimizedCount: number;
  tokensEstimate: {
    original: number;
    optimized: number;
    savedPercent: number;
  };
}

/**
 * Estimates token count (rough approximation: 1 token ≈ 4 chars)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Checks if a message is "noise" (very short, low information)
 */
function isNoiseMessage(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  
  // Very short messages
  if (trimmed.length < 20) return true;
  
  // Common filler phrases
  const fillerPatterns = [
    /^(ok|okay|yes|no|thanks|thank you|sure|got it|understood)\.?$/,
    /^👍|👌|✅|❌$/,
    /^(lol|haha|hmm)$/
  ];
  
  return fillerPatterns.some(pattern => pattern.test(trimmed));
}

/**
 * Optimizes message array to reduce token usage
 */
export function optimizeMessages(messages: Message[]): OptimizationResult {
  const originalCount = messages.length;
  
  // Calculate original tokens
  const originalTokens = messages.reduce((sum, msg) => 
    sum + estimateTokens(msg.content), 0
  );
  
  // If conversation is short, don't optimize
  if (messages.length <= 30) {
    return {
      optimized: messages,
      originalCount,
      optimizedCount: messages.length,
      tokensEstimate: {
        original: originalTokens,
        optimized: originalTokens,
        savedPercent: 0
      }
    };
  }
  
  // Strategy: Head + Tail + Filtered Middle
  const HEAD_SIZE = 10;  // Keep first 10 (capture goals)
  const TAIL_SIZE = 20;  // Keep last 20 (current context)
  
  const head = messages.slice(0, HEAD_SIZE);
  const tail = messages.slice(-TAIL_SIZE);
  
  // Middle section: filter out noise
  const middleStart = HEAD_SIZE;
  const middleEnd = messages.length - TAIL_SIZE;
  const middle = messages.slice(middleStart, middleEnd);
  
  const filteredMiddle = middle.filter(msg => !isNoiseMessage(msg.content));
  
  // Combine: head + filtered middle + tail
  const optimized = [...head, ...filteredMiddle, ...tail];
  
  // Remove duplicates if any (edge case where head/tail overlap)
  const uniqueOptimized = Array.from(new Set(optimized));
  
  // Calculate optimized tokens
  const optimizedTokens = uniqueOptimized.reduce((sum, msg) => 
    sum + estimateTokens(msg.content), 0
  );
  
  const savedPercent = Math.round(
    ((originalTokens - optimizedTokens) / originalTokens) * 100
  );
  
  return {
    optimized: uniqueOptimized,
    originalCount,
    optimizedCount: uniqueOptimized.length,
    tokensEstimate: {
      original: originalTokens,
      optimized: optimizedTokens,
      savedPercent
    }
  };
}
