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
      height: 100vh;
      overflow: hidden; /* Prevent resize loops */
      margin: 0;
    }

    .widget-container {
      position: relative;
      width: 100%;
      height: 450px; /* Fixed height to prevent unlimited expansion */
      padding: 32px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
/* ... skipped styles ... */

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
      try {
        if (progress >= 100) {
          showComplete();
          return;
        }
        
        // Slightly faster animation
        const increment = progress < 70 ? 10 : progress < 90 ? 5 : 2;
        progress = Math.min(progress + increment, 100);
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = progress + '%';
        
        // Update steps with safety checks
        if (progress >= 40 && step1) {
          step1.classList.remove('active');
          step1.classList.add('complete');
          const icon = step1.querySelector('.step-icon');
          if (icon) icon.textContent = '✓';
          if (step2) step2.classList.add('active');
        }
        if (progress >= 70 && step2) {
          step2.classList.remove('active');
          step2.classList.add('complete');
          const icon = step2.querySelector('.step-icon');
          if (icon) icon.textContent = '✓';
          if (step3) step3.classList.add('active');
        }
        if (progress >= 100 && step3) {
          step3.classList.remove('active');
          step3.classList.add('complete');
          const icon = step3.querySelector('.step-icon');
          if (icon) icon.textContent = '✓';
        }
        
        setTimeout(updateProgress, 100);
      } catch (e) {
        console.error('Animation error:', e);
        // Fallback to complete on error
        showComplete();
      }
    }

    function showComplete() {
      if (loadingSection) loadingSection.classList.add('hidden');
      if (completeSection) completeSection.classList.add('visible');
      if (logoContainer) {
        logoContainer.classList.add('complete');
        // Stop pulsing rings
        const rings = logoContainer.querySelectorAll('.logo-ring');
        rings.forEach(r => r.style.animation = 'none');
      }
      if (logoIcon) logoIcon.textContent = '✓';
    }

    // Start animation with safety timeout
    setTimeout(updateProgress, 500);
    // Force complete backup
    setTimeout(showComplete, 5000);
  </script>
</body>
</html>`;
