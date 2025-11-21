function initLanguageSelector() {
  const container = document.getElementById('lang-selector-container');
  if (!container) {
    console.warn('lang-selector-container not found');
    return;
  }

  const langs = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'es', label: 'ES' }
  ];

  const saved = localStorage.getItem('preferred_language') || (navigator.language && navigator.language.split('-')[0]) || 'en';

  langs.forEach(l => {
    const btn = document.createElement('button');
    btn.textContent = l.label;
    btn.value = l.code;
    btn.id = `lang-btn-${l.code}`;
    if (l.code === saved) btn.classList.add('active');
    
    btn.addEventListener('click', async () => {
      changeLang(l.code);
    });

    container.appendChild(btn);
  });
}

async function changeLang(newLang) {
  localStorage.setItem('preferred_language', newLang);

  // remove active class from all buttons
  document.querySelectorAll('#lang-selector-container button').forEach(b => b.classList.remove('active'));
  document.getElementById(`lang-btn-${newLang}`).classList.add('active');

  try {
    await fetch('/api/i18n/set-language', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLang })
    });
  } catch (err) {
    console.warn('Persist language failed', err);
  }

  location.reload();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanguageSelector);
} else {
  initLanguageSelector();
}
