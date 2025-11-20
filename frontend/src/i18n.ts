// i18next wrapper for translation management
// Uses i18next library loaded from CDN in index.html

declare const i18next: any;

const i18nWrapper = {
  async init() {
    const savedLang = localStorage.getItem('preferred_language') 
      || navigator.language?.split('-')[0] 
      || 'en';

    // Fetch all translations
    const [enData, frData, esData] = await Promise.all([
      fetch('/locales/en.json').then(r => r.json()),
      fetch('/locales/fr.json').then(r => r.json()),
      fetch('/locales/es.json').then(r => r.json())
    ]);

    // Initialize i18next with all resources
    await i18next.init({
      lng: savedLang,
      fallbackLng: 'en',
      debug: false,
      interpolation: {
        escapeValue: false // React already safes from xss
      },
      resources: {
        en: { translation: enData },
        fr: { translation: frData },
        es: { translation: esData }
      }
    });

    console.log('✅ i18next initialized with language:', savedLang);
  },

  async changeLanguage(lang: string) {
    await i18next.changeLanguage(lang);
    document.documentElement.lang = lang;
    localStorage.setItem('preferred_language', lang);
    
    // Inform backend
    fetch('/api/i18n/set-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ language: lang })
    }).catch(() => {});
  },

  t(key: string, params?: any): string {
    return i18next.t(key, params);
  },

  getCurrentLanguage(): string {
    return i18next.language || 'en';
  }
};

// Expose globally for lang.js and other scripts
(window as any).i18n = i18nWrapper;
