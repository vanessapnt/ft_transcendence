(function () {
    class Navigation {
        constructor() {
            // ScreenId est un type personnalisé qui restreint les valeurs possibles sinon erreur de compilation
            this.currentScreen = 'home-view';
            this.init();
        }
        init() {
            // DOMContentLoaded : les fonctions sont appelées une fois que le DOM est entièrement chargé
            // DOM : représentation en arbre du document HTML  accessible via l'objet global document
            document.addEventListener('DOMContentLoaded', () => {
                // Initialize i18n
                const i18nModule = window.i18n;
                if (i18nModule && i18nModule.init) {
                    i18nModule.init();
                    console.log('✅ i18n initialized');
                }
                this.bindGameModeBtns();
                this.setupBrowserNavigation();
                this.handleRouteChange();
                console.log('✅ Navigation initialized');
            });
        }
        hideAllScreens() {
            // classList renvoie la liste des classes d'un élément
            // class = "screen active" -> class = "screen"
            document.querySelectorAll('.screen').forEach(el => { el.classList.remove('active'); });
        }
        showScreen(screenId) {
            this.hideAllScreens();
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('active');
                this.currentScreen = screenId;
            }
            else
                console.error(`Screen not found: ${screenId}`);
        }
        showHome() {
            this.showScreen('home-view');
            window.history.pushState({ page: 'home' }, '', '#home');
            // pour l'appel depuis pause overlay
            this.hidePauseOverlay();
            this.stopGames();
        }
        showModeSelection() {
            this.showScreen('mode-selection');
            window.history.pushState({ page: 'mode' }, '', '#mode');
            // ajoute l'état mode à l'historique pour la flèche back + met à jour l'URL sans recharger la page
        }
        showGame() {
            this.showScreen('game-view');
            window.history.pushState({ page: 'game' }, '', '#game');
        }
        showTournament() {
            var _a;
            this.showScreen('tournament-view');
            window.history.pushState({ page: 'tournament' }, '', '#tournament');
            // On reset le tournoi à chaque fois qu'on entre dans l'écran tournoi
            const gameModule = window.PONG;
            if ((_a = gameModule === null || gameModule === void 0 ? void 0 : gameModule.Tournament) === null || _a === void 0 ? void 0 : _a.reset) {
                // Normalement inutile car scripts dans le bon ordre dans index.html
                // bonne pratique et peut servir pour tests unitaires et si un script plante
                gameModule.Tournament.reset();
            }
        }
        launchGame(mode) {
            var _a;
            this.showGame();
            const gameModule = window.PONG;
            if ((_a = gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGame) === null || _a === void 0 ? void 0 : _a.resetPlayerNames) {
                gameModule.PongGame.resetPlayerNames();
            }
            if (mode === 'ai') {
                window.currentGameMode = 'ai';
                if (gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGameAI) {
                    gameModule.PongGameAI.start();
                }
            }
            else {
                window.currentGameMode = 'local';
                if (gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGame) {
                    gameModule.PongGame.start();
                }
            }
        }
        hidePauseOverlay() {
            const pauseOverlay = document.getElementById('pause-overlay');
            if (pauseOverlay) {
                pauseOverlay.classList.remove('active');
            }
        }
        stopGames() {
            var _a, _b;
            const gameModule = window.PONG;
            if ((_a = gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGame) === null || _a === void 0 ? void 0 : _a.stop)
                gameModule.PongGame.stop();
            if ((_b = gameModule === null || gameModule === void 0 ? void 0 : gameModule.PongGameAI) === null || _b === void 0 ? void 0 : _b.stop)
                gameModule.PongGameAI.stop();
        }
        // arrow function : this reste lié au contexte englobant (Navigation)
        // fonction normale : this serait lié à l'élément déclencheur de l'événement (bouton)
        bindGameModeBtns() {
            const localBtn = document.getElementById('mode-local');
            const aiBtn = document.getElementById('mode-ai');
            localBtn === null || localBtn === void 0 ? void 0 : localBtn.addEventListener('click', () => this.launchGame('local'));
            aiBtn === null || aiBtn === void 0 ? void 0 : aiBtn.addEventListener('click', () => this.launchGame('ai'));
        }
        setupBrowserNavigation() {
            //popstate : pop() sur la pile d'historique (back/forward)
            window.addEventListener('popstate', () => {
                this.stopGames(); // Arrête les jeux en cours lors de la navigation (sinon vitesse de balle * 2 à chaque relance jeu car 2 boucles update actives)
                this.handleRouteChange();
            });
        }
        handleRouteChange() {
            const hash = window.location.hash;
            const chatPanel = document.getElementById('chat-panel');
            const editProfilePanel = document.getElementById('edit-profile-panel');
            // Fermer le chat si on n'est pas sur #chat
            if (hash !== '#chat' && chatPanel && chatPanel.classList.contains('active')) {
                chatPanel.classList.remove('active');
                // Mettre à jour le bouton Private Messages
                const privateMessagesBtn = document.getElementById('private-messages-btn');
                if (privateMessagesBtn) {
                    const menuText = privateMessagesBtn.querySelector('.menu-text');
                    const i18n = window.i18n;
                    if (menuText) {
                        menuText.textContent = i18n ? i18n.t('private_messages') : 'Private Messages';
                    }
                }
            }
            // Fermer le panel edit profile si on n'est pas sur #edit-profile
            if (hash !== '#edit-profile' && editProfilePanel && editProfilePanel.classList.contains('active')) {
                editProfilePanel.classList.remove('active');
            }
            if (hash === '#home' || hash === '') {
                this.showHome();
            }
            else if (hash === '#game') {
                this.showGame();
            }
            else if (hash === '#tournament') {
                this.showTournament();
            }
            else if (hash === '#mode') {
                this.showModeSelection();
            }
            else if (hash === '#chat') {
                // Ouvrir le chat
                if (window.toggleChat) {
                    if (chatPanel && !chatPanel.classList.contains('active')) {
                        window.toggleChat();
                    }
                }
            }
            else if (hash === '#edit-profile') {
                // Ouvrir le panel d'édition de profil
                if (window.PONG && window.PONG.showEditProfile) {
                    const currentUsername = window.currentUsername || '';
                    const currentDisplayName = window.currentDisplayName || '';
                    window.PONG.showEditProfile(currentUsername, currentDisplayName);
                }
            }
        }
        getCurrentScreen() {
            return this.currentScreen;
        }
    }
    // window : objet global du navigateur accessible depuis n'importe quel script
    // en JS et TS on peut ajouter des propriétés dynamiquement
    // TS protège contre les accès à des propriétés non déclarées, as any contourne la vérification
    if (!window.PONG)
        window.PONG = {};
    window.PONG.Nav = new Navigation();
})();
//# sourceMappingURL=navigation.js.map