// Chat UI management functions
// Fonction pour afficher/cacher le chat
(window as any).toggleChat = function toggleChat() {
    const chatPanel = document.getElementById('chat-panel');
    const button = document.getElementById('private-messages-btn');
    const screens = document.querySelectorAll('.screen');

    if (chatPanel && button) {
        const i18n = (window as any).i18n;
        const menuText = button.querySelector('.menu-text');

        if (!chatPanel.classList.contains('active')) {
            // Afficher le chat et cacher le jeu/menus
            chatPanel.classList.add('active');
            if (menuText) {
                menuText.textContent = i18n ? i18n.t('chat_hide_messages') : 'Hide Messages';
            }

            // Désactiver tous les écrans du jeu
            screens.forEach(screen => {
                screen.classList.remove('active');
            });
        } else {
            // Cacher le chat et réafficher le jeu/menus
            chatPanel.classList.remove('active');
            if (menuText) {
                menuText.textContent = i18n ? i18n.t('private_messages') : 'Private Messages';
            }

            // Réafficher l'écran qui était actif ou home par défaut
            const hasActiveScreen = Array.from(screens).some(screen => screen.classList.contains('active'));
            if (!hasActiveScreen) {
                // Aucun écran actif, retourner au home
                const pong = (window as any).PONG;
                if (pong?.Nav?.showHome) {
                    pong.Nav.showHome();
                } else {
                    // Fallback si Navigation pas encore chargé
                    const homeView = document.getElementById('home-view');
                    if (homeView) {
                        homeView.classList.add('active');
                    }
                }
            }
        }
    }
};

// Fonction utilitaire pour récupérer l'utilisateur de la conversation actuelle
(window as any).getCurrentChatUser = function getCurrentChatUser() {
    // Utiliser la propriété currentChatUser de l'instance Chat
    const pong = (window as any).PONG;
    if (pong && pong.Chat && pong.Chat.currentChatUser) {
        return pong.Chat.currentChatUser;
    }
    return null;
};

// Fonction pour réinitialiser l'état du bouton block/unblock
(window as any).resetBlockButton = function resetBlockButton() {
    const blockBtn = document.getElementById('block-btn');
    if (blockBtn) {
        blockBtn.textContent = '/block';
        blockBtn.title = 'Bloquer l\'utilisateur';
    }
};

// Fonction pour vérifier l'état de connexion et ajuster la visibilité du bouton
(window as any).checkLoginStatus = function checkLoginStatus() {
    // Vérifier si l'utilisateur est connecté en regardant les éléments d'information utilisateur
    const userDisplayElement = document.getElementById('user-display');
    const userInfoElement = document.getElementById('user-info');
    const privateMessagesBtn = document.getElementById('private-messages-btn');

    if (privateMessagesBtn) {
        // TOUJOURS commencer par cacher le bouton par sécurité
        if ((window as any).forceHidePrivateMessagesButton) {
            (window as any).forceHidePrivateMessagesButton();
        }

        // Si on trouve un élément avec des informations utilisateur et qu'il contient un nom d'utilisateur
        let isLoggedIn = false;

        if (userDisplayElement && userDisplayElement.textContent.trim() !== '') {
            isLoggedIn = true;
        } else if (userInfoElement && userInfoElement.textContent.trim() !== '') {
            isLoggedIn = true;
        }

        // Afficher le bouton seulement si on est sûr que l'utilisateur est connecté
        if (isLoggedIn) {
            if ((window as any).forceShowPrivateMessagesButton) {
                (window as any).forceShowPrivateMessagesButton();
            }
            console.log('🔓 Bouton Private Messages affiché (utilisateur connecté)');
        } else {
            // Alternative: vérifier s'il y a un cookie de session ou faire un appel API
            // Mais garder le bouton caché en attendant la réponse
            try {
                fetch('/api/user/profile')
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        } else {
                            throw new Error('API response not ok');
                        }
                    })
                    .then(userData => {
                        // Vérifier si on a vraiment des données utilisateur
                        if (userData && (userData.username || userData.id)) {
                            if ((window as any).forceShowPrivateMessagesButton) {
                                (window as any).forceShowPrivateMessagesButton();
                            }
                            console.log('🔓 Bouton Private Messages affiché (API confirme connexion avec données):', userData);
                        } else {
                            if ((window as any).forceHidePrivateMessagesButton) {
                                (window as any).forceHidePrivateMessagesButton();
                            }
                            console.log('🔒 Bouton Private Messages caché (API ne retourne pas de données utilisateur)');
                        }
                    })
                    .catch(() => {
                        if ((window as any).forceHidePrivateMessagesButton) {
                            (window as any).forceHidePrivateMessagesButton();
                        }
                        console.log('🔒 Bouton Private Messages caché (erreur API)');
                    });
            } catch (error) {
                // En cas d'erreur, garder le bouton caché
                if ((window as any).forceHidePrivateMessagesButton) {
                    (window as any).forceHidePrivateMessagesButton();
                }
                (privateMessagesBtn as HTMLElement).style.visibility = 'hidden';
                console.log('🔒 Bouton Private Messages caché (exception JavaScript)');
            }
        }
    }
};

