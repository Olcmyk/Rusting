import { TOTAL_DAYS, getRawProgress } from './progression.js';

export function initInfoPanel(progress) {
  const btn = document.getElementById('info-btn');
  const panel = document.getElementById('info-panel');

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
      <a href="https://github.com/nicekid1/Rusting" target="_blank" rel="noopener">GitHub</a>
    </p>
    <button id="info-close">&times;</button>
  `;

  btn.addEventListener('click', () => panel.classList.toggle('hidden'));
  panel.querySelector('#info-close').addEventListener('click', () => panel.classList.add('hidden'));
}
