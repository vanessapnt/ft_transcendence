(function() {

interface TournamentPlayer { name: string; wins: number; }
interface Match { player1: string; player2: string; winner?: string; } //winner optionnel

class Tournament
{
    private players: TournamentPlayer[] = [];
    private matches: Match[] = [];
    private currentMatchIndex = 0;

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
            input.placeholder = `Player ${i + 1} name`;
            container.appendChild(input);
        }

        const startBtn = document.createElement('button');
        startBtn.type = 'button';
        startBtn.textContent = 'Start Tournament';
        startBtn.addEventListener('click', () => this.startTournament(nbPlayers));
        container.appendChild(startBtn);

        this.showSection('tournament-setup');
    }

    private startTournament(nbPlayers: number): void{
        const playerNames: string[] = [];
        for (let i = 0; i < nbPlayers; i++) {
            const input = document.getElementById(`player-${i}`) as HTMLInputElement | null;
            if (!input) { alert('Input missing'); return; }
            const name = input.value.trim();
            if (!name) { alert(`Please enter a name for Player ${i + 1}`); return; }
            playerNames.push(name);
        }

        if (new Set(playerNames).size !== playerNames.length) { alert('All player names must be unique!'); return; }

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
        if (this.currentMatchIndex >= this.matches.length) { this.showWinner(); return; }
        const nextMatch = this.matches[this.currentMatchIndex];

        const nextMatchTitle = document.getElementById('next-match-title');
        const nextMatchVersus = document.getElementById('next-match-versus');
        const nextMatchControls = document.getElementById('next-match-controls');
        if (nextMatchTitle) nextMatchTitle.textContent = `NEXT MATCH (${this.currentMatchIndex + 1}/${this.matches.length})`;
        if (nextMatchVersus) nextMatchVersus.innerHTML = `${this.escapeHtml(nextMatch.player1)} <span class="vs-text">VS</span> ${this.escapeHtml(nextMatch.player2)}`;
        if (nextMatchControls) nextMatchControls.textContent = `${nextMatch.player1}: W/S keys | ${nextMatch.player2}: ↑/↓ keys`;

        const standingsContainer = document.getElementById('standings-container');
        if (standingsContainer) {
            const sorted = [...this.players].sort((a,b) => b.wins - a.wins);
            standingsContainer.innerHTML = sorted.map((p,i) => `<div class="standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span class="wins-count">${p.wins} wins</span></div>`).join('');
        }

        const matchesContainer = document.getElementById('matches-container');
        if (matchesContainer) {
            matchesContainer.innerHTML = this.matches.map((m,i) => {
                const isCompleted = m.winner !== undefined;
                const isCurrent = i === this.currentMatchIndex;
                const statusClass = isCompleted ? 'match-completed' : (isCurrent ? 'match-current' : 'match-pending');
                const statusText = isCompleted ? `Winner: ${this.escapeHtml(m.winner! )}` : (isCurrent ? 'NEXT' : 'Pending');
                return `<div class="match-item ${statusClass}"><p class="match-players">Match ${i+1}: ${this.escapeHtml(m.player1)} vs ${this.escapeHtml(m.player2)}</p><p class="match-status">${statusText}</p></div>`;
            }).join('');
        }

        const startBtn = document.getElementById('start-next-match-btn');
        const quitBtn = document.getElementById('quit-tournament-btn');
        if (startBtn) startBtn.onclick = () => this.launchPongGame(nextMatch);
        if (quitBtn) quitBtn.onclick = () => { if (confirm('Are you sure you want to quit the tournament?')) { const gm = (window as any).PONG; if (gm?.Nav) gm.Nav.showHome(); } };

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
        if (this.players.length === 0) return;
        let winner = this.players[0];
        for (const p of this.players) if (p.wins > winner.wins) winner = p;
        const winnerName = document.getElementById('winner-name');
        const winnerScore = document.getElementById('winner-score');
        const finalStandings = document.getElementById('final-standings-container');
        if (winnerName) winnerName.textContent = winner.name;
        if (winnerScore) winnerScore.textContent = `${winner.wins} victories`;
        if (finalStandings) finalStandings.innerHTML = this.players.sort((a,b) => b.wins - a.wins).map((p,i) => `<div class="final-standings-row"><span>${i+1}. ${this.escapeHtml(p.name)}</span><span>${p.wins} wins</span></div>`).join('');
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
        const container = document.getElementById('player-inputs-container');
        if (container)
            container.innerHTML = '';
        this.showSection('tournament-selection');
    }
}

if (!(window as any).PONG) (window as any).PONG = {};
(window as any).PONG.Tournament = new Tournament();

})();