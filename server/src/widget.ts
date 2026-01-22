// Premium Apple-level widget - sharp, minimal, sophisticated

export const WIDGET_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GPTCompress</title>
  <style>
    :root {
      --emerald: #10b981;
      --emerald-bright: #34d399;
      --bg-dark: #000000;
      --bg-surface: #0a0a0a;
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.6);
      --border: rgba(255, 255, 255, 0.06);
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      height: 100vh;
      overflow: hidden;
    }

    .widget {
      width: 100%;
      height: 200px;
      padding: 32px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(to bottom, var(--bg-surface), var(--bg-dark));
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }

    /* Left side - Branding */
    .brand-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .icon-box {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      position: relative;
      overflow: hidden;
    }

    .icon-box::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .icon-box.complete::before {
      opacity: 1;
    }

    .icon-char {
      font-size: 24px;
      position: relative;
      z-index: 1;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .app-name {
      font-size: 16px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .app-subtitle {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-secondary);
      letter-spacing: 0.01em;
    }

    /* Right side - Status */
    .status-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: all 0.3s ease;
    }

    .status-indicator.complete {
      color: var(--emerald-bright);
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.05);
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: var(--emerald);
      border-radius: 50%;
      animation: rotate 0.6s linear infinite;
    }

    @keyframes rotate {
      to { transform: rotate(360deg); }
    }

    .check {
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--emerald-bright);
      font-size: 10px;
      font-weight: bold;
    }

    /* Progress bar */
    .progress-bar {
      width: 160px;
      height: 2px;
      background: rgba(255, 255, 255, 0.05);
      position: relative;
      overflow: hidden;
    }

    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--emerald);
      width: 0%;
      transition: width 0.3s ease;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .progress-bar.complete .progress-fill {
      width: 100%;
    }

    .progress-bar.hidden {
      opacity: 0;
    }

    /* Subtle accent line */
    .accent-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--emerald), transparent);
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .accent-line.visible {
      opacity: 0.3;
    }

  </style>
</head>
<body>
  <div class="widget">
    <div class="brand-section">
      <div class="icon-box" id="iconBox">
        <span class="icon-char" id="iconChar">📦</span>
      </div>
      <div class="brand-text">
        <div class="app-name">GPTCompress</div>
        <div class="app-subtitle">Context Compression</div>
      </div>
    </div>

    <div class="status-section">
      <div class="progress-bar" id="progressBar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
      <div class="status-indicator" id="statusIndicator">
        <div class="spinner" id="spinner"></div>
        <span id="statusText">Compressing</span>
      </div>
    </div>

    <div class="accent-line" id="accentLine"></div>
  </div>

  <script>
    const iconBox = document.getElementById('iconBox');
    const iconChar = document.getElementById('iconChar');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const spinner = document.getElementById('spinner');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const accentLine = document.getElementById('accentLine');

    let progress = 0;
    let checkCount = 0;
    const MAX_CHECKS = 60;

    function animateProgress() {
      if (progress < 90) {
        progress += Math.random() * 5;
        progressFill.style.width = Math.min(progress, 90) + '%';
        setTimeout(animateProgress, 400);
      }
    }

    function checkCompletion() {
      checkCount++;
      
      const hasData = window.openai?.toolOutput && 
        (window.openai.toolOutput.summary || 
         window.openai.toolOutput.structuredContent ||
         typeof window.openai.toolOutput === 'object');
      
      if (hasData || checkCount >= MAX_CHECKS) {
        showComplete();
        return;
      }
      
      setTimeout(checkCompletion, 500);
    }

    function showComplete() {
      // Complete progress
      progressFill.style.width = '100%';
      progressBar.classList.add('complete');
      
      setTimeout(() => {
        progressBar.classList.add('hidden');
        
        // Update icon
        iconBox.classList.add('complete');
        iconChar.textContent = '✓';
        
        // Update status
        spinner.style.display = 'none';
        statusIndicator.classList.add('complete');
        statusIndicator.innerHTML = '<div class="check">✓</div><span>Complete</span>';
        
        // Show accent
        accentLine.classList.add('visible');
      }, 400);
    }

    // Start
    setTimeout(() => {
      animateProgress();
      checkCompletion();
    }, 300);
  </script>
</body>
</html>`;
