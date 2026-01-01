import type { ManualMeasurement, SessionKind, TareEstimate, SessionResult } from '../types';
import { TareManager } from '../session/TareManager';
import { i18n } from '../utils/i18n';

export class SessionPanel {
  private container: HTMLElement;
  private kind: SessionKind;
  private tareManager: TareManager;
  private measurements: ManualMeasurement[] = [];
  private lockedTareEstimate: TareEstimate | null = null;
  private sessionActive: boolean = false;
  private sessionResult: SessionResult | null = null;
  private onAddMeasurementCallback: (() => void) | null = null;
  private onRemoveMeasurementCallback: ((index: number) => void) | null = null;
  private onStartSessionCallback: (() => void) | null = null;
  private onStopSessionCallback: (() => void) | null = null;
  private onUseTareCallback: ((estimate: TareEstimate) => void) | null = null;

  constructor(container: HTMLElement, kind: SessionKind) {
    this.container = container;
    this.kind = kind;
    this.tareManager = new TareManager();
    this.render();
    this.setupEventListeners();
    
    window.addEventListener('languagechange', () => {
      this.render();
      this.update();
    });
  }

  private render(): void {
    const kindLabel = this.kind === 'base' ? i18n.t('baseSession') : i18n.t('finalSession');
    const kindLabelShort = this.kind === 'base' ? i18n.t('base') : i18n.t('final');
    
    this.container.innerHTML = `
      <div class="session-panel card">
        <h3>${kindLabel}</h3>
        
        <!-- Tare Section -->
        <div class="tare-section">
          <h4>${i18n.t('tareSection')} (${kindLabelShort})</h4>
          <div class="tare-input-group">
            <label for="tare-reading-${this.kind}">${i18n.t('tareReading')} (${i18n.t('grams')})</label>
            <div class="tare-input-row">
              <input type="number" id="tare-reading-${this.kind}" step="0.01" placeholder="0.00" class="input-medium">
              <button id="btn-add-tare-${this.kind}" class="btn btn-primary">${i18n.t('addTareReading')}</button>
            </div>
          </div>
          <div id="tare-samples-list-${this.kind}" class="tare-samples-list"></div>
          <div id="tare-estimate-${this.kind}" class="tare-estimate"></div>
          <div class="tare-actions">
            <button id="btn-use-tare-${this.kind}" class="btn btn-success" disabled>${i18n.t('useThisTare')}</button>
            <button id="btn-clear-tare-${this.kind}" class="btn btn-secondary">${i18n.t('clearTare')}</button>
          </div>
        </div>

        <!-- Session Info -->
        <div class="session-info" id="session-info-${this.kind}">
          <div class="session-bias-info">
            <div><strong>${i18n.t('biasTare')}:</strong> <span id="locked-bias-${this.kind}">0.00</span> ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±<span id="locked-tare-unc-${this.kind}">0.00</span> ${i18n.t('grams')} (95%)</div>
          </div>
        </div>

        <!-- Measurement Input -->
        <div class="measurement-input-group">
          <label for="scale-reading-${this.kind}">${i18n.t('scaleReading')} (${i18n.t('grams')})</label>
          <div class="measurement-input-row">
            <input type="number" id="scale-reading-${this.kind}" step="0.01" placeholder="0.00" class="input-large">
            <button id="btn-add-measurement-${this.kind}" class="btn btn-success" disabled>${i18n.t('addMeasurement')}</button>
          </div>
        </div>

        <!-- Session Controls -->
        <div class="session-controls">
          <button id="btn-start-${this.kind}" class="btn btn-primary">${i18n.t('start')} ${kindLabelShort.toUpperCase()}</button>
          <button id="btn-stop-${this.kind}" class="btn btn-warning" disabled>${i18n.t('stop')} ${kindLabelShort.toUpperCase()}</button>
        </div>

        <!-- Measurements List -->
        <div id="measurements-list-${this.kind}" class="measurements-list"></div>

        <!-- Session Status -->
        <div class="session-status">
          <div id="measurement-count-${this.kind}">${i18n.t('measurementsCollected')}: 0</div>
        </div>

        <!-- Session Result Summary -->
        <div id="session-result-${this.kind}" class="session-result-summary" style="display: none;"></div>
      </div>
    `;
    this.setupEventListeners();
    this.update();
  }

  private setupEventListeners(): void {
    // Tare controls
    const addTareBtn = this.container.querySelector(`#btn-add-tare-${this.kind}`) as HTMLButtonElement;
    const tareInput = this.container.querySelector(`#tare-reading-${this.kind}`) as HTMLInputElement;
    const useTareBtn = this.container.querySelector(`#btn-use-tare-${this.kind}`) as HTMLButtonElement;
    const clearTareBtn = this.container.querySelector(`#btn-clear-tare-${this.kind}`) as HTMLButtonElement;

    if (addTareBtn && tareInput) {
      addTareBtn.addEventListener('click', () => {
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
          addTareBtn.click();
        }
      });
    }

