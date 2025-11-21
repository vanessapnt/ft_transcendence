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
        // Cacher le chat s'il est ouvert
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.style.display !== 'none') {
            // Utiliser la fonction toggleChat si elle existe
            if (typeof window.toggleChat === 'function') {
                window.toggleChat();
            }
            else {
                // Sinon cacher manuellement et restaurer les écrans
                chatPanel.style.display = 'none';
                const screens = document.querySelectorAll('.screen');
                const privateMessagesBtn = document.getElementById('private-messages-btn');
                screens.forEach(screen => {
                    screen.style.display = '';
                });
                if (privateMessagesBtn) {
                    privateMessagesBtn.textContent = 'Private Messages';
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
        var _a;
        if (document.getElementById('signup-form'))
            return;
        const menu = document.querySelector('.menu-buttons');
        if (!menu)
            return;
        const i18n = window.i18n;
        // Masquer le menu
        menu.style.display = 'none';
        // Créer le formulaire
        const form = document.createElement('form');
        form.id = 'signup-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2 data-i18n-key="signup_form_title">${i18n ? i18n.t('signup_form_title') : 'Sign Up'}</h2>
        <input type="text" id="signup-username" placeholder="${i18n ? i18n.t('signup_username_placeholder') : 'Username'}" required>
        <input type="email" id="signup-email" placeholder="${i18n ? i18n.t('signup_email_placeholder') : 'Email'}" required>
        <input type="password" id="signup-password" placeholder="${i18n ? i18n.t('signup_password_placeholder') : 'Password'}" required>
        <input type="text" id="signup-displayname" placeholder="${i18n ? i18n.t('signup_displayname_placeholder') : 'Display Name'}" required>
        <div class="auth-btn-row">
            <button type="submit" class="auth-submit-btn" data-i18n-key="signup_submit">${i18n ? i18n.t('signup_submit') : 'Register'}</button>
            <button type="button" id="show-login" class="auth-switch-btn" data-i18n-key="already_have_account">${i18n ? i18n.t('already_have_account') : 'Login'}</button>
        </div>
        <button type="button" id="cancel-signup" class="auth-cancel-btn" data-i18n-key="signup_cancel">${i18n ? i18n.t('signup_cancel') : 'Cancel'}</button>
        <div id="signup-message" class="auth-message"></div>
    `;
        (_a = menu.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(form);
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
                    form.remove();
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
            form.remove();
            menu.style.display = '';
        };
        document.getElementById('show-login').onclick = () => {
            form.remove();
            menu.style.display = '';
            showLogin();
        };
    }
    function showLogin() {
        var _a;
        if (document.getElementById('login-form'))
            return;
        const menu = document.querySelector('.menu-buttons');
        if (!menu)
            return;
        const i18n = window.i18n;
        // Masquer le menu
        menu.style.display = 'none';
        // Créer le formulaire
        const form = document.createElement('form');
        form.id = 'login-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2 data-i18n-key="login_form_title">${i18n ? i18n.t('login_form_title') : 'Login'}</h2>
        <input type="text" id="login-username" placeholder="${i18n ? i18n.t('login_username_placeholder') : 'Username'}" required>
        <input type="password" id="login-password" placeholder="${i18n ? i18n.t('login_password_placeholder') : 'Password'}" required>
        <div class="auth-btn-row">
            <button type="submit" data-i18n-key="login_submit">${i18n ? i18n.t('login_submit') : 'Login'}</button>
            <button type="button" id="show-signup-from-login" class="auth-switch-btn" data-i18n-key="no_account">${i18n ? i18n.t('no_account') : 'Sign Up'}</button>
        </div>
        <button type="button" id="cancel-login" class="auth-cancel-btn" data-i18n-key="login_cancel">${i18n ? i18n.t('login_cancel') : 'Cancel'}</button>
        <div id="login-message" class="auth-message"></div>
    `;
        (_a = menu.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(form);
        form.onsubmit = (e) => __awaiter(this, void 0, void 0, function* () {
            e.preventDefault();
            console.log('submit edit-profile-form');
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
            form.remove();
            menu.style.display = '';
        };
        document.getElementById('show-signup-from-login').onclick = () => {
            form.remove();
            menu.style.display = '';
            showSignup();
        };
    }
    function showEditProfile(currentUsername, currentDisplayName) {
        var _a;
        if (document.getElementById('edit-profile-form'))
            return;
        const menu = document.querySelector('.menu-buttons');
        if (menu)
            menu.style.display = 'none';
        const homeView = document.getElementById('home-view');
        if (!homeView)
            return;
        const currentAvatarUrl = window.currentAvatarUrl;
        const form = document.createElement('form');
        form.id = 'edit-profile-form';
        form.className = 'auth-form edit-profile-form';
        form.innerHTML = `
        <h2>Edit Profile</h2>
        <img id="edit-avatar-img" src="${getAvatarUrl(currentAvatarUrl)}" alt="Avatar" class="edit-avatar-preview">
        <label>Avatar</label>
        <input type="file" id="edit-avatar" accept="image/*">
        <label>Username (non modifiable)</label>
        <input type="text" value="${escapeHtml(currentUsername)}" disabled class="disabled-input">
        <label>Display Name</label>
        <input type="text" id="edit-displayname" value="${escapeHtml(currentDisplayName)}" required>
        <button type="submit" class="auth-submit-btn">Save</button>
        <button type="button" id="cancel-edit-profile" class="auth-cancel-btn">Cancel</button>
        <div id="edit-profile-message" class="auth-message"></div>
    `;
        homeView.appendChild(form);
        (_a = form.querySelector('.auth-submit-btn')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            console.log('Save button clicked');
        });
        document.getElementById('cancel-edit-profile').onclick = () => {
            form.remove();
            if (menu)
                menu.style.display = '';
        };
        form.onsubmit = (e) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            e.preventDefault();
            console.log('onsubmit called');
            const display_name = document.getElementById('edit-displayname').value.trim();
            const messageDiv = document.getElementById('edit-profile-message');
            const avatarFile = (_a = document.getElementById('edit-avatar').files) === null || _a === void 0 ? void 0 : _a[0];
            let updateOk = true;
            let dataAvatar = undefined;
            messageDiv.textContent = '';
            if (!display_name) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Display name is required';
                return;
            }
            try {
                // Correction : utiliser la bonne route backend
                if (display_name) {
                    const res = yield fetch(`${API_BASE_URL}/api/user/profile`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', // Ajouté pour envoyer les cookies de session
                        body: JSON.stringify({ display_name })
                    });
                    const data = yield res.json();
                    if (!res.ok) {
                        updateOk = false;
                        console.log('PUT /api/user/profile failed', data);
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = data.error || 'Update failed';
                    }
                }
                if (avatarFile && updateOk) {
                    console.log('Sending POST /api/user/avatar');
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    // Correction : route avatar
                    const resAvatar = yield fetch(`${API_BASE_URL}/api/user/avatar`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include' // Ajouté pour envoyer les cookies de session
                    });
                    dataAvatar = yield resAvatar.json();
                    if (resAvatar.ok &&
                        ((dataAvatar.avatar_url) ||
                            (dataAvatar.avatar_path) ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path)))) {
                        const avatarImg = document.getElementById('avatar-img');
                        const editAvatarImg = document.getElementById('edit-avatar-img');
                        const newAvatarUrl = getAvatarUrl(dataAvatar.avatar_url ||
                            dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path)));
                        avatarImg.src = newAvatarUrl;
                        editAvatarImg.src = newAvatarUrl;
                        window.currentAvatarUrl = dataAvatar.avatar_url || dataAvatar.avatar_path || (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path));
                    }
                    else {
                        updateOk = false;
                        console.log('POST /api/user/avatar failed', dataAvatar);
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = dataAvatar && dataAvatar.error || 'Avatar upload failed';
                    }
                }
                if (updateOk) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = 'Profile updated!';
                    form.remove();
                    if (menu)
                        menu.style.display = '';
                    const finalAvatar = (dataAvatar && dataAvatar.user && (dataAvatar.user.avatar_path || dataAvatar.user.avatar_url))
                        || (dataAvatar && (dataAvatar.avatar_path || dataAvatar.avatar_url))
                        || window.currentAvatarUrl;
                    setUser(currentUsername, display_name, window.currentUserId, finalAvatar);
                }
            }
            catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Server error';
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