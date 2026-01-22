// Premium branded loading widget - INTELLIGENT state sync
// Widget detects actual compression completion via window.openai.toolOutput

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
      --emerald-gradient: linear-gradient(135deg, #10b981 0%, #059669 100%);
      --bg-dark: #0f0f0f;
      --bg-card: rgba(255, 255, 255, 0.04);
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.7);
      --border-subtle: rgba(255, 255, 255, 0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      -webkit-font-smoothing: antialiased;
      height: 100vh;
      overflow: hidden;
      margin: 0;
    }

    .widget-container {
      width: 100%;
      height: 200px; /* Compact height */
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    /* Subtle ambient glow */
    .bg-glow {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%);
      pointer-events: none;
      animation: pulse 4s ease-in-out infinite alternate;
    }

    @keyframes pulse {
      from { opacity: 0.5; transform: translate(-50%, -50%) scale(0.9); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }

    .content {
      position: relative;
      z-index: 1;
      text-align: center;
      width: 100%;
      max-width: 320px;
    }

    /* Logo */
    .logo-wrap {
      width: 56px; height: 56px;
      margin: 0 auto 16px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-circle {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid var(--emerald-500);
      opacity: 0.3;
    }

    .logo-circle.animate {
      animation: ripple 2s infinite;
    }

    .logo-circle:nth-child(2) { animation-delay: 0.5s; }

    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.5; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    .logo-icon {
      font-size: 28px;
      z-index: 1;
    }

    /* Brand text */
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      background: var(--emerald-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
    }

    .brand-tagline {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    /* Status pill */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.4s ease;
    }

    .status-pill.loading {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .status-pill.complete {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald-400);
    }

    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: var(--emerald-400);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .check-icon {
      font-size: 14px;
    }

    /* Progress dots */
    .progress-dots {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 16px;
    }

    .progress-dots span {
      width: 6px; height: 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      transition: all 0.3s ease;
    }

    .progress-dots span.active {
      background: var(--emerald-400);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
    }

    .progress-dots.hidden { display: none; }

    /* Hint text */
    .hint {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 12px;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .hint.visible { opacity: 1; }

  </style>
</head>
<body>
  <div class="widget-container">
    <div class="bg-glow"></div>
    
    <div class="content">
      <div class="logo-wrap" id="logoWrap">
        <div class="logo-circle animate"></div>
        <div class="logo-circle animate"></div>
        <span class="logo-icon" id="logoIcon">📦</span>
      </div>
      
      <h1 class="brand-name">GPTCompress</h1>
      <p class="brand-tagline">Intelligent Context Compression</p>
      
      <div class="status-pill loading" id="statusPill">
        <div class="spinner" id="spinner"></div>
        <span id="statusText">Compressing...</span>
      </div>
      
      <div class="progress-dots" id="progressDots">
        <span class="active"></span>
        <span></span>
        <span></span>
      </div>
      
      <p class="hint" id="hint">View your summary below ↓</p>
    </div>
  </div>

  <script>
    // DOM elements
    const statusPill = document.getElementById('statusPill');
    const statusText = document.getElementById('statusText');
    const spinner = document.getElementById('spinner');
    const progressDots = document.getElementById('progressDots');
    const dots = progressDots.querySelectorAll('span');
    const hint = document.getElementById('hint');
    const logoWrap = document.getElementById('logoWrap');
    const logoIcon = document.getElementById('logoIcon');
    const circles = logoWrap.querySelectorAll('.logo-circle');

    let dotIndex = 0;
    let checkCount = 0;
    const MAX_CHECKS = 60; // 30 seconds max

    // Animate dots while waiting
    function animateDots() {
      dots.forEach((d, i) => d.classList.toggle('active', i <= dotIndex));
      dotIndex = (dotIndex + 1) % dots.length;
    }

    // Check if compression is complete
    function checkCompletion() {
      checkCount++;
      
      // Check for toolOutput data (indicates compression is done)
      const hasData = window.openai?.toolOutput && 
        (window.openai.toolOutput.summary || 
         window.openai.toolOutput.structuredContent ||
         typeof window.openai.toolOutput === 'object');
      
      if (hasData || checkCount >= MAX_CHECKS) {
        showComplete();
        return;
      }
      
      // Animate dots and keep checking
      animateDots();
      setTimeout(checkCompletion, 500);
    }

    // Transition to complete state
    function showComplete() {
      // Stop animations
      circles.forEach(c => {
        c.classList.remove('animate');
        c.style.opacity = '0.5';
        c.style.borderColor = 'var(--emerald-400)';
      });
      
      // Update logo
      logoIcon.textContent = '✓';
      
      // Update status pill
      statusPill.classList.remove('loading');
      statusPill.classList.add('complete');
      spinner.style.display = 'none';
      statusText.innerHTML = '<span class="check-icon">✓</span> Complete';
      
      // Hide dots, show hint
      progressDots.classList.add('hidden');
      hint.classList.add('visible');
    }

    // Start checking after a brief delay
    setTimeout(checkCompletion, 500);
  </script>
</body>
</html>`;
