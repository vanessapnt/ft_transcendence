// Chat UI management functions
// Fonction pour afficher/cacher le chat
window.toggleChat = function toggleChat() {
    const chatPanel = document.getElementById('chat-panel');
    const button = document.getElementById('private-messages-btn');
    const screens = document.querySelectorAll('.screen');
    if (chatPanel && button) {
        const i18n = window.i18n;
        const menuText = button.querySelector('.menu-text');
        if (chatPanel.style.display === 'none' || chatPanel.style.display === '') {
            // Afficher le chat et cacher le jeu/menus
            chatPanel.style.display = 'flex';
            if (menuText) {
                menuText.textContent = i18n ? i18n.t('chat_hide_messages') : 'Hide Messages';
            }
            // Cacher tous les écrans du jeu
            screens.forEach(screen => {
                screen.style.display = 'none';
            });
        }
        else {
            // Cacher le chat et réafficher le jeu/menus
            chatPanel.style.display = 'none';
            if (menuText) {
                menuText.textContent = i18n ? i18n.t('private_messages') : 'Private Messages';
            }
            // Réafficher l'écran qui était actif
            screens.forEach(screen => {
                const el = screen;
                if (el.classList.contains('active')) {
                    el.style.display = 'flex';
                }
                else {
                    el.style.display = 'none';
                }
            });
        }
    }
};
// Fonction utilitaire pour récupérer l'utilisateur de la conversation actuelle
window.getCurrentChatUser = function getCurrentChatUser() {
    // Utiliser la propriété currentChatUser de l'instance Chat
    const pong = window.PONG;
    if (pong && pong.Chat && pong.Chat.currentChatUser) {
        return pong.Chat.currentChatUser;
    }
    return null;
};
// Fonction pour réinitialiser l'état du bouton block/unblock
window.resetBlockButton = function resetBlockButton() {
    const blockBtn = document.getElementById('block-btn');
    if (blockBtn) {
        blockBtn.textContent = '/block';
        blockBtn.title = 'Bloquer l\'utilisateur';
    }
};
// Fonction pour vérifier l'état de connexion et ajuster la visibilité du bouton
window.checkLoginStatus = function checkLoginStatus() {
    const privateMessagesBtn = document.getElementById('private-messages-btn');
    if (!privateMessagesBtn) {
        return;
    }
    // Vérifier plusieurs indicateurs de connexion
    const userInfo = document.getElementById('user-info');
    const avatarImg = document.getElementById('avatar-img');
    const currentUserId = window.currentUserId;
    const currentUsername = window.currentUsername;
    let isLoggedIn = false;
    // Vérifier si on a des données utilisateur globales
    if (currentUserId && currentUsername) {
        isLoggedIn = true;
    }
    // Vérifier si les éléments UI indiquent une connexion
    else if (userInfo && userInfo.style.display !== 'none' && userInfo.textContent.trim() !== '') {
        isLoggedIn = true;
    }
    else if (avatarImg && avatarImg.style.display !== 'none' && avatarImg.src.includes('/avatars/')) {
        isLoggedIn = true;
    }
    if (isLoggedIn) {
        // Utilisateur connecté - afficher le bouton
        if (window.forceShowPrivateMessagesButton) {
            window.forceShowPrivateMessagesButton();
        }
        console.log('🔓 Bouton Private Messages affiché (utilisateur connecté)');
    }
    else {
        // Pas sûr de la connexion - vérifier via API
        fetch('/api/user/profile', { credentials: 'include' })
            .then(response => {
            if (response.ok) {
                return response.json();
            }
            else {
                throw new Error('API response not ok');
            }
        })
            .then(userData => {
            if (userData && (userData.username || userData.id)) {
                if (window.forceShowPrivateMessagesButton) {
                    window.forceShowPrivateMessagesButton();
                }
                console.log('🔓 Bouton Private Messages affiché (API confirme connexion):', userData);
            }
            else {
                if (window.forceHidePrivateMessagesButton) {
                    window.forceHidePrivateMessagesButton();
                }
                console.log('🔒 Bouton Private Messages caché (pas de données utilisateur)');
            }
        })
            .catch(() => {
            if (window.forceHidePrivateMessagesButton) {
                window.forceHidePrivateMessagesButton();
            }
            console.log('🔒 Bouton Private Messages caché (erreur API)');
        });
    }
};
// Initialize chat UI on page load
document.addEventListener('DOMContentLoaded', function () {
    const chatPanel = document.getElementById('chat-panel');
    if (chatPanel) {
        chatPanel.style.display = 'none';
    }
    // Vérifier l'état de connexion et ajuster la visibilité du bouton
    window.checkLoginStatus();
    // Vérification périodique pour s'assurer que le bouton reste visible
    // quand l'utilisateur est connecté (toutes les 5 secondes)
    setInterval(function () {
        if (window.currentUserId && window.currentUsername) {
            const privateMessagesBtn = document.getElementById('private-messages-btn');
            if (privateMessagesBtn && privateMessagesBtn.style.display === 'none') {
                console.log('🔧 Correction automatique: ré-affichage du bouton Messages Privés');
                if (window.forceShowPrivateMessagesButton) {
                    window.forceShowPrivateMessagesButton();
                }
            }
        }
    }, 5000);
    // Ajouter les événements pour les boutons d'action du chat
    const inviteBtn = document.getElementById('invite-btn');
    const blockBtn = document.getElementById('block-btn');
    if (inviteBtn) {
        inviteBtn.addEventListener('click', function () {
            const currentUser = window.getCurrentChatUser();
            const pong = window.PONG;
            if (currentUser && pong && pong.Chat) {
                // Simuler la commande /invite
                const msgInput = document.getElementById('msg');
                if (msgInput) {
                    msgInput.value = `/invite "${currentUser}"`;
                    // Déclencher l'envoi du message
                    const sendBtn = document.getElementById('send');
                    if (sendBtn) {
                        sendBtn.click();
                    }
                }
            }
            else {
                alert('Aucune conversation sélectionnée');
            }
        });
    }
    if (blockBtn) {
        blockBtn.addEventListener('click', function () {
            const currentUser = window.getCurrentChatUser();
            const pong = window.PONG;
            if (currentUser && pong && pong.Chat) {
                const i18n = window.i18n;
                // Vérifier si l'utilisateur est bloqué via la liste de la classe Chat
                const isBlocked = pong.Chat.blockedUsers && pong.Chat.blockedUsers.has(currentUser);
                if (isBlocked) {
                    // Débloquer l'utilisateur
                    const confirmMsg = i18n ? i18n.t('chat_confirm_unblock', { user: currentUser }) : `Êtes-vous sûr de vouloir débloquer ${currentUser} ?`;
                    const confirm = window.confirm(confirmMsg);
                    if (confirm) {
                        const msgInput = document.getElementById('msg');
                        if (msgInput) {
                            msgInput.value = `/unblock "${currentUser}"`;
                            const sendBtn = document.getElementById('send');
                            if (sendBtn) {
                                sendBtn.click();
                            }
                        }
                    }
                }
                else {
                    // Bloquer l'utilisateur
                    const confirmMsg = i18n ? i18n.t('chat_confirm_block', { user: currentUser }) : `Êtes-vous sûr de vouloir bloquer ${currentUser} ?`;
                    const confirm = window.confirm(confirmMsg);
                    if (confirm) {
                        const msgInput = document.getElementById('msg');
                        if (msgInput) {
                            msgInput.value = `/block "${currentUser}"`;
                            const sendBtn = document.getElementById('send');
                            if (sendBtn) {
                                sendBtn.click();
                            }
                        }
                    }
                }
            }
            else {
                const i18n = window.i18n;
                alert(i18n ? i18n.t('chat_no_conversation') : 'Aucune conversation sélectionnée');
            }
        });
    }
    // Observer les changements dans le titre de la conversation pour réinitialiser le bouton
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentChatEl = document.getElementById('current-chat');
                if (currentChatEl && currentChatEl.textContent && currentChatEl.textContent.includes('Conversation avec')) {
                    window.resetBlockButton();
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
//# sourceMappingURL=chat-ui.js.map