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
                el.textContent = i18nWrapper.t(key);
            }
        }
    });
    // Update tooltips (title attributes) based on button IDs
    const addFriendBtn = document.getElementById('add-friend-btn');
    if (addFriendBtn)
        addFriendBtn.title = i18nWrapper.t('add_friend');
    const inviteBtn = document.getElementById('invite-btn');
    if (inviteBtn)
        inviteBtn.title = i18nWrapper.t('invite_to_play');
    const blockBtn = document.getElementById('block-btn');
    if (blockBtn) {
        const isUnblock = blockBtn.textContent === '/unblock';
        blockBtn.title = i18nWrapper.t(isUnblock ? 'unblock_user' : 'block_user');
    }
    // Update current chat label if present
    const currentChatLabel = document.getElementById('current-chat');
    if (currentChatLabel && window.PONG && window.PONG.Chat) {
        const currentUser = window.PONG.Chat.getCurrentChatUser ? window.PONG.Chat.getCurrentChatUser() : null;
        if (currentUser) {
            currentChatLabel.textContent = `${i18nWrapper.t('conversation_with')} ${currentUser}`;
        }
        else {
            currentChatLabel.textContent = i18nWrapper.t('no_conversation_selected');
        }
    }
});
//# sourceMappingURL=i18n.js.map