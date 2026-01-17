// Test data: Sample conversation to test compression
// Run this with: node test-compression.js

const testMessages = [
    { role: "user", content: "I want to build a task management app" },
    { role: "assistant", content: "Great! What platform are you targeting?" },
    { role: "user", content: "Web app, needs to work offline" },
    { role: "assistant", content: "For offline functionality, I recommend using IndexedDB or localStorage. What features do you need?" },
    { role: "user", content: "Users should be able to create tasks, set priorities, and add due dates" },
    { role: "assistant", content: "Understood. Should tasks sync across devices?" },
    { role: "user", content: "Yes, but offline-first is critical" },
    { role: "assistant", content: "Perfect. I'll use a local-first architecture with background sync." },
    { role: "user", content: "ok" },
    { role: "assistant", content: "Let's start with the data model. Here's a Task interface..." },
    { role: "user", content: "looks good" },
    { role: "assistant", content: "Great! Now let's implement the storage layer using IndexedDB..." },
    { role: "user", content: "Should I use React or Vue?" },
    { role: "assistant", content: "Both work well. React has more offline tooling. Which are you more comfortable with?" },
    { role: "user", content: "React" },
    { role: "assistant", content: "Excellent choice. We'll use React with hooks and Context API for state management." },
    { role: "user", content: "What about styling?" },
    { role: "assistant", content: "For a task app, I recommend Tailwind CSS for rapid development." },
    { role: "user", content: "sounds good" },
    { role: "assistant", content: "Let me create the project structure..." },
    { role: "user", content: "thanks" },
    { role: "assistant", content: "Here's the implementation for the TaskList component..." },
    { role: "user", content: "How do I handle sync conflicts?" },
    { role: "assistant", content: "For offline-first apps, I recommend the 'last write wins' strategy with timestamps, or implement a conflict resolution UI if precision is critical." },
    { role: "user", content: "Last write wins is fine for now" },
    { role: "assistant", content: "Perfect. I'll implement that. Here's the sync logic..." },
    { role: "user", content: "One more thing - I need the app to work in 2 weeks" },
    { role: "assistant", content: "Two weeks is achievable. Let's prioritize: Week 1 - core CRUD + offline storage. Week 2 - sync + polish." }
];

console.log("Test Conversation:");
console.log("==================");
console.log(`Total messages: ${testMessages.length}`);
console.log("\nSample messages:");
testMessages.slice(0, 3).forEach((msg, i) => {
    console.log(`[${i + 1}] ${msg.role}: ${msg.content}`);
});
console.log("...");
console.log("\n✅ This conversation should compress to:");
console.log("- Goal: Build offline-first task management app");
console.log("- Constraints: Must work offline, 2-week deadline");
console.log("- Decisions: React, IndexedDB, Tailwind, last-write-wins sync");
console.log("- Open questions: None (all resolved)");
console.log("- Key facts: Web platform, needs sync, local-first architecture");

// Export for testing
export { testMessages };
