var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Initialize i18n and handle language switching
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        // Wait for i18n wrapper to be available
        const i18n = window.i18n;
        if (i18n && typeof i18n.init === 'function') {
            yield i18n.init();
            // Update all elements with data-i18n-key attribute
            document.querySelectorAll('[data-i18n-key]').forEach((el) => {
                const key = el.getAttribute('data-i18n-key');
                if (key) {
                    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                        el.placeholder = i18n.t(key);
                    }
                    else {
                        // Check if element has a .menu-text child (for dropdown menu buttons with icons)
                        const menuText = el.querySelector('.menu-text');
                        if (menuText) {
                            // Only update the text span, preserving the icon
                            menuText.textContent = i18n.t(key);
                        }
                        else {
                            // For simple elements without children, update textContent
                            el.textContent = i18n.t(key);
                        }
                    }
                }
            });
            // Update elements with data-i18n-placeholder attribute
            document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (key) {
                    el.placeholder = i18n.t(key);
                }
            });
            // Update elements with data-i18n-title attribute
            document.querySelectorAll('[data-i18n-title]').forEach((el) => {
                const key = el.getAttribute('data-i18n-title');
                if (key) {
                    el.title = i18n.t(key);
                }
            });
            console.log('✅ Language module initialized');
        }
        else {
            console.error('❌ i18n wrapper not found');
        }
    });
})();
//# sourceMappingURL=lang.js.map