import type { MeasurementResult, SimpleMeasurementResult, RatioResult } from '../types';
import { i18n } from '../utils/i18n';

export class ResultCard {
  private container: HTMLElement;
  private visible = false;
  private motionCorrectionEnabled = true;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  setMotionCorrection(enabled: boolean): void {
    this.motionCorrectionEnabled = enabled;
  }

  private render(): void {
    this.container.innerHTML = `
      <div id="result-card" class="result-card" style="display: none;">
        <div id="result-main" class="result-main">
          <div class="result-value">--</div>
          <div class="result-error">± -- g (95%)</div>
          <div class="result-relative">± --%</div>
        </div>
        <div id="result-confidence" class="result-confidence">Confidence: --</div>
        <div id="result-correction-status" class="result-correction-status"></div>
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

    valueEl.textContent = `${result.fixedMeasurement.toFixed(2)} ${i18n.t('grams')}`;
    errorEl.textContent = `± ${result.errorBand.toFixed(2)} ${i18n.t('grams')} (95%)`;
    relativeEl.textContent = `± ${result.relativeError.toFixed(2)}${i18n.t('percent')}`;

    confidence.textContent = `${i18n.t('confidence')}: ${(result.confidence * 100).toFixed(1)}${i18n.t('percent')}`;

    const correctionStatus = this.container.querySelector('#result-correction-status') as HTMLElement;
    if (correctionStatus) {
      const correctionText = this.motionCorrectionEnabled 
        ? i18n.t('withCorrection')
        : i18n.t('withoutCorrection');
      const correctionClass = this.motionCorrectionEnabled ? 'correction-yes' : 'correction-no';
      correctionStatus.innerHTML = `<span class="correction-badge ${correctionClass}">${correctionText}</span>`;
    }

    diagnostics.innerHTML = `
      <details>
        <summary>${i18n.t('diagnostics')}</summary>
        <div class="diagnostics-grid">
          <div>${i18n.t('totalSamples')}: ${result.diagnostics.nTotal}</div>
          <div>${i18n.t('goodSamples')}: ${result.diagnostics.nGood} (${result.diagnostics.percentGood.toFixed(1)}${i18n.t('percent')})</div>
          <div>${i18n.t('sessionRMS')} a_z: ${result.diagnostics.sessionRMS_az.toFixed(3)} m/s²</div>
          <div>${i18n.t('sessionRMS')} ${i18n.t('roll')}: ${result.diagnostics.sessionRMS_roll.toFixed(2)}°</div>
          <div>${i18n.t('sessionRMS')} ${i18n.t('pitch')}: ${result.diagnostics.sessionRMS_pitch.toFixed(2)}°</div>
          <div>${i18n.t('sigmaMotion')}: ${result.diagnostics.sigma_motion.toFixed(3)} ${i18n.t('grams')}</div>
          <div>${i18n.t('sigmaScale')}: ${result.diagnostics.sigma_scale.toFixed(3)} ${i18n.t('grams')}</div>
          <div>${i18n.t('sigmaTotal')}: ${result.diagnostics.sigma_total.toFixed(3)} ${i18n.t('grams')}</div>
        </div>
      </details>
    `;

    if (!result.isReliable) {
      warning.style.display = 'block';
      warning.textContent = i18n.t('warning');
      warning.className = 'result-warning warning';
    } else {
      warning.style.display = 'none';
    }
  }

  // Removed showSimple - using showRatio instead
  //   // showSimple method removed - using showRatio instead for base/final workflow

  showRatio(result: RatioResult | null): void {
    const card = this.container.querySelector('#result-card') as HTMLElement;
    const main = this.container.querySelector('#result-main') as HTMLElement;
    const confidence = this.container.querySelector('#result-confidence') as HTMLElement;
    const diagnostics = this.container.querySelector('#result-diagnostics') as HTMLElement;
    const warning = this.container.querySelector('#result-warning') as HTMLElement;

    if (!result || result.Wbase.nTotal === 0 || result.Wfinal.nTotal === 0) {
      card.style.display = 'none';
      this.visible = false;
      return;
    }

    card.style.display = 'block';
    this.visible = true;

    const valueEl = main.querySelector('.result-value') as HTMLElement;
    const errorEl = main.querySelector('.result-error') as HTMLElement;
    const relativeEl = main.querySelector('.result-relative') as HTMLElement;

    // Main result: percent change
    valueEl.textContent = `${result.percent.toFixed(2)}${i18n.t('percent')}`;
    errorEl.textContent = `± ${result.errorBand95Percent.toFixed(2)}${i18n.t('percent')} (95%)`;
    relativeEl.textContent = `Ratio: ${result.ratio.toFixed(4)} ± ${result.errorBand95Ratio.toFixed(4)}`;

    confidence.textContent = `${i18n.t('confidence')}: k=${result.k95.toFixed(2)}, n_eff=${result.nEff}`;

    const correctionStatus = this.container.querySelector('#result-correction-status') as HTMLElement;
    if (correctionStatus) {
      correctionStatus.innerHTML = `<span class="correction-badge correction-no">${i18n.t('relativeChange')}</span>`;
    }

    // Build diagnostics
    const diagnosticsContent = `
      <details open>
        <summary>${i18n.t('diagnostics')}</summary>
        <div class="diagnostics-grid">
          <div class="diagnostics-section">
            <h4>${i18n.t('baseSession')}</h4>
            <div><strong>${i18n.t('fixedValue')}:</strong> ${result.Wbase.fixedValue.toFixed(2)} ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('errorBand95')}:</strong> ±${result.Wbase.errorBand95.toFixed(2)} ${i18n.t('grams')} (95%)</div>
            <div><strong>${i18n.t('basedOnMeasurements')}:</strong> ${result.Wbase.nTrim} (k=${result.Wbase.k95.toFixed(2)})</div>
            <div><strong>${i18n.t('biasTare')}:</strong> ${result.Wbase.bias.toFixed(2)} ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±${result.Wbase.tareUncertainty95.toFixed(2)} ${i18n.t('grams')}</div>
          </div>
          <div class="diagnostics-section">
            <h4>${i18n.t('finalSession')}</h4>
            <div><strong>${i18n.t('fixedValue')}:</strong> ${result.Wfinal.fixedValue.toFixed(2)} ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('errorBand95')}:</strong> ±${result.Wfinal.errorBand95.toFixed(2)} ${i18n.t('grams')} (95%)</div>
            <div><strong>${i18n.t('basedOnMeasurements')}:</strong> ${result.Wfinal.nTrim} (k=${result.Wfinal.k95.toFixed(2)})</div>
            <div><strong>${i18n.t('biasTare')}:</strong> ${result.Wfinal.bias.toFixed(2)} ${i18n.t('grams')}</div>
            <div><strong>${i18n.t('tareUncertainty95')}:</strong> ±${result.Wfinal.tareUncertainty95.toFixed(2)} ${i18n.t('grams')}</div>
          </div>
          <div class="diagnostics-section">
            <h4>${i18n.t('ratioCalculation')}</h4>
            <div><strong>${i18n.t('ratio')}:</strong> ${result.ratio.toFixed(4)}</div>
            <div><strong>${i18n.t('percent')}:</strong> ${result.percent.toFixed(2)}%</div>
            <div><strong>${i18n.t('sigmaRatio1Sigma')}:</strong> ${result.sigmaRatio1Sigma.toFixed(4)}</div>
            <div><strong>${i18n.t('errorBand95Percent')}:</strong> ±${result.errorBand95Percent.toFixed(2)}%</div>
            <div><strong>k-factor:</strong> ${result.k95.toFixed(2)} (n_eff=${result.nEff})</div>
          </div>
        </div>
        ${result.notes && result.notes.length > 0 ? `
          <div class="result-notes">
            <strong>${i18n.t('notes')}:</strong>
            <ul>
              ${result.notes.map(note => `<li>${note}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      </details>
    `;

    diagnostics.innerHTML = diagnosticsContent;

    // Show warnings if any
    if (result.notes && result.notes.length > 0) {
      warning.style.display = 'block';
      warning.textContent = result.notes.join('; ');
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

