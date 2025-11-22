// Handle game invitations via URL parameters  
(function() {
    document.addEventListener('DOMContentLoaded', function () {
        // Lire les paramètres URL pour les invitations de jeu
        const urlParams = new URLSearchParams(window.location.search);
        const player1 = urlParams.get('player1');
        const player2 = urlParams.get('player2');

        if (player1 && player2) {
            // Délai pour s'assurer que tous les modules sont chargés
            setTimeout(() => {
                launchInvitedGame(player1, player2);
                
                // Nettoyer l'URL pour éviter de relancer le jeu au refresh
                window.history.replaceState({}, document.title, window.location.pathname);
                
                console.log('🎮 Game started with players:', player1, 'vs', player2);
            }, 500);
        }
    });

    // Fonction pour lancer un jeu invité (utilise la même logique que le tournoi)
    function launchInvitedGame(player1: string, player2: string): void {
        const gameView = document.getElementById('game-view');
        
        // Désactiver tous les écrans
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => {
            (screen as HTMLElement).classList.remove('active');
        });
        
        // Activer la vue de jeu
        if (gameView) {
            gameView.classList.add('active');
        }
        
        // Cacher le chat s'il est ouvert
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.style.display === 'flex') {
            chatPanel.style.display = 'none';
        }
        
        // Cacher tous les overlays/modals qui pourraient être ouverts
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            (overlay as HTMLElement).style.display = 'none';
        });
        
        // Supprimer le formulaire d'édition de profil s'il est ouvert
        const editProfileForm = document.getElementById('edit-profile-form');
        if (editProfileForm) {
            editProfileForm.remove();
        }
        
        // Supprimer tous les autres formulaires auth qui pourraient être ouverts
        const authForms = document.querySelectorAll('.auth-form');
        authForms.forEach(form => {
            form.remove();
        });
        
        // Réafficher le menu des boutons s'il était caché
        const menuButtons = document.querySelector('.menu-buttons') as HTMLElement;
        if (menuButtons) {
            menuButtons.style.display = '';
        }
        
        // Réafficher le menu dropdown de l'avatar s'il était caché
        const dropdownMenu = document.getElementById('user-dropdown-menu') as HTMLElement;
        if (dropdownMenu) {
            dropdownMenu.style.display = '';
        }
        
        const pong = (window as any).PONG;
        if (pong?.PongGame) {
            // Configurer les noms des joueurs
            pong.PongGame.setPlayerNames(player1, player2);
            
            // Définir un callback pour la fin du match (retour au menu)
            pong.PongGame.setCallback((winner: string) => {
                console.log('� Winner:', winner);
                // Arrêter le jeu
                if (pong.PongGame) {
                    pong.PongGame.stop();
                }
                // Retourner au menu principal
                if (pong.Nav) {
                    pong.Nav.showHome();
                }
            });
            
            // Démarrer le jeu
            pong.PongGame.start();
        } else {
            console.error('❌ PongGame not found');
        }
    }
})();
