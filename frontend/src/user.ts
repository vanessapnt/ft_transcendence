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


    function setUser(username: string, displayName: string | null, userId: number, avatarUrl: string | null): void {
        const userInfo = document.getElementById('user-info');
        const usernameLabel = document.getElementById('username-label');
        const logoutBtn = document.getElementById('logout-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;

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
    }

    function logout(): void {
        const userInfo = document.getElementById('user-info');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img');
        const loginBtn = document.querySelector('.login-btn') as HTMLButtonElement;

        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (avatarImg) avatarImg.style.display = 'none';

        (window as any).currentUserId = null;
        (window as any).currentAvatarUrl = null;
        (window as any).currentUsername = null;
        (window as any).currentDisplayName = null;

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
        if (document.getElementById('signup-form')) return;

        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (!menu) return;

        // Masquer le menu
        menu.style.display = 'none';

        // Créer le formulaire
        const form = document.createElement('form');
        form.id = 'signup-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2>Sign Up</h2>
        <input type="text" id="signup-username" placeholder="Username" required>
        <input type="email" id="signup-email" placeholder="Email" required>
        <input type="password" id="signup-password" placeholder="Password" required>
        <input type="text" id="signup-displayname" placeholder="Display Name" required>
        <div class="auth-btn-row">
            <button type="submit" class="auth-submit-btn">Register</button>
            <button type="button" id="show-login" class="auth-switch-btn">Login</button>
        </div>
        <button type="button" id="cancel-signup" class="auth-cancel-btn">Cancel</button>
        <div id="signup-message" class="auth-message"></div>
    `;
        menu.parentElement?.appendChild(form);

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
                messageDiv.textContent = 'All fields are required';
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
                    messageDiv.textContent = 'Registration successful!';
                    setUser(user.username, user.display_name, user.id, user.avatar_path || '/avatars/default_avatar.png');
                    form.remove();
                    menu.style.display = '';
                } else {
                    messageDiv.className = 'auth-message error';
                    messageDiv.textContent = data.error || data.message || 'Registration failed';
                }
            } catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Server error: unable to connect';
                console.error('Signup error:', err);
            }
        };

        document.getElementById('cancel-signup')!.onclick = () => {
            form.remove();
            menu.style.display = '';
        };
        document.getElementById('show-login')!.onclick = () => {
            form.remove();
            menu.style.display = '';
            showLogin();
        };
    }

    function showLogin(): void {
        if (document.getElementById('login-form')) return;

        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (!menu) return;

        // Masquer le menu
        menu.style.display = 'none';

        // Créer le formulaire
        const form = document.createElement('form');
        form.id = 'login-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2>Login</h2>
        <input type="text" id="login-username" placeholder="Username" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <div class="auth-btn-row">
            <button type="submit" class="auth-submit-btn">Login</button>
            <button type="button" id="show-signup-from-login" class="auth-switch-btn">Sign Up</button>
        </div>
        <button type="button" id="cancel-login" class="auth-cancel-btn">Cancel</button>
        <div id="login-message" class="auth-message"></div>
    `;
        menu.parentElement?.appendChild(form);

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            console.log('submit edit-profile-form');
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
                messageDiv.textContent = 'Username and password are required';
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
                    messageDiv.textContent = 'Login successful!';
                    setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                    form.style.display = 'none';
                    const userInfo = document.getElementById('user-info');
                    if (userInfo) userInfo.style.display = 'block';
                } else {
                    messageDiv.className = 'auth-message error';
                    let reason = data.error || data.message || '';
                    if (!reason) {
                        if (res.status === 401) {
                            reason = 'Invalid username or password.';
                        } else if (res.status === 404) {
                            reason = 'User not found.';
                        } else {
                            reason = 'Login failed (unknown error)';
                        }
                    }
                    messageDiv.textContent = reason;
                }
            } catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Server error: unable to connect';
                console.error('Login error:', err);
            }
        };

        document.getElementById('cancel-login')!.onclick = () => {
            form.remove();
            menu.style.display = '';
        };
        document.getElementById('show-signup-from-login')!.onclick = () => {
            form.remove();
            menu.style.display = '';
            showSignup();
        };
    }

    function showEditProfile(currentUsername: string, currentDisplayName: string): void {
        if (document.getElementById('edit-profile-form')) return;

        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (menu) menu.style.display = 'none';

        const homeView = document.getElementById('home-view');
        if (!homeView) return;

        const currentAvatarUrl = (window as any).currentAvatarUrl;

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
        form.querySelector('.auth-submit-btn')?.addEventListener('click', () => {
            console.log('Save button clicked');
        });

        document.getElementById('cancel-edit-profile')!.onclick = () => {
            form.remove();
            if (menu) menu.style.display = '';
        };

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            console.log('onsubmit called');
            const display_name = (document.getElementById('edit-displayname') as HTMLInputElement).value.trim();
            const messageDiv = document.getElementById('edit-profile-message')!;
            const avatarFile = (document.getElementById('edit-avatar') as HTMLInputElement).files?.[0];
            let updateOk = true;
            let dataAvatar: ApiResponse | undefined = undefined;
            messageDiv.textContent = '';

            if (!display_name) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Display name is required';
                return;
            }

            try {
                // Correction : utiliser la bonne route backend
                if (display_name) {
                    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include', // Ajouté pour envoyer les cookies de session
                        body: JSON.stringify({ display_name })
                    });
                    const data: ApiResponse = await res.json();

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
                    const resAvatar = await fetch(`${API_BASE_URL}/api/user/avatar`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include' // Ajouté pour envoyer les cookies de session
                    });
                    dataAvatar = await resAvatar.json();

                    if (
                        resAvatar.ok &&
                        (
                            (dataAvatar.avatar_url) ||
                            (dataAvatar.avatar_path) ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path))
                        )
                    ) {
                        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
                        const editAvatarImg = document.getElementById('edit-avatar-img') as HTMLImageElement;
                        const newAvatarUrl = getAvatarUrl(
                            dataAvatar.avatar_url ||
                            dataAvatar.avatar_path ||
                            (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path))
                        );
                        avatarImg.src = newAvatarUrl;
                        editAvatarImg.src = newAvatarUrl;
                        (window as any).currentAvatarUrl = dataAvatar.avatar_url || dataAvatar.avatar_path || (dataAvatar.user && (dataAvatar.user.avatar_url || dataAvatar.user.avatar_path));
                    } else {
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
                    if (menu) menu.style.display = '';
                    const finalAvatar =
                        (dataAvatar && dataAvatar.user && (dataAvatar.user.avatar_path || dataAvatar.user.avatar_url))
                        || (dataAvatar && (dataAvatar.avatar_path || dataAvatar.avatar_url))
                        || (window as any).currentAvatarUrl;

                    setUser(
                        currentUsername,
                        display_name,
                        (window as any).currentUserId,
                        finalAvatar
                    );
                }
            } catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Server error';
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