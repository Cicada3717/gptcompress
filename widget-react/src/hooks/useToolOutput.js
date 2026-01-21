import { useState, useEffect } from 'react';

export function useToolOutput() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = () => {
            console.log('[Widget] Checking for data...');
            console.log('[Widget] window.openai:', window.openai);

            if (typeof window !== 'undefined' && window.openai) {
                const toolOutput = window.openai.toolOutput;
                console.log('[Widget] Raw toolOutput:', toolOutput);

                if (toolOutput) {
                    let parsed = null;

                    // Try to get structuredContent first
                    if (toolOutput.structuredContent) {
                        parsed = toolOutput.structuredContent;
                        console.log('[Widget] From structuredContent:', parsed);
                    }
                    // If toolOutput is a string, try to parse it
                    else if (typeof toolOutput === 'string') {
                        try {
                            const jsonObj = JSON.parse(toolOutput);
                            parsed = jsonObj.structuredContent || jsonObj;
                            console.log('[Widget] Parsed from string:', parsed);
                        } catch (e) {
                            console.log('[Widget] Not JSON string');
                        }
                    }
                    // Direct object
                    else if (typeof toolOutput === 'object') {
                        parsed = toolOutput;
                        console.log('[Widget] Direct object:', parsed);
                    }

                    if (parsed && (parsed.summary || parsed.goal)) {
                        setData({
                            summary: parsed.summary || "Summary unavailable",
                            goal: parsed.goal || [],
                            decisions: parsed.decisions || [],
                            open_questions: parsed.open_questions || [],
                            constraints: parsed.constraints || [],
                            key_facts: parsed.key_facts || [],
                            stats: parsed.stats || "Compressed"
                        });
                        setLoading(false);
                        console.log('[Widget] Data set successfully!');
                    }
                }
            }
        };

        // Try immediately
        fetchData();

        // Retry a few times in case data loads late
        const intervals = [100, 500, 1000, 2000, 3000];
        const timers = intervals.map(ms => setTimeout(fetchData, ms));

        // Also listen for events
        if (typeof window !== 'undefined') {
            window.addEventListener('message', fetchData);
        }

        return () => {
            timers.forEach(clearTimeout);
            if (typeof window !== 'undefined') {
                window.removeEventListener('message', fetchData);
            }
        };
    }, []);

    return { data, loading };
}
