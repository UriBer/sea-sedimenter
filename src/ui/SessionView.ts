import { i18n } from '../utils/i18n';

export class SessionView {
  private container: HTMLElement;
  private statusEl: HTMLElement;
  private elapsedEl: HTMLElement;
  private progressEl: HTMLElement;
  private qualityEl: HTMLElement;
  private samplesEl: HTMLElement | null = null;
  private goodEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    window.addEventListener('languagechange', () => this.render());
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="session-view">
        <div id="session-status" class="session-status">${i18n.t('ready')}</div>
        <div class="session-info">
          <div>${i18n.t('elapsed')}: <span id="session-elapsed">0.0</span>${i18n.t('seconds')}</div>
          <div>${i18n.t('samples')}: <span id="session-samples">0</span> (<span id="session-good">0</span> ${i18n.t('good')})</div>
        </div>
        <div class="progress-bar">
          <div id="session-progress" class="progress-fill" style="width: 0%"></div>
        </div>
        <div id="session-quality" class="session-quality">${i18n.t('quality')}: --</div>
      </div>
    `;

    this.statusEl = this.container.querySelector('#session-status') as HTMLElement;
    this.elapsedEl = this.container.querySelector('#session-elapsed') as HTMLElement;
    this.progressEl = this.container.querySelector('#session-progress') as HTMLElement;
    this.qualityEl = this.container.querySelector('#session-quality') as HTMLElement;
    this.samplesEl = this.container.querySelector('#session-samples') as HTMLElement;
    this.goodEl = this.container.querySelector('#session-good') as HTMLElement;
  }

  update(active: boolean, elapsed: number, sampleCount: number, goodCount: number, targetDuration: number = 10): void {
    if (active) {
      this.statusEl.textContent = i18n.t('measuring');
      this.statusEl.className = 'session-status measuring';
      this.elapsedEl.textContent = elapsed.toFixed(1);
      
      if (this.samplesEl) this.samplesEl.textContent = sampleCount.toString();
      if (this.goodEl) this.goodEl.textContent = goodCount.toString();
      
      const progress = Math.min(100, (elapsed / targetDuration) * 100);
      this.progressEl.style.width = `${progress}%`;
      
      const percentGood = sampleCount > 0 ? (goodCount / sampleCount) * 100 : 0;
      this.qualityEl.textContent = `${i18n.t('quality')}: ${percentGood.toFixed(1)}${i18n.t('percent')} ${i18n.t('good')}`;
      
      if (percentGood > 80) {
        this.qualityEl.className = 'session-quality good';
      } else if (percentGood > 50) {
        this.qualityEl.className = 'session-quality moderate';
      } else {
        this.qualityEl.className = 'session-quality poor';
      }
    } else {
      this.statusEl.textContent = i18n.t('ready');
      this.statusEl.className = 'session-status ready';
      this.elapsedEl.textContent = '0.0';
      this.progressEl.style.width = '0%';
      this.qualityEl.textContent = `${i18n.t('quality')}: --`;
      this.qualityEl.className = 'session-quality';
    }
  }
}

