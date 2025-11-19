var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

const i18n = {
    current: 'en',
    dict: {},
    load(lang) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.current === lang && Object.keys(this.dict).length)
                return;
            try {
                const res = yield fetch(`/locales/${lang}.json`);
                if (!res.ok)
                    throw new Error('Locale not found');
                this.dict = yield res.json();
                this.current = lang;
                document.documentElement.lang = lang;
                localStorage.setItem('preferred_language', lang);
                // Inform backend
                fetch('/api/i18n/set-language', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ language: lang })
                }).catch(() => { });
            }
            catch (e) {
                console.error('Failed to load locale', e);
            }
        });
    },
    t(key) {
        return this.dict[key] || key;
    },
    init() {
        var _a;
        const saved = localStorage.getItem('preferred_language') || ((_a = navigator.language) === null || _a === void 0 ? void 0 : _a.split('-')[0]) || 'en';
        this.load(saved);
    }
};

// Expose globally for lang.js
window.i18n = i18n;
//# sourceMappingURL=i18n.js.map