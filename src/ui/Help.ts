import { i18n } from '../utils/i18n';

export class Help {
  private container: HTMLElement;
  private modal: HTMLElement | null = null;
  private isOpen = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <button id="btn-help" class="btn-help" title="${i18n.t('help')}">❓ ${i18n.t('help')}</button>
    `;

    const helpBtn = this.container.querySelector('#btn-help') as HTMLButtonElement;
    helpBtn.addEventListener('click', () => this.toggle());

    // Listen for language changes
    window.addEventListener('languagechange', () => {
      helpBtn.textContent = `❓ ${i18n.t('help')}`;
      helpBtn.title = i18n.t('help');
      if (this.isOpen) {
        this.renderModal();
      }
    });
  }

  private toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    if (this.modal) return;
    
    this.renderModal();
    document.body.appendChild(this.modal);
    this.isOpen = true;
    
    // Close on escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  private close(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
      this.isOpen = false;
    }
  }

  private renderModal(): void {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.className = 'help-modal-overlay';
    this.modal.innerHTML = `
      <div class="help-modal">
        <div class="help-modal-header">
          <h2>${i18n.t('helpTitle')}</h2>
          <button class="help-close" title="${i18n.t('helpClose')}">×</button>
        </div>
        <div class="help-modal-content">
          <section class="help-section">
            <h3>Overview</h3>
            <p>${i18n.t('helpOverview')}</p>
          </section>
          
          <section class="help-section">
            <h3>How It Works</h3>
            <p>${i18n.t('helpHowItWorks')}</p>
          </section>
          
          <section class="help-section">
            <h3>Mathematics</h3>
            <p>${i18n.t('helpMath')}</p>
          </section>
          
          <section class="help-section">
            <h3>Motion Correction</h3>
            <p>${i18n.t('helpMotionCorrection')}</p>
          </section>
          
          <section class="help-section">
            <h3>Simple Calculation (Without Correction)</h3>
            <p>${i18n.t('helpSimpleCalculation')}</p>
            <p><strong>Important:</strong> The MEASURE button works regardless of motion correction setting. When motion correction is disabled (checkbox unchecked), the app performs simple calculation using raw scale readings (minus bias/tare) with robust statistical aggregation (median, trimmed mean). This is useful when scale filtering causes phase issues or for simpler workflows that don't require motion compensation.</p>
          </section>
          
          <section class="help-section">
            <h3>Gating & Stability</h3>
            <p>${i18n.t('helpGating')}</p>
          </section>
          
          <section class="help-section">
            <h3>Uncertainty Estimation</h3>
            <p>${i18n.t('helpUncertainty')}</p>
          </section>
        </div>
        <div class="help-modal-footer">
          <button class="btn btn-primary help-close-btn">${i18n.t('helpClose')}</button>
        </div>
      </div>
    `;

    // Close handlers
    const closeBtn = this.modal.querySelector('.help-close') as HTMLButtonElement;
    const closeBtnFooter = this.modal.querySelector('.help-close-btn') as HTMLButtonElement;
    const overlay = this.modal;

    const closeHandler = () => this.close();
    closeBtn.addEventListener('click', closeHandler);
    closeBtnFooter.addEventListener('click', closeHandler);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeHandler();
      }
    });
  }
}

