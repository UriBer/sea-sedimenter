import type { LiveMetrics } from '../types';
import { i18n } from '../utils/i18n';

export class Metrics {
  private container: HTMLElement;
  private a_zEl!: HTMLElement;
  private rollEl!: HTMLElement;
  private pitchEl!: HTMLElement;
  private rms_azEl!: HTMLElement;
  private rms_rollEl!: HTMLElement;
  private rms_pitchEl!: HTMLElement;
  private samplingRateEl!: HTMLElement;
  private stabilityBadge!: HTMLElement;
  private confidenceEl: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    window.addEventListener('languagechange', () => this.render());
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="metrics-panel">
        <div class="metrics-grid">
          <div class="metric-item">
            <label>${i18n.t('az')}</label>
            <span id="metric-az" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('roll')}</label>
            <span id="metric-roll" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('pitch')}</label>
            <span id="metric-pitch" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('rmsAz')}</label>
            <span id="metric-rms-az" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('rmsRoll')}</label>
            <span id="metric-rms-roll" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('rmsPitch')}</label>
            <span id="metric-rms-pitch" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('samplingRate')}</label>
            <span id="metric-sampling-rate" class="metric-value">--</span>
          </div>
          <div class="metric-item">
            <label>${i18n.t('confidence')}</label>
            <span id="metric-confidence" class="metric-value">--</span>
          </div>
        </div>
        <div id="stability-badge" class="stability-badge">${i18n.t('notStable')}</div>
      </div>
    `;

    this.a_zEl = this.container.querySelector('#metric-az') as HTMLElement;
    this.rollEl = this.container.querySelector('#metric-roll') as HTMLElement;
    this.pitchEl = this.container.querySelector('#metric-pitch') as HTMLElement;
    this.rms_azEl = this.container.querySelector('#metric-rms-az') as HTMLElement;
    this.rms_rollEl = this.container.querySelector('#metric-rms-roll') as HTMLElement;
    this.rms_pitchEl = this.container.querySelector('#metric-rms-pitch') as HTMLElement;
    this.samplingRateEl = this.container.querySelector('#metric-sampling-rate') as HTMLElement;
    this.stabilityBadge = this.container.querySelector('#stability-badge') as HTMLElement;
    this.confidenceEl = this.container.querySelector('#metric-confidence') as HTMLElement;
  }

  update(metrics: LiveMetrics | null): void {
    if (!metrics) {
      this.a_zEl.textContent = '--';
      this.rollEl.textContent = '--';
      this.pitchEl.textContent = '--';
      this.rms_azEl.textContent = '--';
      this.rms_rollEl.textContent = '--';
      this.rms_pitchEl.textContent = '--';
      this.samplingRateEl.textContent = '--';
      this.confidenceEl.textContent = '--';
      this.stabilityBadge.textContent = 'NOT STABLE';
      this.stabilityBadge.className = 'stability-badge not-stable';
      return;
    }

    this.a_zEl.textContent = metrics.a_z.toFixed(3);
    this.rollEl.textContent = metrics.roll.toFixed(2);
    this.pitchEl.textContent = metrics.pitch.toFixed(2);
    this.rms_azEl.textContent = metrics.rms_az.toFixed(3);
    this.rms_rollEl.textContent = metrics.rms_roll.toFixed(2);
    this.rms_pitchEl.textContent = metrics.rms_pitch.toFixed(2);
    this.samplingRateEl.textContent = metrics.samplingRate.toFixed(1);
    this.confidenceEl.textContent = (metrics.confidence * 100).toFixed(1) + i18n.t('percent');

    if (metrics.isStable) {
      this.stabilityBadge.textContent = i18n.t('measureOk');
      this.stabilityBadge.className = 'stability-badge stable';
    } else {
      this.stabilityBadge.textContent = i18n.t('notStable');
      this.stabilityBadge.className = 'stability-badge not-stable';
    }
  }
}

