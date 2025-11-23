var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(function () {
    const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '3000'
        ? 'http://localhost:8000'
        : '';
    // Vérifier l'intégrité du localStorage comparé à la BD
    function checkAndCleanLocalStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${API_BASE_URL}/health`);
                const data = yield response.json();
                const storedDbTimestamp = localStorage.getItem('dbTimestamp');
                const currentDbTimestamp = data.dbTimestamp;
                // Si le timestamp de la BD a changé, vider tout le localStorage du chat
                if (storedDbTimestamp && storedDbTimestamp !== currentDbTimestamp.toString()) {
                    console.log('🔄 Base de données réinitialisée, nettoyage du localStorage...');
                    // Supprimer toutes les clés de conversations du localStorage
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('chat_conversations_')) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => {
                        localStorage.removeItem(key);
                        console.log(`🗑️ Supprimé: ${key}`);
                    });
                }
                // Toujours mettre à jour le timestamp de la BD dans localStorage
                if (currentDbTimestamp) {
                    localStorage.setItem('dbTimestamp', currentDbTimestamp.toString());
                }
            }
            catch (e) {
                console.warn('⚠️ Impossible de vérifier l\'intégrité du localStorage:', e);
            }
        });
    }
    // Appeler la vérification au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndCleanLocalStorage);
    }
    else {
        checkAndCleanLocalStorage();
    }
    function setUser(username, displayName, userId, avatarUrl) {
        const userInfo = document.getElementById('user-info');
        const usernameLabel = document.getElementById('username-label');
        const logoutBtn = document.getElementById('logout-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const signupBtn = document.querySelector('.signup-btn');
        const avatarImg = document.getElementById('avatar-img');
        const loginBtn = document.querySelector('.login-btn');
        const privateMessagesBtn = document.getElementById('private-messages-btn');
        if (!userInfo || !usernameLabel || !logoutBtn || !editProfileBtn || !avatarImg) {
            console.error('UI elements not found');
            return;
        }
        // Correction : fallback si displayName ou avatarUrl est null/undefined
        const safeDisplayName = displayName || username;
        const safeAvatarUrl = avatarUrl || '/avatars/default_avatar.png';
        usernameLabel.textContent = safeDisplayName ? `${escapeHtml(safeDisplayName)} (${escapeHtml(username)})` : escapeHtml(username);
        userInfo.style.display = 'block';
        logoutBtn.style.display = 'inline-block';
        editProfileBtn.style.display = 'inline-block';
        if (loginBtn)
            loginBtn.style.display = 'none';
        if (signupBtn)
            signupBtn.style.display = 'none';
        // Créer le bouton Private Messages dynamiquement
        if (window.createPrivateMessagesButton) {
            window.createPrivateMessagesButton();
        }
        const menu = document.querySelector('.menu-buttons');
        if (menu)
            menu.style.display = '';
        window.currentUserId = userId;
        window.currentAvatarUrl = avatarUrl;
        window.currentUsername = username;
        window.currentDisplayName = displayName;
        avatarImg.src = getAvatarUrl(avatarUrl);
        avatarImg.style.display = 'inline-block';
        editProfileBtn.onclick = () => showEditProfile(username, displayName || username);
        logoutBtn.onclick = () => logout();
        hideGithubLoginIfConnected();
        // Initialiser le chat WebSocket après le login
        if (window.PONG && window.PONG.Chat && window.PONG.Chat.initializeChat) {
            console.log('🚀 Initialisation du chat après login');
            window.PONG.Chat.initializeChat();
        }
    }
    function logout() {
        // Call backend logout endpoint to destroy server-side session and instruct browser to clear cookie
        (function () {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const res = yield fetch(`${API_BASE_URL}/api/auth/logout`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                    if (!res.ok) {
                        console.warn('[Logout] API returned non-OK status:', res.status);
                    }
                    else {
                        console.log('[Logout] API success');
                    }
                }
                catch (err) {
                    console.warn('[Logout] fetch error:', err);
                }
            });
        })();
        var _a;
        // Call backend logout endpoint to destroy server-side session and instruct browser to clear cookie
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                if (!res.ok) {
                    console.warn('[Logout] API returned non-OK status:', res.status);
                }
                else {
                    console.log('[Logout] API success');
                }
            }
            catch (err) {
                console.warn('[Logout] fetch error:', err);
            }
        }))();
        // Cacher le chat s'il est ouvert
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.classList.contains('active')) {
            // Utiliser la fonction toggleChat si elle existe
            if (typeof window.toggleChat === 'function') {
                window.toggleChat();
            }
            else {
                // Sinon cacher manuellement et restaurer les écrans
                chatPanel.classList.remove('active');
                const homeView = document.getElementById('home-view');
                if (homeView) {
                    homeView.classList.add('active');
                }
            }
        }
        const userInfo = document.getElementById('user-info');
        const signupBtn = document.querySelector('.signup-btn');
        const avatarImg = document.getElementById('avatar-img');
        const loginBtn = document.querySelector('.login-btn');
        const privateMessagesBtn = document.getElementById('private-messages-btn');
        if (userInfo)
            userInfo.style.display = 'none';
        if (loginBtn)
            loginBtn.style.display = 'inline-block';
        if (signupBtn)
            signupBtn.style.display = 'inline-block';
        if (avatarImg)
            avatarImg.style.display = 'none';
        // Supprimer le bouton Private Messages
        if (window.removePrivateMessagesButton) {
            window.removePrivateMessagesButton();
        }
        window.currentUserId = null;
        window.currentAvatarUrl = null;
        window.currentUsername = null;
        window.currentDisplayName = null;
        // Restaurer la langue du navigateur en supprimant la langue préférée de l'utilisateur
        localStorage.removeItem('preferred_language');
        const browserLang = ((_a = navigator.language) === null || _a === void 0 ? void 0 : _a.split('-')[0]) || 'en';
        if (window.changeLang) {
            window.changeLang(browserLang);
            console.log(`🌐 Langue restaurée à celle du navigateur: ${browserLang}`);
        }
        console.log('✅ User logged out');
        hideGithubLoginIfConnected();
    }
    function getAvatarUrl(url) {
        const defaultUrl = '/avatars/default_avatar.png';
        if (!url)
            return defaultUrl;
        if (url.startsWith('http://') || url.startsWith('https://'))
            return url;
        if (url.startsWith('/avatars/'))
            return url;
        return `/avatars/${url}`;
    }
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        if (!text)
            return '';
        return text.replace(/[&<>"']/g, char => { var _a; return (_a = map[char]) !== null && _a !== void 0 ? _a : char; });
    }
    // Fonction utilitaire pour cacher le bouton GitHub login si connecté
    function hideGithubLoginIfConnected() {
        const githubBtn = document.getElementById('github-login-btn');
        const googleBtn = document.getElementById('google-login-btn');
        console.log('hideGithubLoginIfConnected:', { githubBtn, googleBtn, currentUserId: window.currentUserId });
        if (githubBtn) {
            if (window.currentUserId) {
                githubBtn.style.display = 'none';
            }
            else {
                githubBtn.style.display = 'inline-block';
            }
        }
        if (googleBtn) {
            if (window.currentUserId) {
                googleBtn.style.display = 'none';
            }
            else {
                googleBtn.style.display = 'inline-block';
            }
        }
    }
    function showSignup() {
        console.log('🔵 showSignup appelé');
        const form = document.getElementById('signup-form');
        const menu = document.querySelector('.menu-buttons');
        if (!form || !menu)
            return;
        const i18n = window.i18n;
        // S'assurer que le home-view est actif
        const homeView = document.getElementById('home-view');
        if (homeView && !homeView.classList.contains('active')) {
            // Désactiver tous les screens
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                screen.classList.remove('active');
            });
            // Activer home-view
            homeView.classList.add('active');
        }
        // Ajouter à l'historique
        window.history.pushState({ page: 'signup' }, '', '#signup');
        console.log('📍 Signup ajouté à l\'historique. URL:', window.location.href);
        // Masquer le menu et afficher le formulaire
        menu.style.display = 'none';
        form.style.display = 'block';
        // Réinitialiser le formulaire
        form.reset();
        const messageDiv = document.getElementById('signup-message');
        messageDiv.textContent = '';
        messageDiv.className = 'auth-message';
        // Setup form submission (only once)
        if (!form.dataset.initialized) {
            form.dataset.initialized = 'true';
            // Setup password requirements display
            const passwordInput = document.getElementById('signup-password');
            const requirementsDiv = document.getElementById('password-requirements');
            const reqLength = document.getElementById('req-length');
            if (passwordInput && requirementsDiv && reqLength) {
                // Remove old listeners to avoid duplicates
                passwordInput.removeEventListener('focus', null);
                passwordInput.removeEventListener('input', null);
                passwordInput.removeEventListener('blur', null);
                passwordInput.addEventListener('focus', () => {
                    requirementsDiv.style.display = 'block';
                });
                passwordInput.addEventListener('input', () => {
                    const password = passwordInput.value;
                    const isValid = password.length >= 6;
                    if (isValid) {
                        reqLength.classList.add('met');
                        reqLength.textContent = '✅ ' + (i18n ? i18n.t('password_req_length') : 'At least 6 characters');
                    }
                    else {
                        reqLength.classList.remove('met');
                        reqLength.textContent = '❌ ' + (i18n ? i18n.t('password_req_length') : 'At least 6 characters');
                    }
                });
                passwordInput.addEventListener('blur', () => {
                    if (!passwordInput.value) {
                        requirementsDiv.style.display = 'none';
                    }
                });
            }
            form.onsubmit = (e) => __awaiter(this, void 0, void 0, function* () {
                e.preventDefault();
                const username = document.getElementById('signup-username').value.trim();
                const email = document.getElementById('signup-email').value.trim();
                const password = document.getElementById('signup-password').value;
                const display_name = document.getElementById('signup-displayname').value.trim();
                const messageDiv = document.getElementById('signup-message');
                messageDiv.textContent = '';
                if (!username || !email || !password || !display_name) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('signup_error_required') : 'All fields are required';
                    return;
                }
                try {
                    const res = yield fetch(`${API_BASE_URL}/api/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ username, email, password, display_name })
                    });
                    const text = yield res.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    }
                    catch (err) {
                        data = { error: 'Invalid JSON from backend' };
                    }
                    const user = data.user;
                    if (res.ok && user && user.username && user.display_name && user.id) {
                        messageDiv.className = 'auth-message success';
                        messageDiv.textContent = i18n ? i18n.t('signup_success') : 'Registration successful!';
                        setUser(user.username, user.display_name, user.id, user.avatar_path || '/avatars/default_avatar.png');
                        form.style.display = 'none';
                        menu.style.display = '';
                    }
                    else {
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = data.error || data.message || (i18n ? i18n.t('signup_error_failed') : 'Registration failed');
                    }
                }
                catch (err) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('signup_error_server') : 'Server error: unable to connect';
                    console.error('Signup error:', err);
                }
            });
            document.getElementById('cancel-signup').onclick = () => {
                form.style.display = 'none';
                menu.style.display = '';
            };
            document.getElementById('show-login-from-signup').onclick = () => {
                form.style.display = 'none';
                showLogin();
            };
        }
    }
    function showLogin() {
        console.log('🔵 showLogin appelé');
        const form = document.getElementById('login-form');
        const menu = document.querySelector('.menu-buttons');
        if (!form || !menu)
            return;
        const i18n = window.i18n;
        // S'assurer que le home-view est actif
        const homeView = document.getElementById('home-view');
        if (homeView && !homeView.classList.contains('active')) {
            // Désactiver tous les screens
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                screen.classList.remove('active');
            });
            // Activer home-view
            homeView.classList.add('active');
        }
        // Ajouter à l'historique
        window.history.pushState({ page: 'login' }, '', '#login');
        console.log('📍 Login ajouté à l\'historique. URL:', window.location.href);
        // Masquer le menu et afficher le formulaire
        menu.style.display = 'none';
        form.style.display = 'block';
        // Réinitialiser le formulaire
        form.reset();
        const messageDiv = document.getElementById('login-message');
        messageDiv.textContent = '';
        messageDiv.className = 'auth-message';
        // Setup form submission (only once)
        if (!form.dataset.initialized) {
            form.dataset.initialized = 'true';
            form.onsubmit = (e) => __awaiter(this, void 0, void 0, function* () {
                e.preventDefault();
                console.log('submit login-form');
                const usernameInput = document.getElementById('login-username');
                const passwordInput = document.getElementById('login-password');
                const messageDiv = document.getElementById('login-message');
                if (!usernameInput || !passwordInput || !messageDiv) {
                    console.error('Login form elements not found');
                    return;
                }
                const username = usernameInput.value.trim();
                const password = passwordInput.value;
                messageDiv.textContent = '';
                if (!username || !password) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('login_error_required') : 'Username and password are required';
                    return;
                }
                try {
                    const res = yield fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ username, password })
                    });
                    const data = yield res.json();
                    const user = data.user;
                    if (res.ok && user.username && user.display_name && user.id) {
                        messageDiv.className = 'auth-message success';
                        messageDiv.textContent = i18n ? i18n.t('login_success') : 'Login successful!';
                        setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                        form.style.display = 'none';
                        menu.style.display = '';
                        const userInfo = document.getElementById('user-info');
                        if (userInfo)
                            userInfo.style.display = 'block';
                    }
                    else {
                        messageDiv.className = 'auth-message error';
                        let reason = data.error || data.message || '';
                        if (!reason) {
                            if (res.status === 401) {
                                reason = i18n ? i18n.t('login_error_invalid') : 'Invalid username or password.';
                            }
                            else if (res.status === 404) {
                                reason = i18n ? i18n.t('login_error_notfound') : 'User not found.';
                            }
                            else {
                                reason = i18n ? i18n.t('login_error_failed') : 'Login failed (unknown error)';
                            }
                        }
                        messageDiv.textContent = reason;
                    }
                }
                catch (err) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('login_error_server') : 'Server error: unable to connect';
                    console.error('Login error:', err);
                }
            });
            document.getElementById('cancel-login').onclick = () => {
                form.style.display = 'none';
                menu.style.display = '';
            };
            document.getElementById('show-signup-from-login').onclick = () => {
                form.style.display = 'none';
                showSignup();
            };
        }
    }
    function showEditProfile(currentUsername, currentDisplayName) {
        const panel = document.getElementById('edit-profile-panel');
        const form = document.getElementById('edit-profile-form');
        if (!panel || !form)
            return;
        const currentAvatarUrl = window.currentAvatarUrl;
        const i18n = window.i18n;
        // Pre-fill form with current values
        const avatarPreview = document.getElementById('edit-avatar-preview');
        const usernameDisplay = document.getElementById('edit-username-display');
        const displayNameInput = document.getElementById('edit-display-name');
        const fileInput = document.getElementById('edit-avatar-input');
        const filenameSpan = document.getElementById('edit-avatar-filename');
        const messageDiv = document.getElementById('edit-profile-message');
        if (avatarPreview)
            avatarPreview.src = getAvatarUrl(currentAvatarUrl);
        if (usernameDisplay)
            usernameDisplay.value = currentUsername;
        if (displayNameInput)
            displayNameInput.value = currentDisplayName;
        if (messageDiv)
            messageDiv.textContent = '';
        // Show panel
        panel.classList.add('active');
        // Handle language selector
        const currentLang = i18n ? i18n.getCurrentLanguage() : 'en';
        let selectedLanguage = currentLang;
        const langButtons = form.querySelectorAll('.lang-option');
        langButtons.forEach(btn => {
            const button = btn;
            if (button.dataset.lang === currentLang) {
                button.classList.add('active');
            }
            button.onclick = () => {
                langButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                selectedLanguage = button.dataset.lang || 'en';
            };
        });
        // Handle file input
        if (fileInput && filenameSpan) {
            fileInput.onchange = () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    filenameSpan.textContent = fileInput.files[0].name;
                    // Preview the selected image
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        var _a;
                        if (avatarPreview && ((_a = e.target) === null || _a === void 0 ? void 0 : _a.result)) {
                            avatarPreview.src = e.target.result;
                        }
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                }
                else {
                    filenameSpan.textContent = i18n ? i18n.t('no_file_chosen') : 'No file chosen';
                }
            };
        }
        // Handle cancel button
        const cancelBtn = document.getElementById('cancel-edit-profile');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                window.history.back();
            };
        }
        // Handle form submission
        form.onsubmit = (e) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            e.preventDefault();
            const display_name = displayNameInput === null || displayNameInput === void 0 ? void 0 : displayNameInput.value.trim();
            if (!messageDiv)
                return;
            const avatarFile = (_a = fileInput === null || fileInput === void 0 ? void 0 : fileInput.files) === null || _a === void 0 ? void 0 : _a[0];
            let updateOk = true;
            let dataAvatar = undefined;
            messageDiv.textContent = '';
            if (!display_name) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = i18n ? i18n.t('edit_profile_error_required') : 'Display name is required';
                return;
            }
            try {
                // Update profile (display name and language)
                const res = yield fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ display_name, preferred_language: selectedLanguage })
                });
                const data = yield res.json();
                if (!res.ok) {
                    updateOk = false;
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = data.error || (i18n ? i18n.t('edit_profile_error_failed') : 'Update failed');
                }
                // Update avatar if provided
                if (avatarFile && updateOk) {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    const resAvatar = yield fetch(`${API_BASE_URL}/api/user/avatar`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    dataAvatar = yield resAvatar.json();
                    if (resAvatar.ok && (dataAvatar.avatar_url || dataAvatar.avatar_path ||
                        (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path)))) {
                        const avatarImg = document.getElementById('avatar-img');
                        const newAvatarUrl = getAvatarUrl(dataAvatar.avatar_url || dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path)));
                        if (avatarImg)
                            avatarImg.src = newAvatarUrl;
                        if (avatarPreview)
                            avatarPreview.src = newAvatarUrl;
                        window.currentAvatarUrl = dataAvatar.avatar_url || dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path));
                    }
                    else {
                        updateOk = false;
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = (dataAvatar === null || dataAvatar === void 0 ? void 0 : dataAvatar.error) || (i18n ? i18n.t('edit_profile_error_avatar') : 'Avatar upload failed');
                    }
                }
                if (updateOk) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = i18n ? i18n.t('edit_profile_success') : 'Profile updated!';
                    // Change language if it was updated
                    if (selectedLanguage !== currentLang && window.changeLang) {
                        yield window.changeLang(selectedLanguage);
                    }
                    const finalAvatar = (((_b = dataAvatar === null || dataAvatar === void 0 ? void 0 : dataAvatar.user) === null || _b === void 0 ? void 0 : _b.avatar_path) || ((_c = dataAvatar === null || dataAvatar === void 0 ? void 0 : dataAvatar.user) === null || _c === void 0 ? void 0 : _c.avatar_url)) ||
                        ((dataAvatar === null || dataAvatar === void 0 ? void 0 : dataAvatar.avatar_path) || (dataAvatar === null || dataAvatar === void 0 ? void 0 : dataAvatar.avatar_url)) ||
                        window.currentAvatarUrl;
                    setUser(currentUsername, display_name, window.currentUserId, finalAvatar);
                    // Close form after short delay
                    setTimeout(() => {
                        window.history.back();
                    }, 1000);
                }
            }
            catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = i18n ? i18n.t('edit_profile_error_server') : 'Server error';
                console.error('Edit profile error:', err);
            }
        });
    }
    // // Au chargement de la page, déconnexion automatique PUIS récupération du profil (dev only)
    // window.addEventListener('DOMContentLoaded', async () => {
    //     try {
    //         // Déconnexion automatique (dev only)
    //         await fetch(`${API_BASE_URL}/api/auth/logout`, {
    //             method: 'POST',
    //             credentials: 'include'
    //         });
    //     } catch (err) {
    //         // ignore
    //     }
    //     try {
    //         // Récupération du profil (sera vide après logout)
    //         const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
    //             credentials: 'include'
    //         });
    //         if (res.ok) {
    //             const data = await res.json();
    //             const user = data.user;
    //             if (user && user.username && user.display_name && user.id) {
    //                 setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
    //             }
    //         }
    //     } catch (err) {
    //         // ignore
    //     }
    // });
    window.addEventListener('DOMContentLoaded', () => __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield fetch(`${API_BASE_URL}/api/user/profile`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = yield res.json();
                const user = data.user;
                if (user && user.username && user.display_name && user.id) {
                    setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                }
            }
        }
        catch (err) {
            // ignore
        }
    }));
    // Si pas connecté, cacher les éléments utilisateur
    const userInfo = document.getElementById('user-info');
    const avatarImg = document.getElementById('avatar-img');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    if (userInfo)
        userInfo.style.display = 'none';
    if (avatarImg)
        avatarImg.style.display = 'none';
    if (loginBtn)
        loginBtn.style.display = 'inline-block';
    if (signupBtn)
        signupBtn.style.display = 'inline-block';
    if (!window.PONG) {
        window.PONG = {};
    }
    window.PONG.showSignup = showSignup;
    window.PONG.showLogin = showLogin;
    window.PONG.showEditProfile = showEditProfile;
    window.PONG.setUser = setUser;
    window.PONG.logout = logout;
    window.PONG.oauthLogin = function () {
        window.location.href = '/api/oauth/login/github';
    };
    window.PONG.oauthGoogleLogin = function () {
        window.location.href = '/api/oauth/login/google';
    };
    window.showSignup = showSignup;
    window.showLogin = showLogin;
    console.log('✅ User module loaded');
})();
//# sourceMappingURL=user.js.map