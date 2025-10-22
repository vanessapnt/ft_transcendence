(function() {

type ScreenId = 'home-view' | 'mode-selection' | 'game-view' | 'tournament-view';
type GameMode = 'local' | 'ai';

class Navigation
{
    // ScreenId est un type personnalisé qui restreint les valeurs possibles sinon erreur de compilation
    private currentScreen: ScreenId = 'home-view';

    constructor()
    {
        this.init();
    }

    private init(): void
    {
        // DOMContentLoaded : les fonctions sont appelées une fois que le DOM est entièrement chargé
        // DOM : représentation en arbre du document HTML  accessible via l'objet global document
        document.addEventListener('DOMContentLoaded', () => {
            this.bindGameModeBtns();
            this.setupBrowserNavigation();
            this.handleRouteChange();
            console.log('✅ Navigation initialized');
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
        window.history.pushState({ page: 'home' }, '', '#home');
        
        // pour l'appel depuis pause overlay
        this.hidePauseOverlay();
        this.stopGames();
    }

    showModeSelection(): void
    {
        this.showScreen('mode-selection');
        window.history.pushState({ page: 'mode' }, '', '#mode');
        // ajoute l'état mode à l'historique pour la flèche back + met à jour l'URL sans recharger la page
    }

    showGame(): void {
        this.showScreen('game-view');
        window.history.pushState({ page: 'game' }, '', '#game');
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
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });
    }

    private handleRouteChange(): void
    {
        const hash = window.location.hash;
        
        if (hash === '#home' || hash === '') {
            this.showHome();
        } else if (hash === '#game') {
            this.showGame();
        } else if (hash === '#tournament') {
            this.showTournament();
        } else if (hash === '#mode') {
            this.showModeSelection();
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