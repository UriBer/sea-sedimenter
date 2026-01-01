import type { MeasurementResult } from '../types';

export class ResultCard {
  private container: HTMLElement;
  private visible = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div id="result-card" class="result-card" style="display: none;">
        <h3>Measurement Result</h3>
        <div id="result-main" class="result-main">
          <div class="result-value">--</div>
          <div class="result-error">± -- g (95%)</div>
          <div class="result-relative">± --%</div>
        </div>
        <div id="result-confidence" class="result-confidence">Confidence: --</div>
        <div id="result-diagnostics" class="result-diagnostics"></div>
        <div id="result-warning" class="result-warning" style="display: none;"></div>
      </div>
    `;
  }

  show(result: MeasurementResult | null): void {
    const card = this.container.querySelector('#result-card') as HTMLElement;
    const main = this.container.querySelector('#result-main') as HTMLElement;
    const confidence = this.container.querySelector('#result-confidence') as HTMLElement;
    const diagnostics = this.container.querySelector('#result-diagnostics') as HTMLElement;
    const warning = this.container.querySelector('#result-warning') as HTMLElement;

    if (!result || !result.isReliable) {
      card.style.display = 'none';
      this.visible = false;
      return;
    }

    card.style.display = 'block';
    this.visible = true;

    const valueEl = main.querySelector('.result-value') as HTMLElement;
    const errorEl = main.querySelector('.result-error') as HTMLElement;
    const relativeEl = main.querySelector('.result-relative') as HTMLElement;

    valueEl.textContent = `${result.fixedMeasurement.toFixed(2)} g`;
    errorEl.textContent = `± ${result.errorBand.toFixed(2)} g (95%)`;
    relativeEl.textContent = `± ${result.relativeError.toFixed(2)}%`;

    confidence.textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;

    diagnostics.innerHTML = `
      <details>
        <summary>Diagnostics</summary>
        <div class="diagnostics-grid">
          <div>Total Samples: ${result.diagnostics.nTotal}</div>
          <div>Good Samples: ${result.diagnostics.nGood} (${result.diagnostics.percentGood.toFixed(1)}%)</div>
          <div>Session RMS a_z: ${result.diagnostics.sessionRMS_az.toFixed(3)} m/s²</div>
          <div>Session RMS Roll: ${result.diagnostics.sessionRMS_roll.toFixed(2)}°</div>
          <div>Session RMS Pitch: ${result.diagnostics.sessionRMS_pitch.toFixed(2)}°</div>
          <div>σ_motion: ${result.diagnostics.sigma_motion.toFixed(3)} g</div>
          <div>σ_scale: ${result.diagnostics.sigma_scale.toFixed(3)} g</div>
          <div>σ_total: ${result.diagnostics.sigma_total.toFixed(3)} g</div>
        </div>
      </details>
    `;

    if (!result.isReliable) {
      warning.style.display = 'block';
      warning.textContent = 'Warning: Measurement may be unreliable due to high motion variance.';
      warning.className = 'result-warning warning';
    } else {
      warning.style.display = 'none';
    }
  }

  hide(): void {
    const card = this.container.querySelector('#result-card') as HTMLElement;
    card.style.display = 'none';
    this.visible = false;
  }
}

