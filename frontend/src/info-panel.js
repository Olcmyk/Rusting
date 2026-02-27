import { TOTAL_DAYS, DEPLOY_TIMESTAMP, getRawProgress } from './progression.js';

export function initInfoPanel(progress) {
  const isDebug =
    new URLSearchParams(location.search).has('debug') ||
    import.meta.env.DEV;

  // Debug panel (top-right)
  if (isDebug) {
    const btn = document.getElementById('info-btn');
    const panel = document.getElementById('info-panel');

    btn.classList.add('debug');
    panel.classList.add('debug');

    const rawProgress = getRawProgress();
    const elapsedDays = Math.floor(rawProgress * TOTAL_DAYS);
    const pct = (rawProgress * 100).toFixed(2);

    panel.innerHTML = `
      <h2>Rusting</h2>
      <p>A metal sphere oxidizing in real time.</p>
      <table>
        <tr><td>Total duration</td><td>${TOTAL_DAYS} days</td></tr>
        <tr><td>Elapsed</td><td>${elapsedDays} days</td></tr>
        <tr><td>Oxidation</td><td>${pct}%</td></tr>
      </table>
      <p class="link-row">
        <a href="https://github.com/Olcmyk/Rusting" target="_blank" rel="noopener">GitHub</a>
      </p>
      <button id="info-close">&times;</button>
    `;

    btn.addEventListener('click', () => panel.classList.toggle('hidden'));
    panel.querySelector('#info-close').addEventListener('click', () => panel.classList.add('hidden'));
  }

  // Help panel (bottom-right, always visible)
  const helpBtn = document.getElementById('help-btn');
  const helpPanel = document.getElementById('help-panel');

  const rawProgress = getRawProgress();
  const elapsedDays = Math.floor(rawProgress * TOTAL_DAYS);
  const startDate = new Date(DEPLOY_TIMESTAMP).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endDate = new Date(DEPLOY_TIMESTAMP + TOTAL_DAYS * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  helpPanel.innerHTML = `
    <h2>About</h2>
    <p>A website that is continuously rusting.</p>
    <p>Started on <strong>${startDate}</strong>, will continue until <strong>${endDate}</strong>. Already rusted for <strong>${elapsedDays}</strong> days.</p>
    <p style="font-size: 12px; color: #999; margin-top: 12px;">💡 This is real-time rendering, not a static image. Every frame is computed via WebGPU, so even for long-term projects (like ${TOTAL_DAYS} days), you're watching a genuine, dynamic oxidation process.</p>
    <div class="link-row">
      <a href="https://github.com/Olcmyk/Rusting" target="_blank" rel="noopener">→ View on GitHub</a>
    </div>
    <button id="help-close">&times;</button>
  `;

  helpBtn.addEventListener('click', () => helpPanel.classList.toggle('hidden'));
  helpPanel.querySelector('#help-close').addEventListener('click', () => helpPanel.classList.add('hidden'));
}
