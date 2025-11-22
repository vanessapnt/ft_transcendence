// i18next wrapper for translation management
// Uses i18next library loaded from CDN in index.html
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const i18nWrapper = {
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const savedLang = localStorage.getItem('preferred_language')
                || ((_a = navigator.language) === null || _a === void 0 ? void 0 : _a.split('-')[0])
                || 'en';
            // Fetch all translations
            const [enData, frData, esData] = yield Promise.all([
                fetch('/locales/en.json').then(r => r.json()),
                fetch('/locales/fr.json').then(r => r.json()),
                fetch('/locales/es.json').then(r => r.json())
            ]);
            // Initialize i18next with all resources
            yield i18next.init({
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
        });
    },
    changeLanguage(lang) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield i18next.changeLanguage(lang);
            document.documentElement.lang = lang;
            localStorage.setItem('preferred_language', lang);
            // Inform backend
            fetch('/api/i18n/set-language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ language: lang })
            }).catch(() => { });
            // Update WebSocket chat language if connected
            const pong = window.PONG;
            if (((_a = pong === null || pong === void 0 ? void 0 : pong.Chat) === null || _a === void 0 ? void 0 : _a.ws) && pong.Chat.ws.readyState === WebSocket.OPEN) {
                pong.Chat.ws.send(JSON.stringify({ type: "updateLanguage", language: lang }));
                console.log(`🌐 Langue du chat mise à jour: ${lang}`);
            }
        });
    },
    t(key, params) {
        return i18next.t(key, params);
    },
    getCurrentLanguage() {
        return i18next.language || 'en';
    }
};
// Expose globally for lang.js and other scripts
window.i18n = i18nWrapper;
// Expose changeLang function globally for onclick handlers in HTML
window.changeLang = (lang) => __awaiter(this, void 0, void 0, function* () {
    yield i18nWrapper.changeLanguage(lang);
    // Update all elements with data-i18n-key attribute
    document.querySelectorAll('[data-i18n-key]').forEach((el) => {
        const key = el.getAttribute('data-i18n-key');
        if (key) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = i18nWrapper.t(key);
            }
            else {
                // Check if element has a .menu-text child (for dropdown menu buttons with icons)
                const menuText = el.querySelector('.menu-text');
                if (menuText) {
                    // Only update the text span, preserving the icon
                    menuText.textContent = i18nWrapper.t(key);
                }
                else {
                    // For simple elements without children, update textContent
                    el.textContent = i18nWrapper.t(key);
                }
            }
        }
    });
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (key) {
            el.placeholder = i18nWrapper.t(key);
        }
    });
    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const key = el.getAttribute('data-i18n-title');
        if (key) {
            el.title = i18nWrapper.t(key);
        }
    });
    // Update placeholders for signup form if it exists
    const signupUsername = document.getElementById('signup-username');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('signup-password');
    const signupDisplayname = document.getElementById('signup-displayname');
    if (signupUsername)
        signupUsername.placeholder = i18nWrapper.t('signup_username_placeholder');
    if (signupEmail)
        signupEmail.placeholder = i18nWrapper.t('signup_email_placeholder');
    if (signupPassword)
        signupPassword.placeholder = i18nWrapper.t('signup_password_placeholder');
    if (signupDisplayname)
        signupDisplayname.placeholder = i18nWrapper.t('signup_displayname_placeholder');
    // Update placeholders for login form if it exists
    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    if (loginUsername)
        loginUsername.placeholder = i18nWrapper.t('login_username_placeholder');
    if (loginPassword)
        loginPassword.placeholder = i18nWrapper.t('login_password_placeholder');
    // Update tournament placeholders if tournament module exists
    const pong = window.PONG;
    if ((pong === null || pong === void 0 ? void 0 : pong.Tournament) && typeof pong.Tournament.updatePlaceholders === 'function') {
        pong.Tournament.updatePlaceholders();
    }
    // Update block button text after language change
    if ((pong === null || pong === void 0 ? void 0 : pong.Chat) && typeof pong.Chat.updateBlockButton === 'function') {
        pong.Chat.updateBlockButton();
    }
    // Update Private Messages button text if chat is visible
    const privateMessagesBtn = document.getElementById('private-messages-btn');
    const chatPanel = document.getElementById('chat-panel');
    if (privateMessagesBtn && chatPanel) {
        const menuText = privateMessagesBtn.querySelector('.menu-text');
        if (menuText) {
            // Update only the text span, preserving the icon
            if (chatPanel.style.display === 'flex') {
                menuText.textContent = i18nWrapper.t('chat_hide_messages');
            }
            else {
                menuText.textContent = i18nWrapper.t('private_messages');
            }
        }
    }
});
//# sourceMappingURL=i18n.js.map