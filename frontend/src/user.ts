(function () {

    interface UserData {
        username: string;
        display_name: string;
        id: number;
        avatar_url: string | null;
        email?: string;
        avatar_path?: string | null;
    }

    interface ApiResponse {
        username?: string;
        display_name?: string;
        id?: number;
        avatar_url?: string | null;
        avatar_path?: string | null;
        error?: string;
        user?: UserData;
        message?: string;
    }

    const API_BASE_URL =
        window.location.hostname === 'localhost' && window.location.port === '3000'
            ? 'http://localhost:8000'
            : '';

    // Vérifier l'intégrité du localStorage comparé à la BD
    async function checkAndCleanLocalStorage(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            const data: any = await response.json();

            const storedDbTimestamp = localStorage.getItem('dbTimestamp');
            const currentDbTimestamp = data.dbTimestamp;

            // Si le timestamp de la BD a changé, vider tout le localStorage du chat
            if (storedDbTimestamp && storedDbTimestamp !== currentDbTimestamp.toString()) {
                console.log('🔄 Base de données réinitialisée, nettoyage du localStorage...');
                // Supprimer toutes les clés de conversations du localStorage
                const keysToRemove: string[] = [];
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
        } catch (e) {
            console.warn('⚠️ Impossible de vérifier l\'intégrité du localStorage:', e);
        }
    }

    // Appeler la vérification au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndCleanLocalStorage);
    } else {
        checkAndCleanLocalStorage();
    }

    function setUser(username: string, displayName: string | null, userId: number, avatarUrl: string | null): void {
        const userInfo = document.getElementById('user-info');
        const usernameLabel = document.getElementById('username-label');
        const logoutBtn = document.getElementById('logout-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
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

        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        // Créer le bouton Private Messages dynamiquement
        if ((window as any).createPrivateMessagesButton) {
            (window as any).createPrivateMessagesButton();
        }
        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (menu) menu.style.display = '';

        (window as any).currentUserId = userId;
        (window as any).currentAvatarUrl = avatarUrl;
        (window as any).currentUsername = username;
        (window as any).currentDisplayName = displayName;

        avatarImg.src = getAvatarUrl(avatarUrl);
        avatarImg.style.display = 'inline-block';

        editProfileBtn.onclick = () => showEditProfile(username, displayName || username);
        logoutBtn.onclick = () => logout();
        hideGithubLoginIfConnected();

        // Initialiser le chat WebSocket après le login
        if ((window as any).PONG && (window as any).PONG.Chat && (window as any).PONG.Chat.initializeChat) {
            console.log('🚀 Initialisation du chat après login');
            (window as any).PONG.Chat.initializeChat();
        }
    }

    function logout(): void {
        // Cacher le chat s'il est ouvert
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.classList.contains('active')) {
            // Utiliser la fonction toggleChat si elle existe
            if (typeof (window as any).toggleChat === 'function') {
                (window as any).toggleChat();
            } else {
                // Sinon cacher manuellement et restaurer les écrans
                chatPanel.classList.remove('active');
                const homeView = document.getElementById('home-view');
                if (homeView) {
                    homeView.classList.add('active');
                }
            }
        }

        const userInfo = document.getElementById('user-info');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img');
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
        const privateMessagesBtn = document.getElementById('private-messages-btn');

        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (avatarImg) avatarImg.style.display = 'none';
        // Supprimer le bouton Private Messages
        if ((window as any).removePrivateMessagesButton) {
            (window as any).removePrivateMessagesButton();
        }

        (window as any).currentUserId = null;
        (window as any).currentAvatarUrl = null;
        (window as any).currentUsername = null;
        (window as any).currentDisplayName = null;

        // Restaurer la langue du navigateur en supprimant la langue préférée de l'utilisateur
        localStorage.removeItem('preferred_language');
        const browserLang = navigator.language?.split('-')[0] || 'en';
        if ((window as any).changeLang) {
            (window as any).changeLang(browserLang);
            console.log(`🌐 Langue restaurée à celle du navigateur: ${browserLang}`);
        }

        console.log('✅ User logged out');
        hideGithubLoginIfConnected();
    }

    function getAvatarUrl(url: string | null | undefined): string {
        const defaultUrl = '/avatars/default_avatar.png';
        if (!url) return defaultUrl;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/avatars/')) return url;
        return `/avatars/${url}`;
    }

    function escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        if (!text) return '';
        return text.replace(/[&<>"']/g, char => map[char] ?? char);
    }

    // Fonction utilitaire pour cacher le bouton GitHub login si connecté
    function hideGithubLoginIfConnected() {
        const githubBtn = document.getElementById('github-login-btn');
        const googleBtn = document.getElementById('google-login-btn');
        console.log('hideGithubLoginIfConnected:', { githubBtn, googleBtn, currentUserId: (window as any).currentUserId });
        if (githubBtn) {
            if ((window as any).currentUserId) {
                githubBtn.style.display = 'none';
            } else {
                githubBtn.style.display = 'inline-block';
            }
        }
        if (googleBtn) {
            if ((window as any).currentUserId) {
                googleBtn.style.display = 'none';
            } else {
                googleBtn.style.display = 'inline-block';
            }
        }
    }

    function showSignup(): void {
        const form = document.getElementById('signup-form') as HTMLFormElement;
        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (!form || !menu) return;

        const i18n = (window as any).i18n;

        // S'assurer que le home-view est actif
        const homeView = document.getElementById('home-view');
        if (homeView && !homeView.classList.contains('active')) {
            // Désactiver tous les screens
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                (screen as HTMLElement).classList.remove('active');
            });
            // Activer home-view
            homeView.classList.add('active');
        }

        // Masquer le menu et afficher le formulaire
        menu.style.display = 'none';
        form.style.display = 'block';

        // Réinitialiser le formulaire
        form.reset();
        const messageDiv = document.getElementById('signup-message')!;
        messageDiv.textContent = '';
        messageDiv.className = 'auth-message';

        // Setup form submission (only once)
        if (!form.dataset.initialized) {
            form.dataset.initialized = 'true';

            // Setup password requirements display
            const passwordInput = document.getElementById('signup-password') as HTMLInputElement;
            const requirementsDiv = document.getElementById('password-requirements') as HTMLElement;
            const reqLength = document.getElementById('req-length') as HTMLElement;

            if (passwordInput && requirementsDiv && reqLength) {
                // Remove old listeners to avoid duplicates
                passwordInput.removeEventListener('focus', null as any);
                passwordInput.removeEventListener('input', null as any);
                passwordInput.removeEventListener('blur', null as any);

                passwordInput.addEventListener('focus', () => {
                    requirementsDiv.style.display = 'block';
                });

                passwordInput.addEventListener('input', () => {
                    const password = passwordInput.value;
                    const isValid = password.length >= 6;

                    if (isValid) {
                        reqLength.classList.add('met');
                        reqLength.textContent = '✅ ' + (i18n ? i18n.t('password_req_length') : 'At least 6 characters');
                    } else {
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

            form.onsubmit = async (e: Event) => {
                e.preventDefault();
                const username = (document.getElementById('signup-username') as HTMLInputElement).value.trim();
                const email = (document.getElementById('signup-email') as HTMLInputElement).value.trim();
                const password = (document.getElementById('signup-password') as HTMLInputElement).value;
                const display_name = (document.getElementById('signup-displayname') as HTMLInputElement).value.trim();
                const messageDiv = document.getElementById('signup-message')!;
                messageDiv.textContent = '';

                if (!username || !email || !password || !display_name) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('signup_error_required') : 'All fields are required';
                    return;
                }

                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ username, email, password, display_name })
                    });
                    const text = await res.text();
                    let data: ApiResponse;
                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        data = { error: 'Invalid JSON from backend' };
                    }
                    const user = data.user;
                    if (res.ok && user && user.username && user.display_name && user.id) {
                        messageDiv.className = 'auth-message success';
                        messageDiv.textContent = i18n ? i18n.t('signup_success') : 'Registration successful!';
                        setUser(user.username, user.display_name, user.id, user.avatar_path || '/avatars/default_avatar.png');
                        form.style.display = 'none';
                        menu.style.display = '';
                    } else {
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = data.error || data.message || (i18n ? i18n.t('signup_error_failed') : 'Registration failed');
                    }
                } catch (err) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('signup_error_server') : 'Server error: unable to connect';
                    console.error('Signup error:', err);
                }
            };

            document.getElementById('cancel-signup')!.onclick = () => {
                form.style.display = 'none';
                menu.style.display = '';
            };

            document.getElementById('show-login-from-signup')!.onclick = () => {
                form.style.display = 'none';
                showLogin();
            };
        }
    }

    function showLogin(): void {
        const form = document.getElementById('login-form') as HTMLFormElement;
        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (!form || !menu) return;

        const i18n = (window as any).i18n;

        // S'assurer que le home-view est actif
        const homeView = document.getElementById('home-view');
        if (homeView && !homeView.classList.contains('active')) {
            // Désactiver tous les screens
            const screens = document.querySelectorAll('.screen');
            screens.forEach(screen => {
                (screen as HTMLElement).classList.remove('active');
            });
            // Activer home-view
            homeView.classList.add('active');
        }

        // Masquer le menu et afficher le formulaire
        menu.style.display = 'none';
        form.style.display = 'block';

        // Réinitialiser le formulaire
        form.reset();
        const messageDiv = document.getElementById('login-message')!;
        messageDiv.textContent = '';
        messageDiv.className = 'auth-message';

        // Setup form submission (only once)
        if (!form.dataset.initialized) {
            form.dataset.initialized = 'true';

            form.onsubmit = async (e: Event) => {
                e.preventDefault();
                console.log('submit login-form');
                const usernameInput = document.getElementById('login-username') as HTMLInputElement | null;
                const passwordInput = document.getElementById('login-password') as HTMLInputElement | null;
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
                    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ username, password })
                    });
                    const data: ApiResponse = await res.json();
                    const user = data.user as UserData;
                    if (res.ok && user.username && user.display_name && user.id) {
                        messageDiv.className = 'auth-message success';
                        messageDiv.textContent = i18n ? i18n.t('login_success') : 'Login successful!';
                        setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                        form.style.display = 'none';
                        menu.style.display = '';
                        const userInfo = document.getElementById('user-info');
                        if (userInfo) userInfo.style.display = 'block';
                    } else {
                        messageDiv.className = 'auth-message error';
                        let reason = data.error || data.message || '';
                        if (!reason) {
                            if (res.status === 401) {
                                reason = i18n ? i18n.t('login_error_invalid') : 'Invalid username or password.';
                            } else if (res.status === 404) {
                                reason = i18n ? i18n.t('login_error_notfound') : 'User not found.';
                            } else {
                                reason = i18n ? i18n.t('login_error_failed') : 'Login failed (unknown error)';
                            }
                        }
                        messageDiv.textContent = reason;
                    }
                } catch (err) {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = i18n ? i18n.t('login_error_server') : 'Server error: unable to connect';
                    console.error('Login error:', err);
                }
            };

            document.getElementById('cancel-login')!.onclick = () => {
                form.style.display = 'none';
                menu.style.display = '';
            };

            document.getElementById('show-signup-from-login')!.onclick = () => {
                form.style.display = 'none';
                showSignup();
            };
        }
    }

    function showEditProfile(currentUsername: string, currentDisplayName: string): void {
        const form = document.getElementById('edit-profile-form') as HTMLFormElement | null;
        if (!form) return;

        const currentAvatarUrl = (window as any).currentAvatarUrl;
        const i18n = (window as any).i18n;

        // Hide menu buttons
        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (menu) menu.style.display = 'none';

        // Pre-fill form with current values
        const avatarPreview = document.getElementById('edit-avatar-preview') as HTMLImageElement;
        const usernameDisplay = document.getElementById('edit-username-display') as HTMLInputElement;
        const displayNameInput = document.getElementById('edit-display-name') as HTMLInputElement;
        const fileInput = document.getElementById('edit-avatar-input') as HTMLInputElement;
        const filenameSpan = document.getElementById('edit-avatar-filename') as HTMLSpanElement;
        const messageDiv = document.getElementById('edit-profile-message') as HTMLDivElement;

        if (avatarPreview) avatarPreview.src = getAvatarUrl(currentAvatarUrl);
        if (usernameDisplay) usernameDisplay.value = currentUsername;
        if (displayNameInput) displayNameInput.value = currentDisplayName;
        if (messageDiv) messageDiv.textContent = '';

        // Show form
        form.style.display = 'block';

        // Handle language selector
        const currentLang = i18n ? i18n.getCurrentLanguage() : 'en';
        let selectedLanguage = currentLang;
        const langButtons = form.querySelectorAll('.lang-option');

        langButtons.forEach(btn => {
            const button = btn as HTMLButtonElement;
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
                        if (avatarPreview && e.target?.result) {
                            avatarPreview.src = e.target.result as string;
                        }
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                } else {
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
        form.onsubmit = async (e: Event) => {
            e.preventDefault();

            const display_name = displayNameInput?.value.trim();
            if (!messageDiv) return;

            const avatarFile = fileInput?.files?.[0];
            let updateOk = true;
            let dataAvatar: ApiResponse | undefined = undefined;
            messageDiv.textContent = '';

            if (!display_name) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = i18n ? i18n.t('edit_profile_error_required') : 'Display name is required';
                return;
            }

            try {
                // Update profile (display name and language)
                const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ display_name, preferred_language: selectedLanguage })
                });
                const data: ApiResponse = await res.json();

                if (!res.ok) {
                    updateOk = false;
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = data.error || (i18n ? i18n.t('edit_profile_error_failed') : 'Update failed');
                }

                // Update avatar if provided
                if (avatarFile && updateOk) {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    const resAvatar = await fetch(`${API_BASE_URL}/api/user/avatar`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include'
                    });
                    dataAvatar = await resAvatar.json();

                    if (resAvatar.ok && (dataAvatar.avatar_url || dataAvatar.avatar_path ||
                        (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path)))) {
                        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
                        const newAvatarUrl = getAvatarUrl(
                            dataAvatar.avatar_url || dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path))
                        );
                        if (avatarImg) avatarImg.src = newAvatarUrl;
                        if (avatarPreview) avatarPreview.src = newAvatarUrl;
                        (window as any).currentAvatarUrl = dataAvatar.avatar_url || dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path));
                    } else {
                        updateOk = false;
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = dataAvatar?.error || (i18n ? i18n.t('edit_profile_error_avatar') : 'Avatar upload failed');
                    }
                }

                if (updateOk) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = i18n ? i18n.t('edit_profile_success') : 'Profile updated!';

                    // Change language if it was updated
                    if (selectedLanguage !== currentLang && (window as any).changeLang) {
                        await (window as any).changeLang(selectedLanguage);
                    }

                    const finalAvatar = (dataAvatar?.user?.avatar_path || dataAvatar?.user?.avatar_url) ||
                        (dataAvatar?.avatar_path || dataAvatar?.avatar_url) ||
                        (window as any).currentAvatarUrl;

                    setUser(currentUsername, display_name, (window as any).currentUserId, finalAvatar);

                    // Close form after short delay
                    setTimeout(() => {
                        window.history.back();
                    }, 1000);
                }
            } catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = i18n ? i18n.t('edit_profile_error_server') : 'Server error';
                console.error('Edit profile error:', err);
            }
        };
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

    window.addEventListener('DOMContentLoaded', async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                const user = data.user;
                if (user && user.username && user.display_name && user.id) {
                    setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                }
            }
        } catch (err) {
            // ignore
        }
    });
    // Si pas connecté, cacher les éléments utilisateur
    const userInfo = document.getElementById('user-info');
    const avatarImg = document.getElementById('avatar-img');
    const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;
    const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
    if (userInfo) userInfo.style.display = 'none';
    if (avatarImg) avatarImg.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (!(window as any).PONG) {
        (window as any).PONG = {};
    }

    (window as any).PONG.showSignup = showSignup;
    (window as any).PONG.showLogin = showLogin;
    (window as any).PONG.showEditProfile = showEditProfile;
    (window as any).PONG.setUser = setUser;
    (window as any).PONG.logout = logout;
    (window as any).PONG.oauthLogin = function () {
        window.location.href = '/api/oauth/login/github';
    };
    (window as any).PONG.oauthGoogleLogin = function () {
        window.location.href = '/api/oauth/login/google';
    };
    (window as any).showSignup = showSignup;
    (window as any).showLogin = showLogin;

    console.log('✅ User module loaded');

})();