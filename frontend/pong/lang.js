// Language selector functionality using i18next

function setActiveLangButton(lang) {
  ['en', 'fr', 'es'].forEach(code => {
    const btn = document.getElementById(`lang-btn-${code}`);
    if (btn) {
      if (code === lang) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
}

async function changeLang(newLang) {
  console.log('Changing language to:', newLang);
  setActiveLangButton(newLang);
  
  // Use i18next to change language
  if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
    await window.i18n.changeLanguage(newLang);
    updateAllTranslations();
    console.log('✅ Translations updated via i18next');
  } else {
    console.error('window.i18n not found!');
  }
}

function updateAllTranslations() {
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    if (key && window.i18n && typeof window.i18n.t === 'function') {
      el.textContent = window.i18n.t(key);
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Lang.js loaded with i18next');
  const saved = localStorage.getItem('preferred_language') || (navigator.language && navigator.language.split('-')[0]) || 'en';
  setActiveLangButton(saved);
  
  // Initialize i18n (i18next)
  if (window.i18n && typeof window.i18n.init === 'function') {
    window.i18n.init().then(() => {
      console.log('✅ i18next ready');
      updateAllTranslations();
    });
  }
});
