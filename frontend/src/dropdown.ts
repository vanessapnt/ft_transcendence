// Dropdown menu management for avatar menu
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const avatarWrapper = document.getElementById('avatar-wrapper');
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        const privateMessagesBtn = document.getElementById('private-messages-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (!avatarWrapper || !dropdownMenu || !privateMessagesBtn || !editProfileBtn || !logoutBtn) {
            console.error('❌ Dropdown menu elements not found');
            return;
        }

        // Toggle du menu au clic sur l'avatar
        avatarWrapper.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!avatarWrapper.contains(e.target as Node) && !dropdownMenu.contains(e.target as Node)) {
                dropdownMenu.classList.remove('show');
            }
        });

        // Gérer le clic sur Private Messages
        privateMessagesBtn.addEventListener('click', function() {
            if ((window as any).toggleChat) (window as any).toggleChat();
            dropdownMenu.classList.remove('show');
        });

        // Gérer le clic sur Edit Profile
        editProfileBtn.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
            // Fermer le chat s'il est ouvert
            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel && chatPanel.style.display === 'flex') {
                chatPanel.style.display = 'none';
                // Réafficher les écrans du jeu
                const screens = document.querySelectorAll('.screen');
                screens.forEach(screen => {
                    (screen as HTMLElement).style.display = 'block';
                });
            }
        });

        // Gérer le clic sur Logout
        logoutBtn.addEventListener('click', function() {
            dropdownMenu.classList.remove('show');
        });

        // Fonctions pour compatibilité avec l'ancien code
        (window as any).createPrivateMessagesButton = function() {
            privateMessagesBtn.style.display = 'flex';
            console.log('✅ Bouton Private Messages affiché dans le menu');
            return privateMessagesBtn;
        };

        (window as any).removePrivateMessagesButton = function() {
            privateMessagesBtn.style.display = 'none';
            console.log('🗑️ Bouton Private Messages caché dans le menu');
        };

        // Pour compatibilité avec l'ancien code
        (window as any).forceShowPrivateMessagesButton = (window as any).createPrivateMessagesButton;
        (window as any).forceHidePrivateMessagesButton = (window as any).removePrivateMessagesButton;

        // Cacher Private Messages par défaut
        privateMessagesBtn.style.display = 'none';

        console.log('✅ Dropdown menu initialized');
    });
})();
