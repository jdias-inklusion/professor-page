export class UI {
  constructor() {
    this.tooltipEl = this.ensureTooltip();
    this.panelEl = this.ensurePanel();
    this.loadingEl = this.ensureLoading();
    this.hintEl = this.ensureHint();

    this.panelTitleEl = this.panelEl.querySelector('[data-title]');
    this.panelBodyEl = this.panelEl.querySelector('[data-body]');
    this.panelEl.querySelector('[data-close]').addEventListener('click', () => {
      this.panelEl.style.display = 'none';
    });
  }

  ensureTooltip() {
    let el = document.getElementById('tooltip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tooltip';
      document.body.appendChild(el);
    }
    el.style.display = 'none';
    return el;
  }

  ensurePanel() {
    let el = document.getElementById('panel');
    if (!el) {
      el = document.createElement('div');
      el.id = 'panel';
      el.innerHTML = `
        <button data-close style="float:right">✕</button>
        <h2 data-title style="margin:0 0 8px"></h2>
        <p data-body style="margin:0"></p>
      `;
      document.body.appendChild(el);
    }
    el.style.display = 'none';
    return el;
  }

  ensureLoading() {
    const el = document.createElement('div');
    el.id = 'loading';
    el.style.position = 'fixed';
    el.style.left = '16px';
    el.style.top = '16px';
    el.style.padding = '8px 10px';
    el.style.borderRadius = '10px';
    el.style.background = 'rgba(10,10,14,0.75)';
    el.style.color = 'white';
    el.style.border = '1px solid rgba(255,255,255,0.12)';
    el.style.backdropFilter = 'blur(10px)';
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  ensureHint() {
    const el = document.createElement('div');
    el.id = 'hint';
    el.style.position = 'fixed';
    el.style.left = '16px';
    el.style.bottom = '16px';
    el.style.padding = '8px 10px';
    el.style.borderRadius = '10px';
    el.style.background = 'rgba(10,10,14,0.6)';
    el.style.color = 'white';
    el.style.border = '1px solid rgba(255,255,255,0.12)';
    el.style.backdropFilter = 'blur(10px)';
    el.textContent = '';
    document.body.appendChild(el);
    return el;
  }

  setHint(text) {
    this.hintEl.textContent = text ?? '';
  }

  setLoading(progress) {
    if (progress == null) {
      this.loadingEl.style.display = 'none';
      return;
    }
    const pct = Math.round(progress * 100);
    this.loadingEl.style.display = 'block';
    this.loadingEl.textContent = `A carregar… ${pct}%`;
  }

  showTooltip(text, worldPos, camera) {
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.textContent = text;

    const p = worldPos.clone().project(camera);
    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;

    this.tooltipEl.style.position = 'fixed';
    this.tooltipEl.style.left = `${x}px`;
    this.tooltipEl.style.top = `${y}px`;
    this.tooltipEl.style.transform = 'translate(-50%, -120%)';
    this.tooltipEl.style.padding = '6px 10px';
    this.tooltipEl.style.borderRadius = '10px';
    this.tooltipEl.style.background = 'rgba(10,10,14,0.8)';
    this.tooltipEl.style.color = 'white';
    this.tooltipEl.style.border = '1px solid rgba(255,255,255,0.12)';
    this.tooltipEl.style.pointerEvents = 'none';
    this.tooltipEl.style.whiteSpace = 'nowrap';
    this.tooltipEl.style.fontSize = '13px';
  }

  hideTooltip() {
    this.tooltipEl.style.display = 'none';
  }

  openPanel(title, body) {
    this.panelTitleEl.textContent = title;
    this.panelBodyEl.textContent = body;
    this.panelEl.style.display = 'block';
  }
}