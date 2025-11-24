(function() {

type ScreenId = 'home-view' | 'mode-selection' | 'game-view' | 'tournament-view';
type GameMode = 'local' | 'ai';

class Navigation
{
    // ScreenId est un type personnalisé qui restreint les valeurs possibles sinon erreur de compilation
    private currentScreen: ScreenId = 'home-view';
    private allowGameAccess: boolean = false; // Flag pour autoriser l'accès au jeu

    constructor()
    {
        this.init();
    }

    private init(): void
    {
        // DOMContentLoaded : les fonctions sont appelées une fois que le DOM est entièrement chargé
        // DOM : représentation en arbre du document HTML  accessible via l'objet global document
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize i18n
            const i18nModule = (window as any).i18n;
            if (i18nModule && i18nModule.init) {
                i18nModule.init();
                console.log('✅ i18n initialized');
            }

            this.bindGameModeBtns();
            this.setupBrowserNavigation();
            
            // Initialiser l'état de l'historique pour la page courante
            const hash = window.location.hash;
            if (!window.history.state) {
                // Pas d'état dans l'historique, on l'initialise
                if (!hash || hash === '' || hash === '#' || hash === '#home') {
                    window.history.replaceState({ page: 'home' }, '', '#home');
                    console.log('📍 État initial (home) créé avec replaceState:', { length: window.history.length });
                } else {
                    // Autre hash présent, initialiser son état
                    const page = hash.substring(1);
                    window.history.replaceState({ page }, '', hash);
                    console.log('📍 État initial créé pour:', page, { length: window.history.length });
                }
            }
            
            this.handleRouteChange();
            console.log('✅ Navigation initialized');
            console.log('📚 History length:', window.history.length, 'State:', window.history.state);
        });
    }

    private hideAllScreens(): void
    {
        // classList renvoie la liste des classes d'un élément
        // class = "screen active" -> class = "screen"
        document.querySelectorAll('.screen').forEach(el => {el.classList.remove('active');});
    }

    private showScreen(screenId: ScreenId): void
    {
        this.hideAllScreens();
        const screen = document.getElementById(screenId);
        if (screen)
        {
            screen.classList.add('active');
            this.currentScreen = screenId;
        } else
            console.error(`Screen not found: ${screenId}`);
    }

    showHome(): void
    {
        this.showScreen('home-view');
        // Ne pas ajouter à l'historique si on est déjà sur home (évite les doublons)
        if (window.location.hash !== '#home') {
            window.history.pushState({ page: 'home' }, '', '#home');
            console.log('📍 Home ajouté à l\'historique. Length:', window.history.length);
        }
        
        // S'assurer que le menu est visible
        const menu = document.querySelector('.menu-buttons') as HTMLElement;
        if (menu) menu.style.display = 'flex';
        
        // Cacher les formulaires login/signup
        const loginForm = document.getElementById('login-form') as HTMLElement;
        const signupForm = document.getElementById('signup-form') as HTMLElement;
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
        
        // pour l'appel depuis pause overlay
        this.hidePauseOverlay();
        this.stopGames();
    }

    showModeSelection(addToHistory: boolean = true): void
    {
        this.showScreen('mode-selection');
        if (addToHistory) {
            window.history.pushState({ page: 'mode' }, '', '#mode');
            console.log('📍 Mode selection ajouté à l\'historique. Length:', window.history.length);
        }
        // ajoute l'état mode à l'historique pour la flèche back + met à jour l'URL sans recharger la page
    }

    showGame(): void
    {
        this.allowGameAccess = true; // Autoriser l'accès au jeu
        this.showScreen('game-view');
        // Ne pas toucher à l'historique, juste changer le hash pour l'affichage
        window.location.hash = '#game';
    }

    showTournament(): void
    {
        this.showScreen('tournament-view');
        window.history.pushState({ page: 'tournament' }, '', '#tournament');
        
        // On reset le tournoi à chaque fois qu'on entre dans l'écran tournoi
        const gameModule = (window as any).PONG;
        if (gameModule?.Tournament?.reset) {
            // Normalement inutile car scripts dans le bon ordre dans index.html
            // bonne pratique et peut servir pour tests unitaires et si un script plante
            gameModule.Tournament.reset();
        }
    }

    launchGame(mode: GameMode): void
    {
        this.showGame();
        
        const gameModule = (window as any).PONG;
        
        if (gameModule?.PongGame?.resetPlayerNames) {
            gameModule.PongGame.resetPlayerNames();
        }
        
        if (mode === 'ai') {
            (window as any).currentGameMode = 'ai';
            if (gameModule?.PongGameAI) {
                gameModule.PongGameAI.start();
            }
        } else {
            (window as any).currentGameMode = 'local';
            if (gameModule?.PongGame) {
                gameModule.PongGame.start();
            }
        }
    }

    private hidePauseOverlay(): void
    {
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('active');
        }
    }

    private stopGames(): void
    {
        const gameModule = (window as any).PONG;
        
        if (gameModule?.PongGame?.stop)
            gameModule.PongGame.stop();

        if (gameModule?.PongGameAI?.stop)
            gameModule.PongGameAI.stop();
    }

    // arrow function : this reste lié au contexte englobant (Navigation)
    // fonction normale : this serait lié à l'élément déclencheur de l'événement (bouton)
    private bindGameModeBtns(): void
    {
        const localBtn = document.getElementById('mode-local');
        const aiBtn = document.getElementById('mode-ai');
        
        localBtn?.addEventListener('click', () => this.launchGame('local'));
        aiBtn?.addEventListener('click', () => this.launchGame('ai'));
    }

    private setupBrowserNavigation(): void
    {
        //popstate : pop() sur la pile d'historique (back/forward)
        window.addEventListener('popstate', (event) => {
            console.log('⬅️ Bouton retour cliqué. State:', event.state, 'Length:', window.history.length, 'Hash:', window.location.hash);
            this.stopGames(); // Arrête les jeux en cours lors de la navigation (sinon vitesse de balle * 2 à chaque relance jeu car 2 boucles update actives)
            this.handleRouteChange();
        });
    }

    private handleRouteChange(): void
    {
        const hash = window.location.hash;
        const chatPanel = document.getElementById('chat-panel');
        const editProfilePanel = document.getElementById('edit-profile-panel') as HTMLElement;
        
        // Fermer le chat si on n'est pas sur #chat
        if (hash !== '#chat' && chatPanel && chatPanel.classList.contains('active')) {
            chatPanel.classList.remove('active');
            // Mettre à jour le bouton Private Messages
            const privateMessagesBtn = document.getElementById('private-messages-btn');
            if (privateMessagesBtn) {
                const menuText = privateMessagesBtn.querySelector('.menu-text');
                const i18n = (window as any).i18n;
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
            // Afficher home sans ajouter à l'historique (déjà fait dans init)
            this.showScreen('home-view');
            this.hidePauseOverlay();
            this.stopGames();
            // Cacher les formulaires login/signup
            const loginForm = document.getElementById('login-form') as HTMLElement;
            const signupForm = document.getElementById('signup-form') as HTMLElement;
            const menu = document.querySelector('.menu-buttons') as HTMLElement;
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'none';
            if (menu) menu.style.display = 'flex';
        } else if (hash === '#game') {
            // Rediriger vers mode si on essaie d'accéder au jeu via l'historique
            if (!this.allowGameAccess) {
                window.location.hash = '#mode';
            } else {
                this.allowGameAccess = false; // Réinitialiser le flag
            }
        } else if (hash === '#tournament') {
            this.showTournament();
        } else if (hash === '#mode') {
            this.showModeSelection(false); // false = ne pas ajouter à l'historique (navigation via back)
        } else if (hash === '#chat') {
            // Ouvrir le chat
            if ((window as any).toggleChat) {
                if (chatPanel && !chatPanel.classList.contains('active')) {
                    (window as any).toggleChat();
                }
            }
        } else if (hash === '#edit-profile') {
            // Ouvrir le panel d'édition de profil
            if ((window as any).PONG && (window as any).PONG.showEditProfile) {
                const currentUsername = (window as any).currentUsername || '';
                const currentDisplayName = (window as any).currentDisplayName || '';
                (window as any).PONG.showEditProfile(currentUsername, currentDisplayName);
            }
        } else if (hash === '#signup') {
            // Afficher le formulaire signup sans ajouter à l'historique
            if ((window as any).showSignup) {
                (window as any).showSignup(false);
            }
        } else if (hash === '#login') {
            // Afficher le formulaire login sans ajouter à l'historique
            if ((window as any).showLogin) {
                (window as any).showLogin(false);
            }
        }
    }

    getCurrentScreen(): ScreenId
    {
        return this.currentScreen;
    }
}

// window : objet global du navigateur accessible depuis n'importe quel script
// en JS et TS on peut ajouter des propriétés dynamiquement
// TS protège contre les accès à des propriétés non déclarées, as any contourne la vérification
if (!(window as any).PONG)
    (window as any).PONG = {};

(window as any).PONG.Nav = new Navigation();

})();