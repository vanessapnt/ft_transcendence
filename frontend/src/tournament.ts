(function() {

interface TournamentPlayer { name: string; wins: number; }
interface Match { player1: string; player2: string; winner?: string; } //winner optionnel

class Tournament
{
    private players: TournamentPlayer[] = [];
    private matches: Match[] = [];
    private currentMatchIndex = 0;
    private currentNbPlayers: number = 0; // Store current number of players

    constructor() {
        console.log('Tournament module initialized');
    }

    private showSection(sectionId: string): void
    {
        const sections = ['tournament-selection', 'tournament-setup', 'tournament-status', 'tournament-winner'];
        //id est remplacé par les valeurs dans sections grâce à forEach
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                if (id === sectionId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            }
        });
    }

    createTournament(nbPlayers: number): void
    {
        console.log(`Creating tournament with ${nbPlayers} players`);
        this.players = [];
        this.matches = [];
        this.currentMatchIndex = 0;
        this.currentNbPlayers = nbPlayers; // Store it
        this.createPlayerInputs(nbPlayers);
    }

    private createPlayerInputs(nbPlayers: number): void
    {
        const container = document.getElementById('player-inputs-container');
        if (!container) {
            console.error('player-inputs-container not found!');
            return;
        }
        container.innerHTML = ''; //supprime les enfants

        for (let i = 0; i < nbPlayers; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `player-${i}`;
            // Use i18next with interpolation for placeholder
            if ((window as any).i18n && typeof (window as any).i18n.t === 'function') {
                input.placeholder = (window as any).i18n.t('player_name_placeholder', { number: i + 1 });
            } else {
                input.placeholder = `Player ${i + 1} name`;
            }
            container.appendChild(input);
        }

        const startBtn = document.createElement('button');
        startBtn.type = 'button';
        startBtn.id = 'start-tournament-btn';
        if ((window as any).i18n && typeof (window as any).i18n.t === 'function') {
            startBtn.textContent = (window as any).i18n.t('start_tournament');
        } else {
            startBtn.textContent = 'Start Tournament';
        }
        startBtn.addEventListener('click', () => this.startTournament(nbPlayers));
        container.appendChild(startBtn);

        this.showSection('tournament-setup');
    }

    private startTournament(nbPlayers: number): void{
        const i18n = (window as any).i18n;
        const playerNames: string[] = [];
        for (let i = 0; i < nbPlayers; i++) {
            const input = document.getElementById(`player-${i}`) as HTMLInputElement | null;
            if (!input) { alert(i18n.t('alert_input_missing')); return; }
            const name = input.value.trim();
            if (!name) { alert(i18n.t('alert_enter_name', { number: i + 1 })); return; }
            playerNames.push(name);
        }

        if (new Set(playerNames).size !== playerNames.length) { alert(i18n.t('alert_names_unique')); return; }

        this.players = playerNames.map(n => ({ name: n, wins: 0 }));
        this.generateMatches();
        this.showTournamentStatus();
    }

    private generateMatches(): void {
        this.matches = [];
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                this.matches.push({ player1: this.players[i].name, player2: this.players[j].name });
            }
        }
    }

    private escapeHtml(text: string): string {
        const map: { [k: string]: string } = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, ch => map[ch] || ch);
    }

    private showTournamentStatus(): void {
        const i18n = (window as any).i18n;
        if (this.currentMatchIndex >= this.matches.length) { this.showWinner(); return; }
        const nextMatch = this.matches[this.currentMatchIndex];

        const nextMatchTitle = document.getElementById('next-match-title');
        const nextMatchVersus = document.getElementById('next-match-versus');
        const nextMatchControls = document.getElementById('next-match-controls');
        if (nextMatchTitle) nextMatchTitle.textContent = i18n.t('next_match_number', { current: this.currentMatchIndex + 1, total: this.matches.length });
        if (nextMatchVersus) nextMatchVersus.innerHTML = `${this.escapeHtml(nextMatch.player1)} <span class="vs-text">${i18n.t('vs')}</span> ${this.escapeHtml(nextMatch.player2)}`;
        if (nextMatchControls) nextMatchControls.textContent = i18n.t('controls_info', { player1: nextMatch.player1, player2: nextMatch.player2 });

        const standingsContainer = document.getElementById('standings-container');
        if (standingsContainer) {
            const sorted = [...this.players].sort((a,b) => b.wins - a.wins);
            standingsContainer.innerHTML = sorted.map((p,i) => `<div class="standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span class="wins-count">${p.wins} ${i18n.t('wins')}</span></div>`).join('');
        }

        const matchesContainer = document.getElementById('matches-container');
        if (matchesContainer) {
            matchesContainer.innerHTML = this.matches.map((m,i) => {
                const isCompleted = m.winner !== undefined;
                const isCurrent = i === this.currentMatchIndex;
                const statusClass = isCompleted ? 'match-completed' : (isCurrent ? 'match-current' : 'match-pending');
                const statusText = isCompleted ? `${i18n.t('winner')}: ${this.escapeHtml(m.winner!)}` : (isCurrent ? i18n.t('next') : i18n.t('pending'));
                return `<div class="match-item ${statusClass}"><p class="match-players">${i18n.t('match')} ${i+1}: ${this.escapeHtml(m.player1)} ${i18n.t('vs').toLowerCase()} ${this.escapeHtml(m.player2)}</p><p class="match-status">${statusText}</p></div>`;
            }).join('');
        }

        const startBtn = document.getElementById('start-next-match-btn');
        const quitBtn = document.getElementById('quit-tournament-btn');
        if (startBtn) startBtn.onclick = () => this.launchPongGame(nextMatch);
        if (quitBtn) quitBtn.onclick = () => { if (confirm(i18n.t('quit_tournament_confirm'))) { const gm = (window as any).PONG; if (gm?.Nav) gm.Nav.showHome(); } };

        this.showSection('tournament-status');
    }

    private launchPongGame(match: Match): void {
        const gameView = document.getElementById('game-view');
        const tournamentView = document.getElementById('tournament-view');
        if (gameView) gameView.classList.add('active');
        if (tournamentView) tournamentView.classList.remove('active');
        const gm = (window as any).PONG;
        if (gm?.PongGame) {
            gm.PongGame.setPlayerNames(match.player1, match.player2);
            gm.PongGame.setCallback((winner: string) => this.onMatchEnd(match, winner)); //arrow function = callback qui appelle this.onMatchEnd dans Tournament.ts avec le paramètre winner
            gm.PongGame.start();
        } else console.error('PongGame not found');
    }

    private onMatchEnd(match: Match, winner: string): void {
        match.winner = winner;
        const wp = this.players.find(p => p.name === winner);
        if (wp) wp.wins++;
        this.currentMatchIndex++;
        const gm = (window as any).PONG; if (gm?.PongGame) gm.PongGame.stop();
        const gameView = document.getElementById('game-view');
        const tournamentView = document.getElementById('tournament-view');
        if (gameView) gameView.classList.remove('active');
        if (tournamentView) tournamentView.classList.add('active');
        setTimeout(() => this.showTournamentStatus(), 500);
    }

    private showWinner(): void {
        const i18n = (window as any).i18n;
        if (this.players.length === 0) return;
        let winner = this.players[0];
        for (const p of this.players) if (p.wins > winner.wins) winner = p;
        const winnerName = document.getElementById('winner-name');
        const winnerScore = document.getElementById('winner-score');
        const finalStandings = document.getElementById('final-standings-container');
        if (winnerName) winnerName.textContent = winner.name;
        if (winnerScore) winnerScore.textContent = `${winner.wins} ${i18n.t('victories')}`;
        if (finalStandings) finalStandings.innerHTML = this.players.sort((a,b) => b.wins - a.wins).map((p,i) => `<div class="final-standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span>${p.wins} ${i18n.t('wins')}</span></div>`).join('');
        const backBtn = document.getElementById('back-to-menu-btn');
        if (backBtn) backBtn.onclick = () => { const gm = (window as any).PONG; if (gm?.Nav) gm.Nav.showHome(); };
        this.showSection('tournament-winner');
        (window as any).tournamentWinner = winner;
    }

    reset(): void
    {
        this.players = [];
        this.matches = [];
        this.currentMatchIndex = 0;
        this.currentNbPlayers = 0;
        const container = document.getElementById('player-inputs-container');
        if (container)
            container.innerHTML = '';
        this.showSection('tournament-selection');
    }

    // Public method to update placeholders when language changes
    updatePlaceholders(): void {
        const i18n = (window as any).i18n;
        if (!i18n || typeof i18n.t !== 'function') return;

        if (this.currentNbPlayers > 0) {
            for (let i = 0; i < this.currentNbPlayers; i++) {
                const input = document.getElementById(`player-${i}`) as HTMLInputElement | null;
                if (input) {
                    input.placeholder = i18n.t('player_name_placeholder', { number: i + 1 });
                }
            }
            
            // Update the start tournament button
            const startBtn = document.getElementById('start-tournament-btn') as HTMLButtonElement | null;
            if (startBtn) {
                startBtn.textContent = i18n.t('start_tournament');
            }
        }

        // Update tournament status if currently displayed
        if (this.currentMatchIndex < this.matches.length && this.matches.length > 0) {
            const nextMatch = this.matches[this.currentMatchIndex];
            
            // Update next match title
            const nextMatchTitle = document.getElementById('next-match-title');
            if (nextMatchTitle) {
                nextMatchTitle.textContent = i18n.t('next_match_number', { current: this.currentMatchIndex + 1, total: this.matches.length });
            }

            // Update VS text
            const nextMatchVersus = document.getElementById('next-match-versus');
            if (nextMatchVersus) {
                nextMatchVersus.innerHTML = `${this.escapeHtml(nextMatch.player1)} <span class="vs-text">${i18n.t('vs')}</span> ${this.escapeHtml(nextMatch.player2)}`;
            }

            // Update controls info
            const nextMatchControls = document.getElementById('next-match-controls');
            if (nextMatchControls) {
                nextMatchControls.textContent = i18n.t('controls_info', { player1: nextMatch.player1, player2: nextMatch.player2 });
            }

            // Update standings
            const standingsContainer = document.getElementById('standings-container');
            if (standingsContainer) {
                const sorted = [...this.players].sort((a,b) => b.wins - a.wins);
                standingsContainer.innerHTML = sorted.map((p,i) => `<div class="standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span class="wins-count">${p.wins} ${i18n.t('wins')}</span></div>`).join('');
            }

            // Update matches list
            const matchesContainer = document.getElementById('matches-container');
            if (matchesContainer) {
                matchesContainer.innerHTML = this.matches.map((m,i) => {
                    const isCompleted = m.winner !== undefined;
                    const isCurrent = i === this.currentMatchIndex;
                    const statusClass = isCompleted ? 'match-completed' : (isCurrent ? 'match-current' : 'match-pending');
                    const statusText = isCompleted ? `${i18n.t('winner')}: ${this.escapeHtml(m.winner!)}` : (isCurrent ? i18n.t('next') : i18n.t('pending'));
                    return `<div class="match-item ${statusClass}"><p class="match-players">${i18n.t('match')} ${i+1}: ${this.escapeHtml(m.player1)} ${i18n.t('vs').toLowerCase()} ${this.escapeHtml(m.player2)}</p><p class="match-status">${statusText}</p></div>`;
                }).join('');
            }
        }

        // Update winner screen if displayed
        if (this.currentMatchIndex >= this.matches.length && this.players.length > 0) {
            let winner = this.players[0];
            for (const p of this.players) if (p.wins > winner.wins) winner = p;
            
            const winnerScore = document.getElementById('winner-score');
            if (winnerScore) {
                winnerScore.textContent = `${winner.wins} ${i18n.t('victories')}`;
            }

            const finalStandings = document.getElementById('final-standings-container');
            if (finalStandings) {
                finalStandings.innerHTML = this.players.sort((a,b) => b.wins - a.wins).map((p,i) => `<div class="final-standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span>${p.wins} ${i18n.t('wins')}</span></div>`).join('');
            }
        }
    }
}

if (!(window as any).PONG) (window as any).PONG = {};
(window as any).PONG.Tournament = new Tournament();

})();