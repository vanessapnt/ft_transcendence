(function() {

interface TournamentPlayer {
    name: string;
    wins: number;
}

interface Match {
    player1: string;
    player2: string;
    winner?: string;
}

class Tournament {
    private players: TournamentPlayer[] = [];
    private matches: Match[] = [];
    private currentMatchIndex: number = 0;

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
        const tournamentView = document.getElementById('tournament-view');
        if (!tournamentView)
            return;

        const inputsContainer = document.createElement('div');
        inputsContainer.id = 'player-inputs';
        inputsContainer.style.cssText = 'margin: 30px auto; max-width: 400px;';

        for (let i = 0; i < nbPlayers; i++) {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = `player-${i}`;
            input.placeholder = `Player ${i + 1} name`;
            input.style.cssText = 'display:block; width:100%; margin:10px 0; padding:10px; font-size:1em;';
            inputsContainer.appendChild(input);
        }

        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Tournament';
        startBtn.style.cssText = 'display:block; margin:20px auto; padding:15px 30px; font-size:1.2em; background:#00ff00; border:none; border-radius:10px; cursor:pointer;';
        startBtn.onclick = () => this.startTournament(nbPlayers);
        inputsContainer.appendChild(startBtn);

        const oldInputs = document.getElementById('player-inputs');
        if (oldInputs)
            oldInputs.remove();

        const h2 = tournamentView.querySelector('h2:last-of-type');
        if (h2 && h2.nextSibling) {
            tournamentView.insertBefore(inputsContainer, h2.nextSibling);
        } else {
            tournamentView.appendChild(inputsContainer);
        }
    }

    private startTournament(nbPlayers: number): void
    {
        const playerNames: string[] = [];
        for (let i = 0; i < nbPlayers; i++) {
            const input = document.getElementById(`player-${i}`) as HTMLInputElement;
            const name = input.value.trim();
            
            if (!name) {
                alert(`Please enter a name for Player ${i + 1}`);
                return;
            }
            playerNames.push(name);
        }

        const uniqueNames = new Set(playerNames); 
        if (uniqueNames.size !== playerNames.length) {
            alert('All player names must be unique!');
            return;
        }

        this.players = playerNames.map(function(name){
            return { name: name, wins: 0 };
        });

        this.generateMatches();
        this.showTournamentStatus();
    }

    private generateMatches(): void
    {
        this.matches = [];
        
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                this.matches.push({
                    player1: this.players[i].name,
                    player2: this.players[j].name
                });
            }
        }
        console.log(`Generated ${this.matches.length} matches`);
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private showTournamentStatus(): void
    {
        const tournamentView = document.getElementById('tournament-view');
        if (!tournamentView) return;

        if (this.currentMatchIndex >= this.matches.length) {
            this.showWinner();
            return;
        }

        const nextMatch = this.matches[this.currentMatchIndex];
        
        let resultsHtml = '<h3 style="color: #00ff00; margin: 20px 0;">Match Results:</h3>';
        resultsHtml += '<div style="max-width: 600px; margin: 0 auto; text-align: left;">';
        
        for (let i = 0; i < this.matches.length; i++) {
            const match = this.matches[i];
            const isCompleted = match.winner !== undefined;
            const isCurrent = i === this.currentMatchIndex;
            
            let statusColor = '#666';
            let statusText = 'Pending';
            
            if (isCompleted) {
                statusColor = '#00ff00';
                statusText = `Winner: ${this.escapeHtml(match.winner)}`;
            } else if (isCurrent) {
                statusColor = '#ffff00';
                statusText = 'NEXT';
            }
            
            resultsHtml += `
                <div style="background: ${isCurrent ? '#333' : '#111'}; padding: 15px; margin: 10px 0; border-radius: 8px; border: 2px solid ${statusColor};">
                    <p style="color: #00ff00; font-size: 1em; margin: 5px 0;">
                        Match ${i + 1}: ${this.escapeHtml(match.player1)} vs ${this.escapeHtml(match.player2)}
                    </p>
                    <p style="color: ${statusColor}; font-size: 0.9em; margin: 5px 0;">
                        ${statusText}
                    </p>
                </div>
            `;
        }
        resultsHtml += '</div>';

        const sortedPlayers = [...this.players].sort((a, b) => b.wins - a.wins);
        let standingsHtml = '<h3 style="color: #00ff00; margin: 30px 0 20px;">Current Standings:</h3>';
        standingsHtml += '<div style="max-width: 400px; margin: 0 auto;">';
        sortedPlayers.forEach((player, index) => {
            standingsHtml += `
                <div style="background: #111; padding: 10px; margin: 5px 0; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #00ff00; font-size: 1em;">${index + 1}. ${this.escapeHtml(player.name)}</span>
                    <span style="color: #00ff00; font-size: 1.2em; font-weight: bold;">${player.wins} wins</span>
                </div>
            `;
        });
        standingsHtml += '</div>';

        const nextMatchHtml = `
            <div style="background: #00ff00; color: #000; padding: 30px; margin: 30px auto; border-radius: 15px; max-width: 600px;">
                <h2 style="margin: 0 0 20px;">NEXT MATCH (${this.currentMatchIndex + 1}/${this.matches.length})</h2>
                <p style="font-size: 2em; margin: 10px 0; font-weight: bold;">
                    ${this.escapeHtml(nextMatch.player1)} <span style="color: #ff0000;">VS</span> ${this.escapeHtml(nextMatch.player2)}
                </p>
                <p style="margin-top: 20px; font-size: 0.9em;">
                    ${this.escapeHtml(nextMatch.player1)}: W/S keys | ${this.escapeHtml(nextMatch.player2)}: ↑/↓ keys
                </p>
            </div>
        `;

        tournamentView.innerHTML = `
            <div style="padding: 40px 20px; text-align: center;">
                <h1 style="color: #00ff00; margin-bottom: 30px;">TOURNAMENT STATUS</h1>
                
                ${nextMatchHtml}
                
                <div style="margin: 30px 0;">
                    <button id="start-next-match-btn" style="font-family: 'Press Start 2P', cursive; padding: 20px 40px; font-size: 1.3em; background: #00ff00; color: #000; border: none; border-radius: 10px; cursor: pointer; margin: 10px;">
                        START MATCH
                    </button>
                    <button id="quit-tournament-btn" style="font-family: 'Press Start 2P', cursive; padding: 20px 40px; font-size: 1.3em; background: #ff4444; color: white; border: none; border-radius: 10px; cursor: pointer; margin: 10px;">
                        QUIT TOURNAMENT
                    </button>
                </div>

                ${standingsHtml}
                
                ${resultsHtml}
            </div>
        `;

        document.getElementById('start-next-match-btn')!.onclick = () => {
            this.launchPongGame(nextMatch);
        };

        document.getElementById('quit-tournament-btn')!.onclick = () => {
            if (confirm('Are you sure you want to quit the tournament?')) {
                showHome();
            }
        };
    }

    private launchPongGame(match: Match): void
    {
        console.log('Launching pong game for match:', match);
        
        document.getElementById('tournament-view')!.style.display = 'none';
        document.getElementById('game-view')!.style.display = 'block';

        if ((window as any).PongGame)
        {
            (window as any).PongGame.setPlayerNames(match.player1, match.player2);
            
            (window as any).PongGame.onGameEnd((winner: string) => {
                console.log('Match callback triggered, winner:', winner);
                this.onMatchEnd(match, winner);
            });
            
            (window as any).PongGame.start();
        } else {
            console.error('PongGame not found on window object');
        }
    }

    private onMatchEnd(match: Match, winner: string): void
    {
        console.log(`Match ended. Winner: ${winner}`);

        match.winner = winner;
        
        const winnerPlayer = this.players.find(p => p.name === winner);
        if (winnerPlayer)
            winnerPlayer.wins++;

        this.currentMatchIndex++;

        document.getElementById('game-view')!.style.display = 'none';
        document.getElementById('tournament-view')!.style.display = 'block';

        console.log(`Moving to match ${this.currentMatchIndex + 1} of ${this.matches.length}`);

        setTimeout(() => {
            this.showTournamentStatus();
        }, 500);
    }

    private showWinner(): void
    {
        let winner = this.players[0];
        for (const player of this.players) {
            if (player.wins > winner.wins) {
                winner = player;
            }
        }

        console.log(`Tournament winner: ${winner.name} with ${winner.wins} wins`);

        const tournamentView = document.getElementById('tournament-view');
        if (!tournamentView)
            return;

        tournamentView.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h1 style="color: #00ff00; font-size: 3em; text-shadow: 0 0 20px #00ff00;">🏆 TOURNAMENT COMPLETE 🏆</h1>
                <h2 style="color: #00ff00; font-size: 2.5em; margin: 30px 0;">WINNER: ${this.escapeHtml(winner.name)}</h2>
                <p style="color: #00ff00; font-size: 1.5em;">${winner.wins} victories</p>
                
                <h3 style="color: #00ff00; margin-top: 40px;">Final Standings:</h3>
                <div style="max-width: 500px; margin: 20px auto;">
                ${this.players
                    .sort((a, b) => b.wins - a.wins)
                    .map((p, i) => `
                        <div style="background: #111; padding: 15px; margin: 10px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #00ff00; font-size: 1.3em;">${i + 1}. ${this.escapeHtml(p.name)}</span>
                            <span style="color: #00ff00; font-size: 1.5em; font-weight: bold;">${p.wins} wins</span>
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="showHome()" style="font-family: 'Press Start 2P', cursive; margin-top: 40px; padding: 20px 40px; font-size: 1.2em; background: #00ff00; color: #000; border: none; border-radius: 10px; cursor: pointer;">
                    BACK TO MENU
                </button>
            </div>
        `;

        (window as any).tournamentWinner = winner;
    }

    reset(): void
    {
        this.players = [];
        this.matches = [];
        this.currentMatchIndex = 0;
        
        const tournamentView = document.getElementById('tournament-view');
        if (tournamentView) {
            tournamentView.innerHTML = `
                <h2 style="color: #00ff00; text-align: center; margin-top: 40px;">Select Number of Players</h2>
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">
                    <button onclick="Tournament.createTournament(2)">2 Players</button>
                    <button onclick="Tournament.createTournament(4)">4 Players</button>
                    <button onclick="Tournament.createTournament(8)">8 Players</button>
                </div>
                <button class="menu-button" onclick="showHome()" style="display:block; margin:40px auto;">BACK TO MENU</button>
            `;
        }
    }
}

(window as any).Tournament = new Tournament();

})();