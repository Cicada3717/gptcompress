import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('loading'); // loading -> complete
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Fast at first, slow down near end
        const increment = prev < 70 ? 8 : prev < 90 ? 3 : 1;
        return Math.min(prev + increment, 100);
      });
    }, 100);

    // Transition to complete after progress reaches 100
    const completeTimer = setTimeout(() => {
      setStatus('complete');
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="widget-container">
      {/* Animated background gradient */}
      <div className="bg-gradient"></div>

      {/* Logo and branding */}
      <div className="brand-section">
        <div className={`logo-container ${status}`}>
          <div className="logo-ring"></div>
          <div className="logo-ring delay-1"></div>
          <div className="logo-ring delay-2"></div>
          <span className="logo-icon">{status === 'complete' ? '✓' : '📦'}</span>
        </div>

        <h1 className="brand-name">GPTCompress</h1>
        <p className="brand-tagline">Intelligent Context Compression</p>
      </div>

      {/* Status section */}
      <div className="status-section">
        {status === 'loading' ? (
          <>
            <div className="status-text">
              <span className="status-label">Analyzing conversation</span>
              <span className="status-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>

            {/* Steps indicator */}
            <div className="steps">
              <Step
                icon="📝"
                label="Extracting insights"
                active={progress < 40}
                complete={progress >= 40}
              />
              <Step
                icon="🎯"
                label="Identifying goals"
                active={progress >= 40 && progress < 70}
                complete={progress >= 70}
              />
              <Step
                icon="✨"
                label="Generating summary"
                active={progress >= 70}
                complete={progress >= 100}
              />
            </div>
          </>
        ) : (
          <div className="complete-section">
            <div className="complete-badge">
              <span className="complete-icon">✓</span>
              <span className="complete-text">Compression Complete</span>
            </div>

            <p className="complete-message">
              Your conversation has been intelligently compressed.
              <br />
              <span className="complete-hint">View the summary below ↓</span>
            </p>

            {/* Stats preview */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">85%</span>
                <span className="stat-label">Tokens Saved</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">~5s</span>
                <span className="stat-label">Time Saved</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="widget-footer">
        <span className="footer-text">Powered by GPTCompress</span>
      </div>
    </div>
  );
}

function Step({ icon, label, active, complete }) {
  return (
    <div className={`step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}>
      <span className="step-icon">
        {complete ? '✓' : icon}
      </span>
      <span className="step-label">{label}</span>
    </div>
  );
}

export default App;
