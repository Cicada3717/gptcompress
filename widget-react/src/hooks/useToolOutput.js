import { useState, useEffect } from 'react';

export function useToolOutput() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = () => {
            if (typeof window === 'undefined' || !window.openai) {
                console.log('[Widget] window.openai not available');
                return;
            }

            console.log('[Widget] Full window.openai:', JSON.stringify(window.openai, null, 2));

            // Try multiple sources in priority order
            let parsed = null;

            // 1. Try toolOutput (official way - but has known bug)
            if (window.openai.toolOutput) {
                const output = window.openai.toolOutput;
                parsed = output.structuredContent || output;
                console.log('[Widget] Got data from toolOutput:', parsed);
            }

            // 2. Try toolResponseMetadata (from _meta field)
            if (!parsed && window.openai.toolResponseMetadata) {
                parsed = window.openai.toolResponseMetadata;
                console.log('[Widget] Got data from toolResponseMetadata:', parsed);
            }

            // 3. Try widgetState (if we stored it)
            if (!parsed && window.openai.widgetState) {
                parsed = window.openai.widgetState;
                console.log('[Widget] Got data from widgetState:', parsed);
            }

            // 4. Try toolInput as last resort (contains the input messages)
            if (!parsed && window.openai.toolInput) {
                console.log('[Widget] toolInput available:', window.openai.toolInput);
                // toolInput contains the messages that were compressed
                // We can use this to show something meaningful
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
                console.log('[Widget] Data loaded successfully!');
            }
        };

        // Listen for the openai:set_globals event (documented workaround)
        const handleSetGlobals = (event) => {
            console.log('[Widget] Received openai:set_globals event:', event);
            fetchData();
        };

        window.addEventListener('openai:set_globals', handleSetGlobals);

        // Also try immediately and with retries
        fetchData();
        const timers = [100, 300, 600, 1000, 2000, 3000].map(ms =>
            setTimeout(fetchData, ms)
        );

        return () => {
            window.removeEventListener('openai:set_globals', handleSetGlobals);
            timers.forEach(clearTimeout);
        };
    }, []);

    return { data, loading };
}
