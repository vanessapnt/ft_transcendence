class GameInviteHandler {
    private username: string | null;
    private previousScreen: string | null = null;
    private onSystemMessage: (text: string) => void;

    constructor(username: string | null, onSystemMessage: (text: string) => void) {
        this.username = username;
        this.onSystemMessage = onSystemMessage;
    }

    public setUsername(username: string): void {
        this.username = username;
    }

    public handleInvite(data: ChatData, ws: WebSocket | null): void {
        console.log("🎮 Invitation reçue:", data);
        const from = data.from;
        const fromDisplayName = data.fromDisplayName || from;

        if (!from || !ws) {
            console.log("❌ Données manquantes pour l'invitation:", { from, ws: !!ws });
            return;
        }

        console.log(`📩 Invitation de ${fromDisplayName} (username: ${from}) - affichage du confirm...`);
        const accept = window.confirm(
            `${fromDisplayName} t'invite à jouer à Pong.\nVeux-tu accepter ?`
        );

        console.log(`✅ Réponse à l'invitation: ${accept ? 'acceptée' : 'refusée'}, envoi vers username: ${from}`);

        ws.send(
            JSON.stringify({
                type: "inviteResponse",
                to: from,
                accepted: accept,
            })
        );

        if (accept) {
            this.saveCurrentScreen();
            const i18n = (window as any).i18n;
            this.onSystemMessage(i18n ? i18n.t('chat_launching_game') : "🎮 Lancement du jeu Pong...");

            const chatPanel = document.getElementById('chat-panel');
            if (chatPanel) {
                chatPanel.classList.remove('active');
            }

            setTimeout(() => {
                const pong = (window as any).PONG;
                if (pong?.launchInvitedGame) {
                    pong.launchInvitedGame(from, this.username || 'Player', (winner: string) => {
                        this.onInvitedGameEnd(from, this.username || 'Player', winner, ws);
                    });
                }

                setTimeout(() => {
                    const board = document.getElementById('board') as HTMLCanvasElement;
                    if (board) board.focus();
                    window.focus();
                }, 100);
            }, 300);
        } else {
            const i18n = (window as any).i18n;
            this.onSystemMessage(i18n ? i18n.t('chat_invite_declined', { from }) : `Invitation de ${from} refusée.`);
        }
    }

    public handleInviteResponse(data: ChatData): void {
        console.log('📥 handleInviteResponse appelé:', data);
        const from = data.from;
        if (!from) {
            console.log('❌ Pas de from dans data');
            return;
        }

        const i18n = (window as any).i18n;
        console.log('🔍 data.accepted =', data.accepted);
        if (data.accepted) {
            console.log('✅ Invitation acceptée');
            this.showGameInProgress(from);
        } else {
            console.log('❌ Invitation refusée');
            this.onSystemMessage(
                i18n ? i18n.t('chat_invite_declined_by', { from }) : `${from} a refusé ton invitation.`
            );
        }
    }

    public handleGameEnded(data: ChatData): void {
        console.log("🏁 Partie terminée, retour à l'écran précédent");
        
        const gameInProgressOverlay = document.getElementById('game-in-progress-overlay') as HTMLElement;
        if (gameInProgressOverlay) {
            gameInProgressOverlay.classList.remove('active');
            console.log('✅ Overlay caché');
        }

        this.restoreUIElements();
        this.restorePreviousScreen();
        this.previousScreen = null;
    }

    private saveCurrentScreen(): void {
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel && chatPanel.classList.contains('active')) {
            this.previousScreen = 'chat';
        } else {
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen) {
                this.previousScreen = activeScreen.id;
            } else {
                this.previousScreen = 'home-view';
            }
        }
        console.log('💾 Écran sauvegardé avant le jeu:', this.previousScreen);
    }

    private restoreUIElements(): void {
        const avatarContainer = document.getElementById('avatar-container');
        const langSelector = document.getElementById('lang-selector-container');
        const userInfo = document.getElementById('user-info');
        
        if (avatarContainer) avatarContainer.style.display = '';
        if (langSelector) langSelector.style.display = '';
        if (userInfo) userInfo.style.display = '';
    }

    private restorePreviousScreen(): void {
        if (this.previousScreen === 'chat') {
            const chatPanel = document.getElementById('chat-panel') as HTMLElement;
            if (chatPanel) {
                chatPanel.classList.add('active');
                console.log('✅ Chat réaffiché');
                window.history.pushState({ page: 'chat' }, '', '#chat');
            }
        } else if (this.previousScreen) {
            const screen = document.getElementById(this.previousScreen);
            if (screen) {
                screen.classList.add('active');
                console.log('✅ Écran réaffiché:', this.previousScreen);
                const screenName = this.previousScreen.replace('-view', '').replace('mode-selection', 'mode');
                window.history.pushState({ page: screenName }, '', `#${screenName}`);
            }
        } else {
            const pong = (window as any).PONG;
            if (pong && pong.Nav) {
                pong.Nav.showHome();
                console.log('✅ Retour à home (par défaut)');
            }
        }
    }

    private showGameInProgress(opponentName: string): void {
        console.log('🎮 Affichage overlay "Partie en cours" pour', opponentName);

        this.saveCurrentScreen();

        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
            chatPanel.classList.remove('active');
        }

        const gameInProgressOverlay = document.getElementById('game-in-progress-overlay') as HTMLElement;
        const opponentNameSpan = document.getElementById('opponent-name');

        if (gameInProgressOverlay && opponentNameSpan) {
            opponentNameSpan.textContent = opponentName;
            gameInProgressOverlay.classList.add('active');
            console.log('✅ Overlay "Partie en cours" affiché');
        } else {
            console.error('❌ Éléments overlay introuvables');
        }
    }

    private onInvitedGameEnd(player1: string, player2: string, winner: string, ws: WebSocket | null): void {
        console.log('🏆 Winner:', winner);

        // Sauvegarder le match
        const opponentUsername = player1 === this.username ? player2 : player1;
        fetch('/api/matches/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player2_username: opponentUsername,
                winner_username: winner,
                player1_score: 1,
                player2_score: 0,
                match_type: 'invitation'
            })
        })
            .then(res => res.json())
            .then(data => console.log('✅ Match sauvegardé:', data))
            .catch(err => console.error('❌ Erreur sauvegarde match:', err));

        // Notifier l'autre joueur
        if (ws) {
            const waitingPlayer = player1 === this.username ? player2 : player1;
            ws.send(JSON.stringify({
                type: "gameEnded",
                to: waitingPlayer
            }));
        }

        this.restoreUIElements();
        this.restorePreviousScreen();
        this.previousScreen = null;

        const profilePanel = document.getElementById('profile-panel') as HTMLElement;
        if (profilePanel) {
            profilePanel.classList.remove('active');
        }
        if ((window as any).clearProfilePanel) {
            (window as any).clearProfilePanel();
        }
    }
}
