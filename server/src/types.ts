export interface CompressedContext {
    goal: string[];
    constraints: string[];
    decisions: string[];
    open_questions: string[];
    key_facts: string[];
    summary: string;
}

export interface McpToolInput {
    messages: Array<{
        role: string;
        content: string;
    }>;
}
