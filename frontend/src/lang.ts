// Initialize i18n and handle language switching
(async function() {
    // Wait for i18n wrapper to be available
    const i18n = (window as any).i18n;
    
    if (i18n && typeof i18n.init === 'function') {
        await i18n.init();
        
        // Update all elements with data-i18n-key attribute
        document.querySelectorAll('[data-i18n-key]').forEach((el: any) => {
            const key = el.getAttribute('data-i18n-key');
            if (key) {
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = i18n.t(key);
                } else {
                    el.textContent = i18n.t(key);
                }
            }
        });
        
        console.log('✅ Language module initialized');
    } else {
        console.error('❌ i18n wrapper not found');
    }
})();