// Initialize chat UI on page load
document.addEventListener('DOMContentLoaded', function () {
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
        chatPanel.classList.remove('active');
    }

    // Vérifier l'état de connexion et ajuster la visibilité du bouton
    (window as any).checkLoginStatus();

    // Ajouter les événements pour les boutons d'action du chat
    const inviteBtn = document.getElementById('invite-btn');
    const blockBtn = document.getElementById('block-btn');

    if (inviteBtn) {
        inviteBtn.addEventListener('click', function () {
            const currentUser = (window as any).getCurrentChatUser();
            const pong = (window as any).PONG;
            if (currentUser && pong && pong.Chat) {
                // Simuler la commande /invite
                const msgInput = document.getElementById('msg') as HTMLInputElement;
                if (msgInput) {
                    msgInput.value = `/invite "${currentUser}"`;
                    // Déclencher l'envoi du message
                    const sendBtn = document.getElementById('send');
                    if (sendBtn) {
                        sendBtn.click();
                    }
                }
            } else {
                alert('Aucune conversation sélectionnée');
            }
        });
    }

    if (blockBtn) {
        blockBtn.addEventListener('click', function () {
            const currentUser = (window as any).getCurrentChatUser();
            const pong = (window as any).PONG;
            if (currentUser && pong && pong.Chat) {
                const i18n = (window as any).i18n;
                // Vérifier si l'utilisateur est bloqué via la liste de la classe Chat
                const isBlocked = pong.Chat.blockedUsers && pong.Chat.blockedUsers.has(currentUser);

                if (isBlocked) {
                    // Débloquer l'utilisateur
                    const confirmMsg = i18n ? i18n.t('chat_confirm_unblock', { user: currentUser }) : `Êtes-vous sûr de vouloir débloquer ${currentUser} ?`;
                    const confirm = window.confirm(confirmMsg);
                    if (confirm) {
                        const msgInput = document.getElementById('msg') as HTMLInputElement;
                        if (msgInput) {
                            msgInput.value = `/unblock "${currentUser}"`;
                            const sendBtn = document.getElementById('send');
                            if (sendBtn) {
                                sendBtn.click();
                            }
                        }
                    }
                } else {
                    // Bloquer l'utilisateur
                    const confirmMsg = i18n ? i18n.t('chat_confirm_block', { user: currentUser }) : `Êtes-vous sûr de vouloir bloquer ${currentUser} ?`;
                    const confirm = window.confirm(confirmMsg);
                    if (confirm) {
                        const msgInput = document.getElementById('msg') as HTMLInputElement;
                        if (msgInput) {
                            msgInput.value = `/block "${currentUser}"`;
                            const sendBtn = document.getElementById('send');
                            if (sendBtn) {
                                sendBtn.click();
                            }
                        }
                    }
                }
            } else {
                const i18n = (window as any).i18n;
                alert(i18n ? i18n.t('chat_no_conversation') : 'Aucune conversation sélectionnée');
            }
        });
    }

    const addFriendBtn = document.getElementById('add-friend-btn') as HTMLButtonElement;
    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', async function () {
            const currentUser = (window as any).getCurrentChatUser();
            if (!currentUser) {
                const i18n = (window as any).i18n;
                alert(i18n ? i18n.t('chat_no_conversation') : 'Aucune conversation sélectionnée');
                return;
            }
            try {
                const response = await fetch('/api/friends/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser })
                });
                const data = await response.json();
                if (response.ok) {
                    const i18n = (window as any).i18n;
                    alert(i18n ? i18n.t('friend_added_success', { user: currentUser }) : `${currentUser} a été ajouté en ami`);
                    // Rafraîchir la liste d'amis
                    if ((window as any).PONG?.Chat?.refreshFriendsList) {
                        await (window as any).PONG.Chat.refreshFriendsList();
                    }
                } else {
                    alert(data.error || 'Erreur lors de l\'ajout d\'ami');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur réseau');
            }
        });
    }

    // Fonction pour afficher le profil d'un utilisateur au clic
    (window as any).showUserProfile = function (username: string) {
        if ((window as any).loadOtherUserProfile) {
            (window as any).loadOtherUserProfile(username);
        }
    };

    // Observer les changements dans le titre de la conversation pour réinitialiser le bouton
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentChatEl = document.getElementById('current-chat');
                if (currentChatEl && currentChatEl.textContent && currentChatEl.textContent.includes('Conversation avec')) {
                    (window as any).resetBlockButton();
                }
            }
        });
    });

    // Démarrer l'observation quand le DOM est prêt
    const currentChatEl = document.getElementById('current-chat');
    if (currentChatEl) {
        observer.observe(currentChatEl, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    console.log('✅ Chat UI initialized');
});
