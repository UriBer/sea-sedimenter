import { i18n, type Language } from '../utils/i18n';

export class LanguageSelector {
  private container: HTMLElement;
  private select: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    const languages = i18n.getAvailableLanguages();
    const currentLang = i18n.getLanguage();

    this.container.innerHTML = `
      <div class="language-selector">
        <label for="language-select">🌐</label>
        <select id="language-select" class="language-select">
          ${languages.map(lang => 
            `<option value="${lang.code}" ${lang.code === currentLang ? 'selected' : ''}>${lang.name}</option>`
          ).join('')}
        </select>
      </div>
    `;

    this.select = this.container.querySelector('#language-select') as HTMLSelectElement;
    this.select.addEventListener('change', (e) => {
      const lang = (e.target as HTMLSelectElement).value as Language;
      i18n.setLanguage(lang);
    });

    // Listen for language changes to update selected option
    window.addEventListener('languagechange', () => {
      this.select.value = i18n.getLanguage();
    });
  }
}

