import type { MeasurementHistoryEntry } from '../types';
import { HistoryStorage } from '../utils/storage';
import { i18n } from '../utils/i18n';

export class History {
  private container: HTMLElement;
  private onDeleteCallback: ((id: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    window.addEventListener('languagechange', () => {
      this.render();
      this.refresh();
    });
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="history-section">
        <div class="history-header">
          <h3>${i18n.t('measurementHistory')}</h3>
          <button id="btn-clear-history" class="btn-icon" title="${i18n.t('clearAll')}">🗑️</button>
        </div>
        <div id="history-list" class="history-list">
          <div class="history-empty">${i18n.t('noMeasurements')}</div>
        </div>
      </div>
    `;

    const clearBtn = this.container.querySelector('#btn-clear-history') as HTMLButtonElement;
    clearBtn.addEventListener('click', () => {
      if (confirm(i18n.t('clearAll') + '?')) {
        HistoryStorage.clear();
        this.refresh();
      }
    });
  }

  refresh(): void {
    const history = HistoryStorage.getAll();
    const listEl = this.container.querySelector('#history-list') as HTMLElement;

    if (history.length === 0) {
      listEl.innerHTML = `<div class="history-empty">${i18n.t('noMeasurements')}</div>`;
      return;
    }

    listEl.innerHTML = history.map(entry => this.renderEntry(entry)).join('');
    
    // Attach delete handlers
    listEl.querySelectorAll('.history-entry-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const entryId = (e.target as HTMLElement).closest('.history-entry')?.getAttribute('data-id');
        if (entryId) {
          HistoryStorage.delete(entryId);
          this.refresh();
          if (this.onDeleteCallback) {
            this.onDeleteCallback(entryId);
          }
        }
      });
    });
  }

  private renderEntry(entry: MeasurementHistoryEntry): string {
    const result = entry.result;
    const isReliable = result.isReliable;
    
    // Format date/time according to current language
    const dateTime = new Date(entry.timestamp).toLocaleString(i18n.getLanguage());
    
    // Show correction status
    const correctionStatus = entry.motionCorrectionEnabled 
      ? `<span class="correction-badge correction-yes">${i18n.t('withCorrection')}</span>`
      : `<span class="correction-badge correction-no">${i18n.t('withoutCorrection')}</span>`;
    
    return `
      <div class="history-entry" data-id="${entry.id}">
        <div class="history-entry-header">
          <div class="history-entry-batch">${i18n.t('batch')}: ${entry.batchNumber}</div>
          <button class="history-entry-delete btn-icon" title="${i18n.t('delete')}">×</button>
        </div>
        <div class="history-entry-time">${dateTime} ${correctionStatus}</div>
        <div class="history-entry-result">
          <div class="history-entry-value ${isReliable ? 'reliable' : 'unreliable'}">
            ${result.fixedMeasurement.toFixed(2)} ${i18n.t('grams')}
            ${isReliable ? '' : '<span class="unreliable-badge">⚠</span>'}
          </div>
          <div class="history-entry-error">± ${result.errorBand.toFixed(2)} ${i18n.t('grams')}</div>
          <div class="history-entry-confidence">${i18n.t('confidence')}: ${(result.confidence * 100).toFixed(0)}${i18n.t('percent')}</div>
        </div>
      </div>
    `;
  }

  onDelete(callback: (id: string) => void): void {
    this.onDeleteCallback = callback;
  }
}