    if (useTareBtn) {
      useTareBtn.addEventListener('click', () => {
        const estimate = this.tareManager.estimate();
        if (estimate.count > 0 || estimate.method === 'userEntered') {
          this.lockedTareEstimate = estimate;
          if (this.onUseTareCallback) {
            this.onUseTareCallback(estimate);
          }
          this.update();
        }
      });
    }

    if (clearTareBtn) {
      clearTareBtn.addEventListener('click', () => {
        this.tareManager.clear();
        this.update();
      });
    }

    // Session controls
    const startBtn = this.container.querySelector(`#btn-start-${this.kind}`) as HTMLButtonElement;
    const stopBtn = this.container.querySelector(`#btn-stop-${this.kind}`) as HTMLButtonElement;
    const addMeasurementBtn = this.container.querySelector(`#btn-add-measurement-${this.kind}`) as HTMLButtonElement;
    const scaleInput = this.container.querySelector(`#scale-reading-${this.kind}`) as HTMLInputElement;

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (this.onStartSessionCallback) {
          this.onStartSessionCallback();
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        if (this.onStopSessionCallback) {
          this.onStopSessionCallback();
        }
      });
    }

    if (addMeasurementBtn) {
      addMeasurementBtn.addEventListener('click', () => {
        if (this.onAddMeasurementCallback) {
          this.onAddMeasurementCallback();
        }
      });
    }

    if (scaleInput) {
      scaleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.sessionActive) {
          addMeasurementBtn?.click();
        }
      });
    }
  }

  /**
   * Start session
   */
  startSession(_bias: number, _tareUnc95: number): void {
    this.sessionActive = true;
    this.measurements = [];
    this.update();
  }

  /**
   * Stop session
   */
  stopSession(): void {
    this.sessionActive = false;
    this.update();
  }

  /**
   * Add a measurement
   */
  addMeasurement(measurement: ManualMeasurement): void {
    this.measurements.push(measurement);
    this.update();
  }

  /**
   * Remove a measurement
   */
  removeMeasurement(index: number): void {
    if (index >= 0 && index < this.measurements.length) {
      this.measurements.splice(index, 1);
      this.update();
      if (this.onRemoveMeasurementCallback) {
        this.onRemoveMeasurementCallback(index);
      }
    }
  }

  /**
   * Set session result
   */
  setSessionResult(result: SessionResult | null): void {
    this.sessionResult = result;
    this.update();
  }

  /**
   * Get current scale reading from input
   */
  getCurrentScaleReading(): number {
    const input = this.container.querySelector(`#scale-reading-${this.kind}`) as HTMLInputElement;
    const value = parseFloat(input?.value || '0');
    return isNaN(value) ? 0 : value;
  }

  /**
   * Clear scale reading input
   */
  clearScaleInput(): void {
    const input = this.container.querySelector(`#scale-reading-${this.kind}`) as HTMLInputElement;
    if (input) input.value = '';
  }

  /**
   * Get measurements
   */
  getMeasurements(): ManualMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get locked tare estimate
   */
  getLockedTareEstimate(): TareEstimate | null {
    return this.lockedTareEstimate;
  }

  /**
   * Update display
   */
  private update(): void {
    // Update tare estimate display
    const tareEstimate = this.tareManager.estimate();
    const tareSamples = this.tareManager.getSamples();
    const tareSamplesList = this.container.querySelector(`#tare-samples-list-${this.kind}`) as HTMLElement;
    const tareEstimateEl = this.container.querySelector(`#tare-estimate-${this.kind}`) as HTMLElement;
    const useTareBtn = this.container.querySelector(`#btn-use-tare-${this.kind}`) as HTMLButtonElement;

    if (tareSamplesList) {
      if (tareSamples.length === 0) {
        tareSamplesList.innerHTML = `<div class="tare-empty">${i18n.t('noTareSamples')}</div>`;
      } else {
        tareSamplesList.innerHTML = tareSamples.map((sample, idx) => `
          <div class="tare-sample-entry">
            <span>#${idx + 1}: ${sample.tareReading.toFixed(2)} ${i18n.t('grams')}</span>
            <button class="btn-icon-small tare-delete" data-index="${idx}" title="${i18n.t('delete')}">×</button>
          </div>
        `).join('');

        tareSamplesList.querySelectorAll('.tare-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
            this.tareManager.removeTareSample(index);
            this.update();
          });
        });
      }
    }

    if (tareEstimateEl) {
      if (tareEstimate.count === 0) {
        tareEstimateEl.innerHTML = '';
        if (useTareBtn) useTareBtn.disabled = true;
      } else {
        const warning = tareEstimate.count < 5 ? `<div class="tare-warning">⚠ ${i18n.t('lowTareSamples')}</div>` : '';
        tareEstimateEl.innerHTML = `
          <div class="tare-estimate-display">
            <div><strong>${i18n.t('biasEstimate')}:</strong> ${tareEstimate.biasMedian.toFixed(2)} ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±${tareEstimate.tareUncertainty95.toFixed(2)} ${i18n.t('grams')} (95%)</div>
            <div class="tare-count">${i18n.t('tareCount')}: ${tareEstimate.count}</div>
            ${warning}
          </div>
        `;
        if (useTareBtn) useTareBtn.disabled = false;
      }
    }

    // Update locked values display
    const biasEl = this.container.querySelector(`#locked-bias-${this.kind}`) as HTMLElement;
    const uncEl = this.container.querySelector(`#locked-tare-unc-${this.kind}`) as HTMLElement;
    if (biasEl && this.lockedTareEstimate) {
      biasEl.textContent = this.lockedTareEstimate.biasMedian.toFixed(2);
    }
    if (uncEl && this.lockedTareEstimate) {
      uncEl.textContent = this.lockedTareEstimate.tareUncertainty95.toFixed(2);
    }

    // Update measurements list
    const listEl = this.container.querySelector(`#measurements-list-${this.kind}`) as HTMLElement;
    const countEl = this.container.querySelector(`#measurement-count-${this.kind}`) as HTMLElement;

    if (listEl) {
      if (this.measurements.length === 0) {
        listEl.innerHTML = `<div class="measurements-empty">${i18n.t('noMeasurementsYet')}</div>`;
      } else {
        listEl.innerHTML = this.measurements.map((m, idx) => `
          <div class="measurement-entry">
            <div class="measurement-entry-content">
              <span class="measurement-number">#${idx + 1}:</span>
              <span class="measurement-details">
                ${m.scaleReading.toFixed(2)} ${i18n.t('grams')} - ${i18n.t('biasTare')} ${m.bias.toFixed(2)} ${i18n.t('grams')} = 
                <strong>${m.correctedValue.toFixed(2)} ${i18n.t('grams')}</strong>
              </span>
            </div>
            <button class="btn-icon-small measurement-delete" data-index="${idx}" title="${i18n.t('delete')}">×</button>
          </div>
        `).join('');

        listEl.querySelectorAll('.measurement-delete').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
            this.removeMeasurement(index);
          });
        });
      }
    }

    if (countEl) {
      countEl.textContent = `${i18n.t('measurementsCollected')}: ${this.measurements.length}`;
    }

    // Update button states
    const startBtn = this.container.querySelector(`#btn-start-${this.kind}`) as HTMLButtonElement;
    const stopBtn = this.container.querySelector(`#btn-stop-${this.kind}`) as HTMLButtonElement;
    const addBtn = this.container.querySelector(`#btn-add-measurement-${this.kind}`) as HTMLButtonElement;

    if (startBtn) startBtn.disabled = this.sessionActive;
    if (stopBtn) stopBtn.disabled = !this.sessionActive;
    if (addBtn) addBtn.disabled = !this.sessionActive;

    // Update session result summary
    const resultEl = this.container.querySelector(`#session-result-${this.kind}`) as HTMLElement;
    if (resultEl && this.sessionResult && this.sessionResult.nTotal > 0) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="session-result-content">
          <h4>${i18n.t('sessionResult')}</h4>
          <div><strong>${i18n.t('fixedValue')}:</strong> ${this.sessionResult.fixedValue.toFixed(2)} ${i18n.t('grams')}</div>
          <div><strong>${i18n.t('errorBand95')}:</strong> ±${this.sessionResult.errorBand95.toFixed(2)} ${i18n.t('grams')} (95%)</div>
          <div><strong>${i18n.t('basedOnMeasurements')}:</strong> ${this.sessionResult.nTrim} (k=${this.sessionResult.k95.toFixed(2)})</div>
        </div>
      `;
    } else if (resultEl) {
      resultEl.style.display = 'none';
    }
  }

  /**
   * Set callbacks
   */
  onAddMeasurement(callback: () => void): void {
    this.onAddMeasurementCallback = callback;
  }

  onRemoveMeasurement(callback: (index: number) => void): void {
    this.onRemoveMeasurementCallback = callback;
  }

  onStartSession(callback: () => void): void {
    this.onStartSessionCallback = callback;
  }

  onStopSession(callback: () => void): void {
    this.onStopSessionCallback = callback;
  }

  onUseTare(callback: (estimate: TareEstimate) => void): void {
    this.onUseTareCallback = callback;
  }
}

