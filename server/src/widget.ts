// Premium engaging widget - Particles + Centered Stages
// Syncs with actual compression completion

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
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
      background: #000;
      color: white;
      -webkit-font-smoothing: antialiased;
      height: 100vh;
      overflow: hidden;
    }

    .widget {
      width: 100%;
      height: 200px;
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
    }

    /* Particle Background */
    .particle-layer {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .particle {
      position: absolute;
      width: 6px;
      height: 6px;
      background: var(--emerald);
      border-radius: 50%;
      opacity: 0.3;
      filter: blur(0.5px);
      animation: swirl 5s ease-in-out infinite;
    }

    @keyframes swirl {
      0% { 
        transform: translate(var(--start-x), var(--start-y)) rotate(0deg);
        opacity: 0.15;
      }
      50% { 
        transform: translate(var(--mid-x), var(--mid-y)) rotate(180deg);
        opacity: 0.5;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
      }
      100% { 
        transform: translate(var(--end-x), var(--end-y)) rotate(360deg);
        opacity: 0.15;
      }
    }

    /* Centered Stage Container */
    .stage-container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 380px;
    }

    .stage-card {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 18px 24px;
      background: rgba(10, 10, 10, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.92);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .stage-card.visible {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      border-color: rgba(16, 185, 129, 0.35);
      background: rgba(16, 185, 129, 0.08);
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.18);
    }

    .stage-card.exit {
      opacity: 0;
      transform: translate(-50%, -60%) scale(0.92);
      transition: all 0.4s cubic-bezier(0.4, 0, 1, 1);
    }

    .stage-card.complete {
      border-color: rgba(16, 185, 129, 0.5);
      background: rgba(16, 185, 129, 0.12);
    }

    .stage-icon {
      font-size: 26px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.12);
      border-radius: 10px;
      flex-shrink: 0;
    }

    .stage-text {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
      color: rgba(255,255,255,0.95);
    }

    .stage-spinner {
      width: 16px;
      height: 16px;
      border: 2.5px solid rgba(255,255,255,0.12);
      border-top-color: var(--emerald-bright);
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      flex-shrink: 0;
    }

    .stage-check {
      font-size: 18px;
      color: var(--emerald-bright);
      font-weight: bold;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

  </style>
</head>
<body>
  <div class="widget">
    <div class="particle-layer" id="particleLayer"></div>
    
    <div class="stage-container">
      <div class="stage-card" id="stage0">
        <div class="stage-icon">📖</div>
        <div class="stage-text">Reading conversation</div>
        <div class="stage-spinner"></div>
      </div>
      <div class="stage-card" id="stage1">
        <div class="stage-icon">🧠</div>
        <div class="stage-text">Analyzing context</div>
        <div class="stage-spinner"></div>
      </div>
      <div class="stage-card" id="stage2">
        <div class="stage-icon">🔍</div>
        <div class="stage-text">Extracting patterns</div>
        <div class="stage-spinner"></div>
      </div>
      <div class="stage-card" id="stage3">
        <div class="stage-icon">📦</div>
        <div class="stage-text">Compressing output</div>
        <div class="stage-spinner"></div>
      </div>
      <div class="stage-card" id="stageComplete">
        <div class="stage-icon">✓</div>
        <div class="stage-text">Compression Complete</div>
        <div class="stage-check">✓</div>
      </div>
    </div>
  </div>

  <script>
    const particleLayer = document.getElementById('particleLayer');
    const stages = [
      document.getElementById('stage0'),
      document.getElementById('stage1'),
      document.getElementById('stage2'),
      document.getElementById('stage3')
    ];
    const completeStage = document.getElementById('stageComplete');
    
    let currentStage = 0;
    let isComplete = false;
    let checkCount = 0;
    const MAX_CHECKS = 100; // 50 seconds max

    // Create particles
    function initParticles() {
      const count = 30;
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const startX = Math.random() * 700 - 350;
        const startY = Math.random() * 180 - 90;
        const midX = Math.random() * 500 - 250;
        const midY = Math.random() * 120 - 60;
        const endX = Math.random() * 300 - 150;
        const endY = Math.random() * 80 - 40;
        
        particle.style.setProperty('--start-x', startX + 'px');
        particle.style.setProperty('--start-y', startY + 'px');
        particle.style.setProperty('--mid-x', midX + 'px');
        particle.style.setProperty('--mid-y', midY + 'px');
        particle.style.setProperty('--end-x', endX + 'px');
        particle.style.setProperty('--end-y', endY + 'px');
        
        particle.style.animationDelay = (Math.random() * 3) + 's';
        particle.style.left = '50%';
        particle.style.top = '50%';
        
        particleLayer.appendChild(particle);
      }
    }

    // Show specific stage
    function showStage(index) {
      if (index >= 0 && index < stages.length) {
        stages[index].classList.add('visible');
      }
    }

    // Hide stage with exit animation
    function hideStage(index) {
      if (index >= 0 && index < stages.length) {
        stages[index].classList.remove('visible');
        stages[index].classList.add('exit');
      }
    }

    // Progress to next stage
    function progressStage() {
      if (isComplete) return;
      
      if (currentStage > 0) {
        hideStage(currentStage - 1);
      }
      
      if (currentStage < stages.length) {
        setTimeout(() => {
          showStage(currentStage);
          currentStage++;
        }, currentStage === 0 ? 0 : 300);
      }
    }

    // Check for compression completion
    function checkCompletion() {
      if (isComplete) return;
      
      checkCount++;
      
      const hasData = window.openai?.toolOutput && 
        (window.openai.toolOutput.summary || 
         window.openai.toolOutput.structuredContent ||
         typeof window.openai.toolOutput === 'object');
      
      if (hasData || checkCount >= MAX_CHECKS) {
        showComplete();
        return;
      }
      
      // Continue checking
      setTimeout(checkCompletion, 500);
    }

    // Show completion state
    function showComplete() {
      if (isComplete) return;
      isComplete = true;
      
      // Hide current stage
      if (currentStage > 0) {
        hideStage(currentStage - 1);
      }
      
      // Show complete stage
      setTimeout(() => {
        completeStage.classList.add('visible', 'complete');
      }, 300);
    }

    // Stage progression timing (slower, ~4 seconds per stage)
    function startStageProgression() {
      showStage(0);
      currentStage = 1;
      
      const stageInterval = setInterval(() => {
        if (isComplete || currentStage >= stages.length) {
          clearInterval(stageInterval);
          return;
        }
        progressStage();
      }, 4000); // 4 seconds per stage
    }

    // Initialize
    initParticles();
    setTimeout(() => {
      startStageProgression();
      checkCompletion();
    }, 400);
  </script>
</body>
</html>`;
