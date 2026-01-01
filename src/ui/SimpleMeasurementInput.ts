import type { SimpleMeasurement } from '../types';
import { i18n } from '../utils/i18n';

export class SimpleMeasurementInput {
  private container: HTMLElement;
  private measurements: SimpleMeasurement[] = [];
  private lockedBias: number = 0;
  private lockedTareUnc95: number = 0;
  private sessionActive: boolean = false;
  private onAddMeasurementCallback: (() => void) | null = null;
  private onRemoveMeasurementCallback: ((index: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
    
    window.addEventListener('languagechange', () => {
      this.render();
      this.update();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="simple-measurement-panel card">
        <h3>${i18n.t('measurementSection')}</h3>
        
        <div class="measurement-session-info">
          <div class="session-bias-info">
            <div><strong>${i18n.t('biasTare')}:</strong> <span id="locked-bias">${this.lockedBias.toFixed(2)}</span> ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±<span id="locked-tare-unc">${this.lockedTareUnc95.toFixed(2)}</span> ${i18n.t('grams')} (95%)</div>
          </div>
        </div>

        <div class="measurement-input-group">
          <label for="scale-reading-measure">${i18n.t('scaleReading')} (${i18n.t('grams')})</label>
          <div class="measurement-input-row">
            <input type="number" id="scale-reading-measure" step="0.01" placeholder="0.00" class="input-large">
            <button id="btn-add-measurement" class="btn btn-success">${i18n.t('addMeasurement')}</button>
          </div>
        </div>

        <div id="measurements-list" class="measurements-list"></div>

        <div class="measurement-status">
          <div id="measurement-count">${i18n.t('measurementsCollected')}: 0</div>
        </div>
      </div>
    `;
    // Re-setup event listeners after render
    this.setupEventListeners();
    this.update();
  }

  private setupEventListeners(): void {
    const addBtn = this.container.querySelector('#btn-add-measurement') as HTMLButtonElement;
    const scaleInput = this.container.querySelector('#scale-reading-measure') as HTMLInputElement;

    if (addBtn) {
      // Remove any existing listeners by cloning the button
      const newBtn = addBtn.cloneNode(true);
      addBtn.parentNode?.replaceChild(newBtn, addBtn);
      
      // Add new listener
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.onAddMeasurementCallback) {
          this.onAddMeasurementCallback();
        } else {
          console.warn('Add measurement callback not set');
        }
      });
    }

    if (scaleInput) {
      scaleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const btn = this.container.querySelector('#btn-add-measurement') as HTMLButtonElement;
          if (btn) {
            btn.click();
          }
        }
      });
    }
  }

  /**
   * Start measurement session with locked tare values
   */
  startSession(bias: number, tareUnc95: number): void {
    this.sessionActive = true;
    this.lockedBias = bias;
    this.lockedTareUnc95 = tareUnc95;
    // Don't clear measurements, just update the display
    this.update();
  }

  /**
   * Stop measurement session
   */
  stopSession(): void {
    this.sessionActive = false;
    this.render();
  }

  /**
   * Add a measurement
   */
  addMeasurement(measurement: SimpleMeasurement): void {
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
   * Clear all measurements
   */
  clear(): void {
    this.measurements = [];
    this.update();
  }

  /**
   * Get current scale reading from input
   */
  getCurrentScaleReading(): number {
    const input = this.container.querySelector('#scale-reading-measure') as HTMLInputElement;
    const value = parseFloat(input.value);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Get base sample weight from input
   */
  getBaseSampleWeight(): number {
    const input = this.container.querySelector('#base-sample-weight') as HTMLInputElement;
    if (!input) return 150; // Default
    const value = parseFloat(input.value);
    return isNaN(value) ? 150 : value;
  }

  /**
   * Set base sample weight
   */
  setBaseSampleWeight(weight: number): void {
    this.baseSampleWeight = weight;
    const input = this.container.querySelector('#base-sample-weight') as HTMLInputElement;
    if (input) {
      input.value = weight.toString();
    }
  }

  /**
   * Clear scale reading input
   */
  clearScaleInput(): void {
    const input = this.container.querySelector('#scale-reading-measure') as HTMLInputElement;
    input.value = '';
  }

  /**
   * Update display
   */
  private update(): void {
    // Update locked values display
    const biasEl = this.container.querySelector('#locked-bias') as HTMLElement;
    const uncEl = this.container.querySelector('#locked-tare-unc') as HTMLElement;
    if (biasEl) biasEl.textContent = this.lockedBias.toFixed(2);
    if (uncEl) uncEl.textContent = this.lockedTareUnc95.toFixed(2);

    // Update measurements list
    const listEl = this.container.querySelector('#measurements-list') as HTMLElement;
    const countEl = this.container.querySelector('#measurement-count') as HTMLElement;

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
            <span class="measurement-tare-unc">| ${i18n.t('tareUncertainty95')} ±${m.tareUncertainty95.toFixed(2)} ${i18n.t('grams')} (95%)</span>
          </div>
          <button class="btn-icon-small measurement-delete" data-index="${idx}" title="${i18n.t('delete')}">×</button>
        </div>
      `).join('');

      // Attach delete handlers
      listEl.querySelectorAll('.measurement-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt((e.target as HTMLElement).getAttribute('data-index') || '0');
          this.removeMeasurement(index);
        });
      });
    }

    // Update count
    if (countEl) {
      countEl.textContent = `${i18n.t('measurementsCollected')}: ${this.measurements.length}`;
    }
  }

  /**
   * Set callback for add measurement
   */
  onAddMeasurement(callback: () => void): void {
    this.onAddMeasurementCallback = callback;
  }

  /**
   * Set callback for remove measurement
   */
  onRemoveMeasurement(callback: (index: number) => void): void {
    this.onRemoveMeasurementCallback = callback;
  }

  /**
   * Get measurements
   */
  getMeasurements(): SimpleMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get count
   */
  getCount(): number {
    return this.measurements.length;
  }
}

