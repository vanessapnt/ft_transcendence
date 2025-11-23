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
    }).catch(() => { });
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

// Expose changeLang function globally for onclick handlers in HTML
(window as any).changeLang = async (lang: string) => {
  await i18nWrapper.changeLanguage(lang);

  // Update all elements with data-i18n-key attribute
  document.querySelectorAll('[data-i18n-key]').forEach((el: any) => {
    const key = el.getAttribute('data-i18n-key');
    if (key) {
      if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
        el.placeholder = i18nWrapper.t(key);
      } else {
        el.textContent = i18nWrapper.t(key);
      }
    }
  });

  // Update tooltips (title attributes) based on button IDs
  const addFriendBtn = document.getElementById('add-friend-btn');
  if (addFriendBtn) addFriendBtn.title = i18nWrapper.t('add_friend');

  const inviteBtn = document.getElementById('invite-btn');
  if (inviteBtn) inviteBtn.title = i18nWrapper.t('invite_to_play');

  const blockBtn = document.getElementById('block-btn');
  if (blockBtn) {
    const isUnblock = blockBtn.textContent === '/unblock';
    blockBtn.title = i18nWrapper.t(isUnblock ? 'unblock_user' : 'block_user');
  }

  // Update current chat label if present
  const currentChatLabel = document.getElementById('current-chat');
  if (currentChatLabel && (window as any).PONG && (window as any).PONG.Chat) {
    const currentUser = (window as any).PONG.Chat.getCurrentChatUser ? (window as any).PONG.Chat.getCurrentChatUser() : null;
    if (currentUser) {
      currentChatLabel.textContent = `${i18nWrapper.t('conversation_with')} ${currentUser}`;
    } else {
      currentChatLabel.textContent = i18nWrapper.t('no_conversation_selected');
    }
  }
};
