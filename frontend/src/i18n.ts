export const i18n = {
  current: 'en',
  dict: {} as Record<string,string>,
  async load(lang: string) {
    if (this.current === lang && Object.keys(this.dict).length) return;
    try {
      const res = await fetch(`/locales/${lang}.json`);
      if (!res.ok) throw new Error('Locale not found');
      this.dict = await res.json();
      this.current = lang;
      document.documentElement.lang = lang;
      localStorage.setItem('preferred_language', lang);
      // Inform backend
      fetch('/api/i18n/set-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ language: lang })
      }).catch(()=>{});
    } catch (e) {
      console.error('Failed to load locale', e);
    }
  },
  t(key: string) {
    return this.dict[key] || key;
  },
  init() {
    const saved = localStorage.getItem('preferred_language') || (navigator.language?.split('-')[0]) || 'en';
    this.load(saved);
  }
};