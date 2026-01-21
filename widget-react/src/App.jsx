import { useToolOutput } from './hooks/useToolOutput';
import './App.css';

function App() {
  const { data, loading } = useToolOutput();

  const handleCopy = () => {
    if (!data) return;
    const text = `📊 CONVERSATION ANALYSIS

SUMMARY:
${data.summary}

🎯 GOALS:
${data.goal.map(i => '• ' + i).join('\n')}

✅ KEY DECISIONS:
${data.decisions.map(i => '• ' + i).join('\n')}

🔒 CONSTRAINTS:
${data.constraints.map(i => '• ' + i).join('\n')}

❓ OPEN QUESTIONS:
${data.open_questions.map(i => '• ' + i).join('\n')}

📌 KEY FACTS:
${data.key_facts.map(i => '• ' + i).join('\n')}`;

    navigator.clipboard?.writeText(text).then(() => {
      const btn = document.getElementById('copy-btn');
      if (btn) {
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = 'Copy All', 2000);
      }
    });
  };

  const handleExpand = async () => {
    if (window.openai?.requestDisplayMode) {
      try {
        await window.openai.requestDisplayMode({ mode: "fullscreen" });
      } catch (e) {
        console.error('Fullscreen error:', e);
      }
    }
  };

  if (loading) {
    return (
      <div className="widget-container loading-state">
        <div className="pulse-loader">
          <div className="pulse-ring"></div>
          <span className="pulse-icon">📦</span>
        </div>
        <h2 className="loading-title">Analyzing Conversation</h2>
        <p className="loading-subtitle">Extracting key insights...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget-container error-state">
        <span className="error-icon">⚠️</span>
        <p>Unable to load compression data</p>
      </div>
    );
  }

  return (
    <div className="widget-container">
      {/* Floating Header */}
      <header className="header">
        <div className="header-badge">
          <span className="badge-icon">📦</span>
          <span className="badge-text">Compressed</span>
          <span className="badge-stats">{data.stats}</span>
        </div>
        <button className="expand-btn" onClick={handleExpand}>
          <span>⤢</span>
        </button>
      </header>

      {/* Hero Summary Card */}
      <section className="hero-card">
        <div className="hero-glow"></div>
        <h1 className="hero-title">Executive Summary</h1>
        <p className="hero-text">{data.summary}</p>
      </section>

      {/* Insights Grid */}
      <div className="insights-grid">
        <InsightCard
          icon="🎯"
          title="Goals"
          items={data.goal}
          color="emerald"
        />
        <InsightCard
          icon="✅"
          title="Decisions"
          items={data.decisions}
          color="blue"
        />
        <InsightCard
          icon="🔒"
          title="Constraints"
          items={data.constraints}
          color="amber"
        />
        <InsightCard
          icon="❓"
          title="Open Questions"
          items={data.open_questions}
          color="gray"
        />
        <InsightCard
          icon="📌"
          title="Key Facts"
          items={data.key_facts}
          color="teal"
          fullWidth
        />
      </div>

      {/* Action Bar */}
      <footer className="action-bar">
        <button id="copy-btn" className="action-btn secondary" onClick={handleCopy}>
          <span className="btn-icon">📋</span>
          Copy All
        </button>
        <button className="action-btn primary" onClick={() => window.open('https://chat.openai.com', '_blank')}>
          <span className="btn-icon">💬</span>
          New Chat
          <span className="btn-arrow">→</span>
        </button>
      </footer>
    </div>
  );
}

function InsightCard({ icon, title, items, color, fullWidth }) {
  const hasItems = items && items.length > 0;

  return (
    <div className={`insight-card ${color} ${fullWidth ? 'full-width' : ''}`}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3 className="card-title">{title}</h3>
        {hasItems && <span className="card-count">{items.length}</span>}
      </div>
      <ul className="card-list">
        {hasItems ? (
          items.map((item, i) => (
            <li key={i} className="card-item">
              <span className="item-bullet"></span>
              <span className="item-text">{item}</span>
            </li>
          ))
        ) : (
          <li className="card-item empty">
            <span className="item-text">None identified</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default App;
