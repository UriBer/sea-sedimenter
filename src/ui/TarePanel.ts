import type { TareEstimate } from '../types';
import { TareManager } from '../session/TareManager';
import { i18n } from '../utils/i18n';

export class TarePanel {
  private container: HTMLElement;
  private tareManager: TareManager;
  private tareEstimate: TareEstimate | null = null;
  private onUseTareCallback: ((estimate: TareEstimate) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.tareManager = new TareManager();
    this.render();
    this.setupEventListeners();
    
    window.addEventListener('languagechange', () => {
      this.render();
      this.update();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="tare-panel card">
        <h3>${i18n.t('tareSection')}</h3>
        
        <div class="tare-input-group">
          <label for="tare-reading">${i18n.t('tareReading')} (${i18n.t('grams')})</label>
          <div class="tare-input-row">
            <input type="number" id="tare-reading" step="0.01" placeholder="0.00" class="input-large">
            <button id="btn-add-tare" class="btn btn-primary">${i18n.t('addTareReading')}</button>
          </div>
        </div>

        <div id="tare-samples-list" class="tare-samples-list"></div>

        <div id="tare-estimate" class="tare-estimate"></div>

        <div class="tare-actions">
          <button id="btn-use-tare" class="btn btn-success" disabled>${i18n.t('useThisTare')}</button>
          <button id="btn-clear-tare" class="btn btn-secondary">${i18n.t('clearTare')}</button>
        </div>

        <div class="tare-manual-override">
          <details>
            <summary>${i18n.t('manualTareOverride')}</summary>
            <div class="tare-manual-inputs">
              <div class="input-row">
                <label for="manual-bias">${i18n.t('biasTare')} (${i18n.t('grams')})</label>
                <input type="number" id="manual-bias" step="0.01" value="0">
              </div>
              <div class="input-row">
                <label for="manual-tare-unc">${i18n.t('tareUncertainty95')} (±${i18n.t('grams')}, 95%)</label>
                <input type="number" id="manual-tare-unc" step="0.01" value="0" min="0">
              </div>
              <button id="btn-use-manual-tare" class="btn btn-primary">${i18n.t('useManualTare')}</button>
            </div>
          </details>
        </div>
      </div>
    `;
    this.update();
  }

  private setupEventListeners(): void {
    const addBtn = this.container.querySelector('#btn-add-tare') as HTMLButtonElement;
    const tareInput = this.container.querySelector('#tare-reading') as HTMLInputElement;
    const useBtn = this.container.querySelector('#btn-use-tare') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('#btn-clear-tare') as HTMLButtonElement;
    const useManualBtn = this.container.querySelector('#btn-use-manual-tare') as HTMLButtonElement;

    addBtn.addEventListener('click', () => {
      const value = parseFloat(tareInput.value);
      if (!isNaN(value) && value >= 0) {
        try {
          this.tareManager.addTareSample(value);
          tareInput.value = '';
          tareInput.focus();
          this.update();
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Invalid tare reading');
        }
      }
    });

    tareInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    useBtn.addEventListener('click', () => {
      if (this.tareEstimate) {
        if (this.onUseTareCallback) {
          this.onUseTareCallback(this.tareEstimate);
        }
      }
    });

    clearBtn.addEventListener('click', () => {
      this.tareManager.clear();
      this.tareEstimate = null;
      this.update();
    });

    useManualBtn.addEventListener('click', () => {
      const bias = parseFloat((this.container.querySelector('#manual-bias') as HTMLInputElement).value) || 0;
      const unc95 = parseFloat((this.container.querySelector('#manual-tare-unc') as HTMLInputElement).value) || 0;
      
      const manualEstimate = TareManager.createManualEstimate(bias, unc95);
      if (this.onUseTareCallback) {
        this.onUseTareCallback(manualEstimate);
      }
    });
  }

  private update(): void {
    const samples = this.tareManager.getSamples();
    const estimate = this.tareManager.estimate();
    this.tareEstimate = estimate;

    // Update samples list
    const samplesList = this.container.querySelector('#tare-samples-list') as HTMLElement;
    if (samples.length === 0) {
      samplesList.innerHTML = `<div class="tare-empty">${i18n.t('noTareSamples')}</div>`;
    } else {
      samplesList.innerHTML = samples.map((sample, idx) => `
        <div class="tare-sample-entry">
          <span>#${idx + 1}: ${sample.tareReading.toFixed(2)} ${i18n.t('grams')}</span>
          <button class="btn-icon-small tare-delete" data-index="${idx}" title="${i18n.t('delete')}">×</button>
        </div>
      `).join('');

      // Attach delete handlers
      samplesList.querySelectorAll('.tare-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
          this.tareManager.removeTareSample(index);
          this.update();
        });
      });
    }

    // Update estimate display
    const estimateEl = this.container.querySelector('#tare-estimate') as HTMLElement;
    const useBtn = this.container.querySelector('#btn-use-tare') as HTMLButtonElement;

    if (estimate.count === 0) {
      estimateEl.innerHTML = '';
      useBtn.disabled = true;
    } else {
      const warning = estimate.count < 5 ? `<div class="tare-warning">⚠ ${i18n.t('lowTareSamples')}</div>` : '';
      estimateEl.innerHTML = `
        <div class="tare-estimate-display">
          <div><strong>${i18n.t('biasEstimate')}:</strong> ${estimate.biasMedian.toFixed(2)} ${i18n.t('grams')}</div>
          <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±${estimate.tareUncertainty95.toFixed(2)} ${i18n.t('grams')} (95%)</div>
          <div class="tare-count">${i18n.t('tareCount')}: ${estimate.count}</div>
          ${warning}
        </div>
      `;
      useBtn.disabled = false;
    }
  }

  /**
   * Set callback when user clicks "Use This Tare"
   */
  onUseTare(callback: (estimate: TareEstimate) => void): void {
    this.onUseTareCallback = callback;
  }

  /**
   * Get current tare estimate
   */
  getEstimate(): TareEstimate | null {
    return this.tareEstimate;
  }
}

