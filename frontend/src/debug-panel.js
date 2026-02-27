import { getRustParams } from './progression.js';

export function initDebugPanel(initialProgress) {
  const isDebug =
    new URLSearchParams(location.search).has('debug') ||
    import.meta.env.DEV;

  if (!isDebug) return;

  // Lazy import to avoid circular dep at module level
  import('./main.js').then(({ applyProgress }) => {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';

    const label = document.createElement('div');
    label.className = 'debug-label';
    label.textContent = `progress: ${initialProgress.toFixed(4)}`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.001';
    slider.value = String(initialProgress);

    const info = document.createElement('pre');
    info.className = 'debug-info';

    function updateInfo(p) {
      const rp = getRustParams(p);
      info.textContent = Object.entries(rp)
        .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(3) : v}`)
        .join('\n');
    }

    updateInfo(initialProgress);

    slider.addEventListener('input', () => {
      const p = parseFloat(slider.value);
      label.textContent = `progress: ${p.toFixed(4)}`;
      applyProgress(p);
      updateInfo(p);
    });

    panel.append(label, slider, info);
    document.body.appendChild(panel);
  });
}
