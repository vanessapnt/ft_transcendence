// Dropdown menu management for avatar menu
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const avatarWrapper = document.getElementById('avatar-wrapper');
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        const profileBtn = document.getElementById('profile-btn');
        const privateMessagesBtn = document.getElementById('private-messages-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const profilePanel = document.getElementById('profile-panel');
        const profilePanelClose = document.getElementById('profile-panel-close');
        if (!avatarWrapper || !dropdownMenu || !profileBtn || !privateMessagesBtn || !editProfileBtn || !logoutBtn) {
            console.error('❌ Dropdown menu elements not found');
            return;
        }
        // Toggle du menu au clic sur l'avatar
        avatarWrapper.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function (e) {
            if (!avatarWrapper.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
        // Gérer le clic sur Profile
        profileBtn.addEventListener('click', function () {
            if (profilePanel) {
                profilePanel.classList.add('active');
                dropdownMenu.classList.remove('show');
                // Charger les infos du profil
                if (window.loadUserProfile) {
                    window.loadUserProfile();
                }
            }
        });
        // Fermer le profile panel
        if (profilePanelClose && profilePanel) {
            profilePanelClose.addEventListener('click', function () {
                profilePanel.classList.remove('active');
            });
            profilePanel.addEventListener('click', function (e) {
                if (e.target === profilePanel) {
                    profilePanel.classList.remove('active');
                }
            });
        }
        // Gérer le clic sur Private Messages
        privateMessagesBtn.addEventListener('click', function () {
            window.history.pushState({ page: 'chat' }, '', '#chat');
            if (window.toggleChat)
                window.toggleChat();
            dropdownMenu.classList.remove('show');
        });
        // Gérer le clic sur Edit Profile
        editProfileBtn.addEventListener('click', function () {
            window.history.pushState({ page: 'edit-profile' }, '', '#edit-profile');
            dropdownMenu.classList.remove('show');
            // Fermer le chat s'il est ouvert
            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel && chatPanel.classList.contains('active')) {
                chatPanel.classList.remove('active');
            }
        });
        // Gérer le clic sur Logout
        logoutBtn.addEventListener('click', function () {
            dropdownMenu.classList.remove('show');
        });
        // Fonctions pour compatibilité avec l'ancien code
        window.createPrivateMessagesButton = function () {
            privateMessagesBtn.style.display = 'flex';
            console.log('✅ Bouton Private Messages affiché dans le menu');
            return privateMessagesBtn;
        };
        window.removePrivateMessagesButton = function () {
            privateMessagesBtn.style.display = 'none';
            console.log('🗑️ Bouton Private Messages caché dans le menu');
        };
        // Pour compatibilité avec l'ancien code
        window.forceShowPrivateMessagesButton = window.createPrivateMessagesButton;
        window.forceHidePrivateMessagesButton = window.removePrivateMessagesButton;
        // Cacher Private Messages par défaut
        privateMessagesBtn.style.display = 'none';
        console.log('✅ Dropdown menu initialized');
    });
})();
//# sourceMappingURL=dropdown.js.map