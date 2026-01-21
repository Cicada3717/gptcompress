// Premium branded loading widget - self-contained HTML
// This avoids deployment path issues by embedding everything inline

export const WIDGET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPTCompress</title>
  <style>
    :root {
      --emerald-500: #10b981;
      --emerald-400: #34d399;
      --emerald-600: #059669;
      --emerald-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
      --bg-dark: #0a0a0a;
      --bg-card: rgba(255, 255, 255, 0.03);
      --bg-glass: rgba(255, 255, 255, 0.05);
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.6);
      --text-muted: rgba(255, 255, 255, 0.4);
      --border-subtle: rgba(255, 255, 255, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    .widget-container {
      position: relative;
      max-width: 480px;
      margin: 0 auto;
      padding: 40px 24px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .bg-gradient {
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 70% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 40%);
      animation: gradientShift 8s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes gradientShift {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      50% { transform: translate(-5%, 5%) rotate(5deg); }
    }

    .brand-section {
      text-align: center;
      margin-bottom: 48px;
      z-index: 1;
    }

    .logo-container {
      position: relative;
      width: 100px; height: 100px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-ring {
      position: absolute;
      width: 100%; height: 100%;
      border-radius: 50%;
      border: 2px solid var(--emerald-500);
      opacity: 0.3;
      animation: ringPulse 2s ease-in-out infinite;
    }

    .logo-ring.delay-1 { animation-delay: 0.3s; }
    .logo-ring.delay-2 { animation-delay: 0.6s; }

    @keyframes ringPulse {
      0%, 100% { transform: scale(1); opacity: 0.3; }
      50% { transform: scale(1.2); opacity: 0; }
    }

    .logo-container.complete .logo-ring {
      animation: none;
      border-color: var(--emerald-400);
      opacity: 0.5;
    }

    .logo-icon {
      font-size: 40px;
      z-index: 1;
    }

    .logo-container.complete .logo-icon {
      animation: checkBounce 0.5s ease;
    }

    @keyframes checkBounce {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .brand-name {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: var(--emerald-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .brand-tagline {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .status-section {
      width: 100%;
      z-index: 1;
    }

    .status-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .status-label {
      font-size: 16px;
      font-weight: 500;
    }

    .status-dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 6px; height: 6px;
      background: var(--emerald-500);
      border-radius: 50%;
      animation: dotBounce 1.4s ease-in-out infinite;
    }

    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes dotBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-8px); }
    }

    .progress-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }

    .progress-bar {
      flex: 1;
      height: 6px;
      background: var(--bg-glass);
      border-radius: 100px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--emerald-gradient);
      border-radius: 100px;
      transition: width 0.1s ease-out;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
      width: 0%;
    }

    .progress-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--emerald-400);
      min-width: 36px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      opacity: 0.4;
      transition: all 0.3s ease;
    }

    .step.active {
      opacity: 1;
      background: var(--bg-glass);
      border-color: var(--emerald-500);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.1);
    }

    .step.complete { opacity: 0.7; }

    .step-icon {
      font-size: 18px;
      width: 28px; height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-glass);
      border-radius: 8px;
    }

    .step.complete .step-icon {
      background: var(--emerald-gradient);
      color: white;
      font-size: 14px;
    }

    .step-label {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .step.active .step-label {
      color: var(--text-primary);
      font-weight: 500;
    }

    /* Complete Section */
    .complete-section {
      text-align: center;
      animation: fadeInUp 0.5s ease;
      display: none;
    }

    .complete-section.visible { display: block; }
    .loading-section.hidden { display: none; }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .complete-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--emerald-gradient);
      padding: 12px 24px;
      border-radius: 100px;
      margin-bottom: 24px;
      box-shadow: 0 0 60px rgba(16, 185, 129, 0.3);
    }

    .complete-icon { font-size: 18px; font-weight: bold; }
    .complete-text { font-size: 15px; font-weight: 600; color: white; }

    .complete-message {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.6;
      margin-bottom: 32px;
    }

    .complete-hint {
      color: var(--emerald-400);
      font-weight: 500;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .stat-card {
      background: var(--bg-glass);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 28px;
      font-weight: 700;
      color: var(--emerald-400);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .widget-footer {
      position: absolute;
      bottom: 20px;
      left: 0; right: 0;
      text-align: center;
    }

    .footer-text {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="widget-container">
    <div class="bg-gradient"></div>
    
    <div class="brand-section">
      <div class="logo-container" id="logoContainer">
        <div class="logo-ring"></div>
        <div class="logo-ring delay-1"></div>
        <div class="logo-ring delay-2"></div>
        <span class="logo-icon" id="logoIcon">📦</span>
      </div>
      <h1 class="brand-name">GPTCompress</h1>
      <p class="brand-tagline">Intelligent Context Compression</p>
    </div>

    <div class="status-section">
      <!-- Loading State -->
      <div class="loading-section" id="loadingSection">
        <div class="status-text">
          <span class="status-label">Analyzing conversation</span>
          <span class="status-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <span class="progress-text" id="progressText">0%</span>
        </div>
        
        <div class="steps">
          <div class="step active" id="step1">
            <span class="step-icon">📝</span>
            <span class="step-label">Extracting insights</span>
          </div>
          <div class="step" id="step2">
            <span class="step-icon">🎯</span>
            <span class="step-label">Identifying goals</span>
          </div>
          <div class="step" id="step3">
            <span class="step-icon">✨</span>
            <span class="step-label">Generating summary</span>
          </div>
        </div>
      </div>

      <!-- Complete State -->
      <div class="complete-section" id="completeSection">
        <div class="complete-badge">
          <span class="complete-icon">✓</span>
          <span class="complete-text">Compression Complete</span>
        </div>
        
        <p class="complete-message">
          Your conversation has been intelligently compressed.
          <br>
          <span class="complete-hint">View the summary below ↓</span>
        </p>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">85%</span>
            <span class="stat-label">Tokens Saved</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">~5s</span>
            <span class="stat-label">Time Saved</span>
          </div>
        </div>
      </div>
    </div>

    <div class="widget-footer">
      <span class="footer-text">Powered by GPTCompress</span>
    </div>
  </div>

  <script>
    let progress = 0;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const loadingSection = document.getElementById('loadingSection');
    const completeSection = document.getElementById('completeSection');
    const logoContainer = document.getElementById('logoContainer');
    const logoIcon = document.getElementById('logoIcon');

    function updateProgress() {
      if (progress >= 100) {
        showComplete();
        return;
      }
      
      const increment = progress < 70 ? 8 : progress < 90 ? 3 : 1;
      progress = Math.min(progress + increment, 100);
      
      progressFill.style.width = progress + '%';
      progressText.textContent = progress + '%';
      
      // Update steps
      if (progress >= 40) {
        step1.classList.remove('active');
        step1.classList.add('complete');
        step1.querySelector('.step-icon').textContent = '✓';
        step2.classList.add('active');
      }
      if (progress >= 70) {
        step2.classList.remove('active');
        step2.classList.add('complete');
        step2.querySelector('.step-icon').textContent = '✓';
        step3.classList.add('active');
      }
      if (progress >= 100) {
        step3.classList.remove('active');
        step3.classList.add('complete');
        step3.querySelector('.step-icon').textContent = '✓';
      }
      
      setTimeout(updateProgress, 100);
    }

    function showComplete() {
      loadingSection.classList.add('hidden');
      completeSection.classList.add('visible');
      logoContainer.classList.add('complete');
      logoIcon.textContent = '✓';
    }

    // Start animation
    setTimeout(updateProgress, 500);
  </script>
</body>
</html>`;
