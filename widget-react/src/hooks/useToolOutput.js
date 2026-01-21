import { useState, useEffect } from 'react';

export function useToolOutput() {
    const [data, setData] = useState({
        summary: "Loading conversation analysis...",
        goal: [],
        decisions: [],
        open_questions: [],
        constraints: [],
        key_facts: [],
        stats: "Processing..."
    });

    useEffect(() => {
        const fetchData = () => {
            if (typeof window !== 'undefined' && window.openai?.toolOutput) {
                const output = window.openai.toolOutput;
                console.log('[Widget] Received toolOutput:', output);

                // Access structuredContent from MCP response
                const structured = output.structuredContent || output;
                console.log('[Widget] Using data:', structured);

                setData({
                    summary: structured.summary || "No summary available",
                    goal: structured.goal || [],
                    decisions: structured.decisions || [],
                    open_questions: structured.open_questions || [],
                    constraints: structured.constraints || [],
                    key_facts: structured.key_facts || [],
                    stats: structured.stats || "Stats unavailable"
                });
            }
        };

        fetchData();

        // Listen for data updates
        if (typeof window !== 'undefined') {
            window.addEventListener('openai:data-update', fetchData);
            return () => window.removeEventListener('openai:data-update', fetchData);
        }
    }, []);

    return data;
}
