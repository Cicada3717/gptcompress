import { useToolOutput } from './hooks/useToolOutput';
import './App.css';

function App() {
  const data = useToolOutput();

  const handleCopy = () => {
    const text = `SUMMARY: ${data.summary}\n\nGOALS:\n${data.goal.map(i => '-' + i).join('\n')}\n\nDECISIONS:\n${data.decisions.map(i => '- ' + i).join('\n')}\n\nOPEN QUESTIONS:\n${data.open_questions.map(i => '- ' + i).join('\n')}\n\nCONSTRAINTS:\n${data.constraints.map(i => '- ' + i).join('\n')}\n\nKEY FACTS:\n${data.key_facts.map(i => '- ' + i).join('\n')}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('✓ Copied to clipboard');
      });
    }
  };

  const handleExpand = async () => {
    if (window.openai) {
      try {
        await window.openai.requestDisplayMode({ mode: "fullscreen" });
      } catch (e) {
        console.error('Failed to request fullscreen:', e);
      }
    }
  };

  const handleNewChat = () => {
    window.open('https://chat.openai.com', '_blank');
  };

  return (
    <div className="widget-container">
      {/* Header */}
      <div className="header-row">
        <div className="header-badge">
          <span className="icon">📦</span>
          <span className="label">Compressed Context</span>
          <span className="stats">{data.stats}</span>
        </div>
        <button className="expand-btn" onClick={handleExpand}>
          ⤢ Expand
        </button>
      </div>

      {/* Hero Summary */}
      <div className="hero-card">
        <p className="summary-text">{data.summary}</p>
      </div>

      {/* Sections */}
      <div className="sections">
        <Section title="🎯 GOALS" items={data.goal} color="#059669" />
        <Section title="✅ KEY DECISIONS" items={data.decisions} color="#2563eb" />
        <Section title="🔒 CONSTRAINTS" items={data.constraints} color="#d97706" />
        <Section title="❓ OPEN QUESTIONS" items={data.open_questions} color="#6b7280" />
        <Section title="📌 KEY FACTS" items={data.key_facts} color="#059669" />
      </div>

      {/* Actions */}
      <div className="actions">
        <button className="btn btn-secondary" onClick={handleCopy}>
          📋 Copy All
        </button>
        <button className="btn btn-primary" onClick={handleNewChat}>
          💬 Start New Chat →
        </button>
      </div>
    </div>
  );
}

function Section({ title, items, color }) {
  return (
    <div className="section-card" style={{ borderLeftColor: color }}>
      <h3 className="section-title" style={{ color }}>{title}</h3>
      <ul className="section-list">
        {items && items.length > 0 ? (
          items.map((item, i) => (
            <li key={i}>{item}</li>
          ))
        ) : (
          <li className="empty">None identified</li>
        )}
      </ul>
    </div>
  );
}

export default App;
