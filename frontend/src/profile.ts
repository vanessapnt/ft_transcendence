// Profile Panel Management
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        // Fonction pour vider le profile panel
        (window as any).clearProfilePanel = function () {
            const profileName = document.getElementById('profile-panel-name') as HTMLElement;
            const profileUsername = document.getElementById('profile-panel-username') as HTMLElement;
            const profileAvatar = document.getElementById('profile-panel-avatar') as HTMLImageElement;
            const historyContainer = document.getElementById('profile-match-history') as HTMLElement;

            if (profileName) profileName.textContent = '';
            if (profileUsername) profileUsername.textContent = '';
            if (profileAvatar) {
                profileAvatar.src = '/avatars/default_avatar.png';
            }
            if (historyContainer) {
                historyContainer.innerHTML = '';
            }
        };

        (window as any).loadUserProfile = async function () {
            try {
                const response = await fetch('/api/user/profile', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    console.error('Failed to fetch user profile');
                    return;
                }

                const data = await response.json();
                const user = data.user;

                if (!user) {
                    console.error('No user data in response');
                    return;
                }

                // Update profile panel with user data
                const profileName = document.getElementById('profile-panel-name') as HTMLElement;
                const profileUsername = document.getElementById('profile-panel-username') as HTMLElement;
                const profileAvatar = document.getElementById('profile-panel-avatar') as HTMLImageElement;

                if (profileName) profileName.textContent = user.display_name || user.username;
                if (profileUsername) profileUsername.textContent = user.username;

                // Gérer l'avatar correctement
                if (profileAvatar) {
                    let avatarSrc = '/avatars/default_avatar.png';
                    if (user.avatar_path) {
                        // Si le chemin commence par /, c'est un chemin absolu, sinon le préfixer
                        avatarSrc = user.avatar_path.startsWith('/') ? user.avatar_path : `/avatars/${user.avatar_path}`;
                    }
                    profileAvatar.src = avatarSrc;
                    profileAvatar.onerror = () => {
                        profileAvatar.src = '/avatars/default_avatar.png';
                    };
                    console.log('Avatar loaded:', avatarSrc);
                }

                // Load match history
                await loadMatchHistory(user.id);

            } catch (error) {
                console.error('Error loading user profile:', error);
            }
        };

        // Fonction pour charger le profil d'un autre utilisateur
        (window as any).loadOtherUserProfile = async function (username: string) {
            try {
                const response = await fetch(`/api/user/profile/${username}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    console.error('Failed to fetch user profile');
                    return;
                }

                const data = await response.json();
                const user = data.user;

                if (!user) {
                    console.error('No user data in response');
                    return;
                }

                // Update profile panel with user data
                const profileName = document.getElementById('profile-panel-name') as HTMLElement;
                const profileUsername = document.getElementById('profile-panel-username') as HTMLElement;
                const profileAvatar = document.getElementById('profile-panel-avatar') as HTMLImageElement;
                const profilePanel = document.getElementById('profile-panel') as HTMLElement;

                if (profileName) profileName.textContent = user.display_name || user.username;
                if (profileUsername) profileUsername.textContent = user.username;

                // Gérer l'avatar correctement
                if (profileAvatar) {
                    let avatarSrc = '/avatars/default_avatar.png';
                    if (user.avatar_path) {
                        avatarSrc = user.avatar_path.startsWith('/') ? user.avatar_path : `/avatars/${user.avatar_path}`;
                    }
                    profileAvatar.src = avatarSrc;
                    profileAvatar.onerror = () => {
                        profileAvatar.src = '/avatars/default_avatar.png';
                    };
                }

                // Load match history
                await loadMatchHistory(user.id);

                // Afficher le panel
                if (profilePanel) {
                    profilePanel.classList.add('active');
                }

            } catch (error) {
                console.error('Error loading other user profile:', error);
            }
        };

        async function loadMatchHistory(userId: number): Promise<void> {
            try {
                const historyContainer = document.getElementById('profile-match-history') as HTMLElement;
                if (!historyContainer) return;

                historyContainer.innerHTML = '';

                // Fetch actual match history from API
                const response = await fetch(`/api/matches/user/${userId}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'match-empty';
                    emptyMessage.textContent = 'No match history';
                    historyContainer.appendChild(emptyMessage);
                    return;
                }

                const data = await response.json();
                const matches = data.matches || [];
                renderMatchHistory(matches, userId);

            } catch (error) {
                console.error('Error loading match history:', error);
                const historyContainer = document.getElementById('profile-match-history') as HTMLElement;
                if (historyContainer) {
                    const emptyMessage = document.createElement('div');
                    emptyMessage.className = 'match-empty';
                    emptyMessage.textContent = 'Error loading match history';
                    historyContainer.appendChild(emptyMessage);
                }
            }
        }

        function renderMatchHistory(matches: any[], userId: number): void {
            const historyContainer = document.getElementById('profile-match-history') as HTMLElement;
            if (!historyContainer) return;

            historyContainer.innerHTML = '';

            if (!matches || matches.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'match-empty';
                  if ((window as any).i18n && typeof (window as any).i18n.t === 'function') {
						emptyMessage.textContent = (window as any).i18n.t('profile_display_match_history');
					} else {
                        emptyMessage.textContent = 'No match history yet';
					}
                historyContainer.appendChild(emptyMessage);
                return;
            }

            matches.forEach((match: any) => {
                const matchItem = document.createElement('div');

                // Déterminer l'adversaire et le résultat
                const isPlayer1 = match.player1_id === userId;
                const opponentUsername = isPlayer1 ? match.player2_username : match.player1_username;
                const opponentName = isPlayer1 ? match.player2_display_name || match.player2_username : match.player1_display_name || match.player1_username;

                let result = 'draw';
                if (match.winner_id === userId) {
                    result = 'win';
                } else if (match.winner_id && match.winner_id !== userId) {
                    result = 'loss';
                }

                matchItem.className = `match-history-item ${result}`;

                const opponent = document.createElement('div');
                opponent.className = 'match-opponent';
                opponent.textContent = `vs ${opponentName}`;

                const resultDiv = document.createElement('div');
                resultDiv.className = 'match-result';
                resultDiv.textContent = result.charAt(0).toUpperCase() + result.slice(1);

                const date = document.createElement('div');
                date.className = 'match-date';
                date.textContent = new Date(match.played_at).toLocaleDateString();

                matchItem.appendChild(opponent);
                matchItem.appendChild(resultDiv);
                matchItem.appendChild(date);

                historyContainer.appendChild(matchItem);
            });
        }

        console.log('✅ Profile management initialized');
    });
})();
