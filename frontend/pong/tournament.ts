(function() {

interface TournamentPlayer {
    name: string;
    wins: number;
}

interface Match {
    player1: string;
    player2: string;
    winner?: string; //optional
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

    //appendChild attache un enfant au parent ici div
    //<div>
    //  <input>
    //  <input>
    //  ...
    //  <button>
    //</div>
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

        //inserer la div où il faut
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
            const name = input.value.trim(); //supprimer les espaces avant et après
            
            if (!name) {
                alert(`Please enter a name for Player ${i + 1}`);
                return;
            }
            playerNames.push(name);
        }

        //Vérifier les doublons (un set contient que des valeurs uniques)
        const uniqueNames = new Set(playerNames); 
        if (uniqueNames.size !== playerNames.length) {
            alert('All player names must be unique!');
            return;
        }

        this.players = playerNames.map(function(name){
            return { name: name, wins: 0 };
        });
        //map crée un nouveau tableau et applique la fonction à chaque élément

        this.generateMatches();
        this.playNextMatch();
    }

    //tout le monde joue contre tout le monde une fois
    private generateMatches(): void
    {
        this.matches = [];
        
        for (let i = 0; i < this.players.length; i++) {
            for (let j = i + 1; j < this.players.length; j++) {
                this.matches.push({
                    player1: this.players[i]!.name, //TODO !à vérifier car enleve verif
                    player2: this.players[j]!.name
                });
            }
        }
        console.log(`Generated ${this.matches.length} matches`);
    }

    private playNextMatch(): void
    {
        if (this.currentMatchIndex >= this.matches.length) {
            this.showWinner();
            return;
        }

        const match = this.matches[this.currentMatchIndex];
        if (!match) //TODO verif si necessaire
        {
            console.error('No match found for index', this.currentMatchIndex);
            return;
        }
        console.log(`Match ${this.currentMatchIndex + 1}: ${match.player1} vs ${match.player2}`);

        this.displayCurrentMatch(match);
        this.launchPongGame(match);
    }

    private displayCurrentMatch(match: Match): void
    {
        const tournamentView = document.getElementById('tournament-view');
        if (!tournamentView) return;

        const matchInfo = document.createElement('div');
        matchInfo.id = 'current-match-info';
        matchInfo.style.cssText = 'margin: 30px auto; padding: 20px; background: #00ff00; color: #000; text-align: center; border-radius: 10px; max-width: 500px;';
        matchInfo.innerHTML = `
            <h2>Match ${this.currentMatchIndex + 1} / ${this.matches.length}</h2>
            <p style="font-size: 1.5em; margin: 10px 0;">${match.player1} VS ${match.player2}</p>
            <p>Player 1: ${match.player1} (W/S)</p>
            <p>Player 2: ${match.player2} (↑/↓)</p>
        `;

        const oldInfo = document.getElementById('current-match-info');
        if (oldInfo)
            oldInfo.remove();
        tournamentView.appendChild(matchInfo);
    }

    private launchPongGame(match: Match): void
    {
        document.getElementById('tournament-view')!.style.display = 'none';
        document.getElementById('game-view')!.style.display = 'block';

        if ((window as any).PongGame) //TODO dans pong.ts aussi ? 
        {
            (window as any).PongGame.setPlayerNames(match.player1, match.player2);
            (window as any).PongGame.onGameEnd = (winner: string) => {this.onMatchEnd(match, winner);};
            (window as any).PongGame.start();
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

        //arrow function pour pouvoir utiliser this
        setTimeout(() => {this.playNextMatch();}, 2000);
    }

    private showWinner(): void
    {
        let winner = this.players[0]!; //TODO verif !
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
                <h1 style="color: #00ff00; font-size: 3em; text-shadow: 0 0 20px #00ff00;">🏆 WINNER 🏆</h1>
                <h2 style="color: #00ff00; font-size: 2em; margin: 30px 0;">${winner.name}</h2>
                <p style="color: #00ff00; font-size: 1.5em;">${winner.wins} victories</p>
                
                <h3 style="color: #00ff00; margin-top: 40px;">Final Standings:</h3>
                ${this.players
                    .sort((a, b) => b.wins - a.wins)
                    .map((p, i) => `
                        <p style="color: #00ff00; font-size: 1.2em;">
                            ${i + 1}. ${p.name} - ${p.wins} wins
                        </p>
                    `).join('')}
                
                <button onclick="showHome()" style="margin-top: 40px; padding: 15px 30px; font-size: 1.2em; background: #00ff00; border: none; border-radius: 10px; cursor: pointer;">
                    Back to Menu
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
    }
}

(window as any).Tournament = new Tournament();

})();