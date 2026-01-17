// Premium Widget - JavaScript
// Handles data rendering, copy functionality, and chat integration

// Global data store
let compressedData = null;

/**
 * Initialize widget on load
 */
window.addEventListener('DOMContentLoaded', () => {
    // Try to get data from window.openai (ChatGPT context)
    if (window.openai && window.openai.toolOutput) {
        compressedData = window.openai.toolOutput;
        renderWidget(compressedData);
    } else {
        // Fallback: Use mock data for testing
        loadMockData();
    }

    // Set up event listeners
    document.getElementById('copy-btn').addEventListener('click', copyContext);
    document.getElementById('new-chat-btn').addEventListener('click', startNewChat);
});

/**
 * Render widget with compressed data
 */
function renderWidget(data) {
    // Update compression stats
    const stats = document.getElementById('compression-stats');
    if (data._meta && data._meta.originalCount && data._meta.optimizedCount) {
        stats.textContent = `${data._meta.originalCount} → ${data._meta.optimizedCount} messages`;
    }

    // Render hero summary
    document.getElementById('summary').textContent = data.summary || 'No summary available';

    // Render sections
    renderSection('goals', data.goal);
    renderSection('decisions', data.decisions);
    renderSection('constraints', data.constraints);
    renderSection('questions', data.open_questions);
    renderSection('facts', data.key_facts);
}

/**
 * Render individual section
 */
function renderSection(sectionId, items) {
    const section = document.getElementById(`${sectionId}-section`);
    const list = document.getElementById(`${sectionId}-list`);

    // Clear existing items
    list.innerHTML = '';

    if (!items || items.length === 0) {
        section.classList.add('empty');
        list.classList.add('empty');
        return;
    }

    section.classList.remove('empty');
    list.classList.remove('empty');

    // Add items
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
    });
}

/**
 * Copy entire context to clipboard
 */
function copyContext() {
    if (!compressedData) {
        showToast('⚠️ No data to copy');
        return;
    }

    const text = formatContextForCopy(compressedData);

    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('✓ Copied to clipboard');
        })
        .catch(err => {
            console.error('Failed to copy:', err);
            showToast('❌ Copy failed');
        });
}

/**
 * Format context as readable text
 */
function formatContextForCopy(data) {
    const sections = [];

    sections.push(`SUMMARY\n${data.summary}\n`);

    if (data.goal && data.goal.length > 0) {
        sections.push(`GOALS\n${data.goal.map(g => `• ${g}`).join('\n')}\n`);
    }

    if (data.decisions && data.decisions.length > 0) {
        sections.push(`KEY DECISIONS\n${data.decisions.map(d => `• ${d}`).join('\n')}\n`);
    }

    if (data.constraints && data.constraints.length > 0) {
        sections.push(`CONSTRAINTS\n${data.constraints.map(c => `• ${c}`).join('\n')}\n`);
    }

    if (data.open_questions && data.open_questions.length > 0) {
        sections.push(`OPEN QUESTIONS\n${data.open_questions.map(q => `• ${q}`).join('\n')}\n`);
    }

    if (data.key_facts && data.key_facts.length > 0) {
        sections.push(`KEY FACTS\n${data.key_facts.map(f => `• ${f}`).join('\n')}`);
    }

    return sections.join('\n');
}

/**
 * Start new ChatGPT chat with compressed context
 */
function startNewChat() {
    if (!compressedData) {
        showToast('⚠️ No context available');
        return;
    }

    const contextMessage = formatContextForChat(compressedData);
    const encodedMessage = encodeURIComponent(contextMessage);

    // Open ChatGPT with pre-filled message
    const chatUrl = `https://chatgpt.com/?q=${encodedMessage}`;
    window.open(chatUrl, '_blank');

    showToast('🚀 Opening new chat...');
}

/**
 * Format context for ChatGPT message
 */
function formatContextForChat(data) {
    let message = `Continue from: ${data.summary}. `;

    if (data.goal && data.goal.length > 0) {
        message += `Goals: ${data.goal.join(', ')}. `;
    }

    if (data.decisions && data.decisions.length > 0) {
        message += `Decisions made: ${data.decisions.join(', ')}. `;
    }

    if (data.constraints && data.constraints.length > 0) {
        message += `Constraints: ${data.constraints.join(', ')}. `;
    }

    if (data.open_questions && data.open_questions.length > 0) {
        message += `Open questions: ${data.open_questions.join(', ')}.`;
    }

    return message;
}

/**
 * Show toast notification
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const messageEl = document.getElementById('toast-message');

    messageEl.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

/**
 * Load mock data for testing
 */
function loadMockData() {
    compressedData = {
        goal: [
            "Build offline-first task management app",
            "Ship within 2-week deadline"
        ],
        constraints: [
            "Must work without internet connection",
            "2-week development timeline",
            "Solo developer (no team)"
        ],
        decisions: [
            "Use React with hooks for UI",
            "IndexedDB for local storage",
            "Tailwind CSS for styling",
            "Last-write-wins conflict resolution"
        ],
        open_questions: [],
        key_facts: [
            "Web platform (not mobile)",
            "Requires cross-device sync",
            "Local-first architecture approach"
        ],
        summary: "Building an offline-first task management web app using React, IndexedDB, and Tailwind CSS with a 2-week deadline. Using last-write-wins strategy for sync conflicts.",
        _meta: {
            originalCount: 26,
            optimizedCount: 16
        }
    };

    renderWidget(compressedData);
}
