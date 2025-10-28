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
        error?: string;
        user?: UserData;
        message?: string;
    }

    const API_BASE_URL = typeof window !== 'undefined' && (window as any).API_BASE_URL
        ? (window as any).API_BASE_URL
        : 'http://localhost:8000';

    function getAvatarUrl(url: string | null | undefined): string {
        const defaultUrl = '/avatars/default_avatar.png';
        if (!url) return defaultUrl;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;

        if (url.startsWith('/')) {
            return `${API_BASE_URL}${url}`;
        }
        return url;
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
        const userInfo = document.getElementById('user-info');
        if (githubBtn) {
            if (userInfo && userInfo.style.display === 'block') {
                githubBtn.style.display = 'none';
            } else {
                githubBtn.style.display = 'inline-block';
            }
        }
    }

    function setUser(username: string, displayName: string | null, userId: number, avatarUrl: string | null): void {
        const userInfo = document.getElementById('user-info');
        const usernameLabel = document.getElementById('username-label');
        const logoutBtn = document.getElementById('logout-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;

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

        if (signupBtn) signupBtn.style.display = 'none';

        (window as any).currentUserId = userId;
        (window as any).currentAvatarUrl = avatarUrl;
        (window as any).currentUsername = username;
        (window as any).currentDisplayName = displayName;

        avatarImg.src = getAvatarUrl(avatarUrl);
        avatarImg.style.display = 'inline-block';

        editProfileBtn.onclick = () => showEditProfile(username, displayName || username);
        logoutBtn.onclick = () => logout();
    }

    function logout(): void {
        const userInfo = document.getElementById('user-info');
        const signupBtn = document.querySelector('.signup-btn') as HTMLButtonElement;
        const avatarImg = document.getElementById('avatar-img');

        if (userInfo) userInfo.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (avatarImg) avatarImg.style.display = 'none';

        (window as any).currentUserId = null;
        (window as any).currentAvatarUrl = null;
        (window as any).currentUsername = null;
        (window as any).currentDisplayName = null;

        console.log('✅ User logged out');
    }

    function showSignup(): void {
        if (document.getElementById('signup-form')) return;

        const homeView = document.getElementById('home-view');
        if (!homeView) return;

        const form = document.createElement('form');
        form.id = 'signup-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2>Sign Up</h2>
        <div style="color:#888;font-size:0.9em;margin-bottom:10px;">
            Le mot de passe doit contenir au moins 6 caractères.
        </div>
        <input type="text" id="signup-username" placeholder="Username" required>
        <input type="email" id="signup-email" placeholder="Email" required>
        <input type="password" id="signup-password" placeholder="Password" required>
        <input type="text" id="signup-displayname" placeholder="Display Name" required>
        <button type="submit" class="auth-submit-btn">Register</button>
        <button type="button" id="cancel-signup" class="auth-cancel-btn">Cancel</button>
        <button type="button" id="show-login" class="auth-switch-btn">Login</button>
        <div id="signup-message" class="auth-message"></div>
    `;
        homeView.appendChild(form);

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            const username = (document.getElementById('signup-username') as HTMLInputElement).value.trim();
            const email = (document.getElementById('signup-email') as HTMLInputElement).value.trim();
            const password = (document.getElementById('signup-password') as HTMLInputElement).value;
            const display_name = (document.getElementById('signup-displayname') as HTMLInputElement).value.trim();
            const messageDiv = document.getElementById('signup-message')!;
            messageDiv.textContent = '';

            // Log the request body for debugging
            console.log('Signup request body:', { username, email, password, display_name });

            if (!username || !email || !password || !display_name) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'All fields are required';
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, display_name })
                });
                // Log the raw response for debugging
                const text = await res.text();
                console.log('Signup raw response:', text);
                let data: ApiResponse;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    data = { error: 'Invalid JSON from backend' };
                }

                // Correction : extraire les infos depuis data.user si présent
                const user = data.user;
                if (res.ok && user && user.username && user.display_name && user.id) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = 'Registration successful!';
                    // Adapter avatar_path (backend) en avatar_url (frontend)
                    setUser(user.username, user.display_name, user.id, user.avatar_path || '/avatars/default_avatar.png');
                    setTimeout(() => form.remove(), 1500);
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

        document.getElementById('cancel-signup')!.onclick = () => form.remove();
        document.getElementById('show-login')!.onclick = () => {
            form.remove();
            showLogin();
        };
    }

    function showLogin(): void {
        if (document.getElementById('login-form')) return;

        const homeView = document.getElementById('home-view');
        if (!homeView) return;

        const form = document.createElement('form');
        form.id = 'login-form';
        form.className = 'auth-form';
        form.innerHTML = `
        <h2>Login</h2>
        <input type="text" id="login-username" placeholder="Username" required>
        <input type="password" id="login-password" placeholder="Password" required>
        <button type="submit" class="auth-submit-btn">Login</button>
        <button type="button" id="cancel-login" class="auth-cancel-btn">Cancel</button>
        <button type="button" id="show-signup-from-login" class="auth-switch-btn">Sign Up</button>
        <div id="login-message" class="auth-message"></div>
    `;
        homeView.appendChild(form);

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
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
                // Correction : utiliser la bonne route backend
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Ajouté pour envoyer les cookies de session
                    body: JSON.stringify({ username, password })
                });
                const data: ApiResponse = await res.json();

                // Correction : extraire les infos depuis data.user si présent
                const user = data.user as UserData;
                console.log('User data received after login:', user); // Ajout debug
                if (res.ok && user.username && user.display_name && user.id) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = 'Login successful!';
                    setUser(user.username, user.display_name, user.id, user.avatar_path || user.avatar_url || '/avatars/default_avatar.png');
                    form.style.display = 'none'; // Masquer le formulaire immédiatement
                    // Afficher le profil utilisateur
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

        document.getElementById('cancel-login')!.onclick = () => form.remove();
        document.getElementById('show-signup-from-login')!.onclick = () => {
            form.remove();
            showSignup();
        };
    }

    function showEditProfile(currentUsername: string, currentDisplayName: string): void {
        if (document.getElementById('edit-profile-form')) return;

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

        form.onsubmit = async (e: Event) => {
            e.preventDefault();
            const display_name = (document.getElementById('edit-displayname') as HTMLInputElement).value.trim();
            const messageDiv = document.getElementById('edit-profile-message')!;
            const avatarFile = (document.getElementById('edit-avatar') as HTMLInputElement).files?.[0];
            let updateOk = true;
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
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = data.error || 'Update failed';
                    }
                }

                if (avatarFile && updateOk) {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    // Correction : route avatar
                    const resAvatar = await fetch(`${API_BASE_URL}/api/user/avatar`, {
                        method: 'POST',
                        body: formData,
                        credentials: 'include' // Ajouté pour envoyer les cookies de session
                    });
                    const dataAvatar: ApiResponse = await resAvatar.json();

                    if (resAvatar.ok && dataAvatar.avatar_url) {
                        const avatarImg = document.getElementById('avatar-img') as HTMLImageElement;
                        const editAvatarImg = document.getElementById('edit-avatar-img') as HTMLImageElement;
                        const newAvatarUrl = getAvatarUrl(dataAvatar.avatar_url);
                        avatarImg.src = newAvatarUrl;
                        editAvatarImg.src = newAvatarUrl;
                        (window as any).currentAvatarUrl = dataAvatar.avatar_url;
                    } else {
                        updateOk = false;
                        messageDiv.className = 'auth-message error';
                        messageDiv.textContent = dataAvatar.error || 'Avatar upload failed';
                    }
                }

                if (updateOk) {
                    messageDiv.className = 'auth-message success';
                    messageDiv.textContent = 'Profile updated!';
                    setTimeout(() => {
                        form.remove();
                        setUser(currentUsername, display_name, (window as any).currentUserId, (window as any).currentAvatarUrl);
                    }, 1000);
                }
            } catch (err) {
                messageDiv.className = 'auth-message error';
                messageDiv.textContent = 'Server error';
                console.error('Edit profile error:', err);
            }
        };

        document.getElementById('cancel-edit-profile')!.onclick = () => form.remove();
    }

    // Au chargement de la page, déconnexion automatique PUIS récupération du profil (dev only)
    window.addEventListener('DOMContentLoaded', async () => {
        try {
            // Déconnexion automatique (dev only)
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            // ignore
        }
        try {
            // Récupération du profil (sera vide après logout)
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

    if (!(window as any).PONG) {
        (window as any).PONG = {};
    }

    (window as any).PONG.showSignup = showSignup;
    (window as any).PONG.showLogin = showLogin;
    (window as any).PONG.showEditProfile = showEditProfile;
    (window as any).PONG.setUser = setUser;
    (window as any).PONG.logout = logout;

    (window as any).showSignup = showSignup;
    (window as any).showLogin = showLogin;

    console.log('✅ User module loaded');

})();