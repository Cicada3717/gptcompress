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
      --bg-card: rgba(255, 255, 255, 0.05);
      --bg-glass: rgba(255, 255, 255, 0.08); /* Increased for visibility */
      --text-primary: #ffffff;
      --text-secondary: rgba(255, 255, 255, 0.75);
      --text-muted: rgba(255, 255, 255, 0.5);
      --border-subtle: rgba(255, 255, 255, 0.1);
      --shadow-soft: 0 4px 20px rgba(0, 0, 0, 0.3);
      --shadow-glow: 0 0 30px rgba(16, 185, 129, 0.25);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-dark);
      color: var(--text-primary);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      height: 100vh;
      overflow: hidden;
      margin: 0;
    }

    .widget-container {
      position: relative;
      width: 100%;
      height: 450px; /* Fixed height safety */
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      z-index: 1;
    }

    /* Ambient Background Glow */
    .bg-gradient {
      position: absolute;
      top: -50%; left: -50%;
      width: 200%; height: 200%;
      background: radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.12) 0%, transparent 60%);
      animation: pulseGlow 6s ease-in-out infinite alternate;
      z-index: 0;
      pointer-events: none;
    }

    @keyframes pulseGlow {
      from { opacity: 0.6; transform: scale(1); }
      to { opacity: 1; transform: scale(1.1); }
    }

    .content-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* Brand Section */
    .brand-section {
      text-align: center;
      margin-bottom: 40px;
    }

    .logo-container {
      position: relative;
      width: 80px; height: 80px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 50%;
      box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
    }

    .logo-ring {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid var(--emerald-500);
      opacity: 0;
      animation: ripple 2s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    }

    .logo-ring:nth-child(2) { animation-delay: 0.5s; }

    @keyframes ripple {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(1.5); opacity: 0; }
    }

    .logo-icon {
      font-size: 36px;
      position: relative;
      z-index: 2;
    }

    .brand-name {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.01em;
      background: var(--emerald-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
      filter: drop-shadow(0 2px 10px rgba(16, 185, 129, 0.3));
    }

    .brand-tagline {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Status & Progress */
    .status-section { width: 100%; }

    .loading-section {
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    
    .loading-section.hidden {
      opacity: 0;
      transform: translateY(-10px);
      pointer-events: none;
      position: absolute; /* Remove from flow when hidden */
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
    }

    .status-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status-dots span {
      display: inline-block;
      width: 4px; height: 4px;
      background: var(--emerald-400);
      border-radius: 50%;
      animation: dotPulse 1.4s infinite;
    }
    .status-dots span:nth-child(2) { animation-delay: 0.2s; }
    .status-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes dotPulse {
      0%, 100% { opacity: 0.3; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }

    .progress-percent {
      font-size: 14px;
      font-weight: 600;
      color: var(--emerald-400);
      font-variant-numeric: tabular-nums;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--bg-glass);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 32px;
    }

    .progress-fill {
      height: 100%;
      background: var(--emerald-gradient);
      width: 0%;
      border-radius: 4px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
    }

    .steps-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      transition: all 0.3s ease;
      opacity: 0.5;
    }

    .step-item.active {
      opacity: 1;
      background: linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .step-item.complete {
      opacity: 0.8;
      border-color: var(--emerald-600);
    }

    .step-icon {
      width: 24px; height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .step-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .step-item.active .step-text { color: var(--text-primary); }

    /* Complete State */
    .complete-section {
      display: none;
      animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: center;
    }
    
    .complete-section.visible { display: block; }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .complete-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald-400);
      padding: 8px 16px;
      border-radius: 20px;
      margin-bottom: 24px;
      font-weight: 600;
      font-size: 14px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .complete-message {
      font-size: 16px;
      line-height: 1.5;
      color: var(--text-secondary);
      margin-bottom: 32px;
    }

    .complete-message b { color: var(--text-primary); }

    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .stat-box {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-num {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

  </style>
</head>
<body>
  <div class="widget-container">
    <div class="bg-gradient"></div>
    
    <div class="content-wrapper">
      <div class="brand-section">
        <div class="logo-container" id="logoContainer">
          <div class="logo-ring"></div>
          <div class="logo-ring"></div>
          <span class="logo-icon" id="logoIcon">📦</span>
        </div>
        <h1 class="brand-name">GPTCompress</h1>
        <p class="brand-tagline">Intelligent Context Compression</p>
      </div>

      <div class="status-section">
        <!-- Loading UI -->
        <div class="loading-section" id="loadingSection">
          <div class="status-header">
            <div class="status-title">
              Processing
              <div class="status-dots"><span></span><span></span><span></span></div>
            </div>
            <span class="progress-percent" id="progressText">0%</span>
          </div>
          
          <div class="progress-track">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          
          <div class="steps-list">
            <div class="step-item active" id="step1">
              <span class="step-icon">📝</span>
              <span class="step-text">Extracting insights</span>
            </div>
            <div class="step-item" id="step2">
              <span class="step-icon">🎯</span>
              <span class="step-text">Identifying goals</span>
            </div>
            <div class="step-item" id="step3">
              <span class="step-icon">✨</span>
              <span class="step-text">Generating summary</span>
            </div>
          </div>
        </div>

        <!-- Complete UI -->
        <div class="complete-section" id="completeSection">
          <div class="complete-badge">
            <span>✓</span> Compression Complete
          </div>
          
          <p class="complete-message">
            <b>Ready!</b> Check the summary below for<br>your prioritized insights.
          </p>

          <div class="stats-row">
            <div class="stat-box">
              <span class="stat-num" style="color: var(--emerald-400);">85%</span>
              <span class="stat-label">Tokens Saved</span>
            </div>
            <div class="stat-box">
              <span class="stat-num">~5s</span>
              <span class="stat-label">Time Saved</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const loadingSection = document.getElementById('loadingSection');
    const completeSection = document.getElementById('completeSection');
    const logoIcon = document.getElementById('logoIcon');
    const logoContainer = document.getElementById('logoContainer');

    let progress = 0;

    function runAnimation() {
      try {
        if (progress >= 100) {
          finishAnimation();
          return;
        }

        // Variable speed
        let speed = 2;
        if (progress < 50) speed = 5;
        else if (progress > 85) speed = 1;

        progress = Math.min(progress + speed, 100);

        // Update UI
        if(progressFill) progressFill.style.width = progress + '%';
        if(progressText) progressText.innerText = progress + '%';

        // Step logic
        updateSteps(progress);

        requestAnimationFrame(runAnimation);
      } catch (e) {
        console.error('Anim error', e);
        finishAnimation();
      }
    }

    function updateSteps(p) {
      if (p > 30 && step1) {
        step1.classList.remove('active');
        step1.classList.add('complete');
        step1.querySelector('.step-icon').innerText = '✓';
        if (step2) step2.classList.add('active');
      }
      if (p > 70 && step2) {
        step2.classList.remove('active');
        step2.classList.add('complete');
        step2.querySelector('.step-icon').innerText = '✓';
        if (step3) step3.classList.add('active');
      }
    }

    function finishAnimation() {
      if(step3) {
        step3.classList.remove('active');
        step3.classList.add('complete');
        step3.querySelector('.step-icon').innerText = '✓';
      }
      
      setTimeout(() => {
        if(loadingSection) loadingSection.classList.add('hidden');
        if(completeSection) completeSection.classList.add('visible');
        if(logoContainer) logoContainer.style.background = 'rgba(16, 185, 129, 0.2)';
        if(logoIcon) logoIcon.innerText = '✓';
      }, 500);
    }

    // Failsafe
    setTimeout(finishAnimation, 6000);

    // Start with delay
    setTimeout(runAnimation, 300);
  </script>
</body>
</html>`;
