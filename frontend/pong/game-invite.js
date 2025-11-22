// Handle game invitations via URL parameters
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        // Lire les paramètres URL pour les invitations de jeu
        const urlParams = new URLSearchParams(window.location.search);
        const player1 = urlParams.get('player1');
        const player2 = urlParams.get('player2');
        if (player1 && player2) {
            // Délai pour s'assurer que tous les modules sont chargés
            setTimeout(() => {
                const pong = window.PONG;
                if (pong && pong.PongGame && pong.Nav) {
                    // Configurer les noms des joueurs
                    pong.PongGame.setPlayerNames(player1, player2);
                    // Aller à la vue de jeu et lancer la partie
                    pong.Nav.showGame();
                    pong.PongGame.start();
                    // Nettoyer l'URL pour éviter de relancer le jeu au refresh
                    window.history.replaceState({}, document.title, window.location.pathname);
                    console.log('🎮 Game started with players:', player1, 'vs', player2);
                }
            }, 500);
        }
    });
})();
//# sourceMappingURL=game-invite.js.map