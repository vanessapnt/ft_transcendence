(function () {
    let board;
    let boardWidth = 800;
    let boardHeight = 500;
    let context;
    let playerWidth = 10;
    let playerHeight = 60;
    let ballWidth = 10;
    let ballHeight = 10;
    let player1Score = 0;
    let player2Score = 0;
    let player1Name = "PLAYER 1";
    let player2Name = "PLAYER 2";
    // Helper function to get translated player names
    function getPlayerName(key, fallback) {
        if (window.i18n && typeof window.i18n.t === 'function') {
            return window.i18n.t(key);
        }
        return fallback;
    }
    const WINNING_SCORE = 1;
    let GameEndCallback = null; // par defaut null mais on peut lui assigner callback(Tournament.onMatchEnd)
    let isGameRunning = false;
    let isPaused = false;
    let animationFrameId = null;
    let isInvitedGame = false; // Désactiver la pause pour les jeux invités
    let player1;
    let player2;
    let ball;
    function initializeGameObjects() {
        player1 = {
            x: 50,
            y: (boardHeight / 2) - (playerHeight / 2),
            width: playerWidth,
            height: playerHeight,
            velocityY: 0 // uniquement changé par playerMoves()
        };
        player2 = {
            x: boardWidth - 50 - playerWidth,
            y: (boardHeight / 2) - (playerHeight / 2),
            width: playerWidth,
            height: playerHeight,
            velocityY: 0
        };
        ball = {
            x: (boardWidth / 2) - (ballWidth / 2),
            y: (boardHeight / 2) - (ballHeight / 2),
            width: ballWidth,
            height: ballHeight,
            velocityX: 2,
            velocityY: 4
        };
    }
    function switchPause() {
        if (!isGameRunning || isInvitedGame)
            return;
        isPaused = !isPaused;
        if (isPaused)
            showPauseMenu();
        else
            hidePauseMenu();
    }
    function showPauseMenu() {
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.style.display = ''; // Remove inline display style if any
            pauseOverlay.classList.add('active');
        }
    }
    function hidePauseMenu() {
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('active');
        }
    }
    function setupEventListeners() {
        var _a;
        document.addEventListener("keydown", playerMoves);
        document.addEventListener("keyup", PlayerStops);
        (_a = document.getElementById("resume-btn")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", switchPause);
    }
    function removeEventListeners() {
        document.removeEventListener("keydown", playerMoves);
        document.removeEventListener("keyup", PlayerStops);
    }
    function update() {
        if (!isGameRunning)
            return;
        if (isPaused) {
            animationFrameId = requestAnimationFrame(update);
            return;
        }
        animationFrameId = requestAnimationFrame(update); //demande au navigateur d’appeler update() avant le prochain rafraîchissement d’écran pour créer une boucle de jeu
        context.clearRect(0, 0, board.width, board.height);
        context.fillStyle = "white";
        // avant de dessiner les joueurs, on met à jour leur position (pas en dehors du terrain)
        let nextPlayer1Y = player1.y + player1.velocityY;
        if (!outOfBounds(nextPlayer1Y, playerHeight))
            player1.y = nextPlayer1Y;
        context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
        let nextPlayer2Y = player2.y + player2.velocityY;
        if (!outOfBounds(nextPlayer2Y, playerHeight))
            player2.y = nextPlayer2Y;
        context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
        ball.x += ball.velocityX;
        ball.y += ball.velocityY;
        // avant de dessiner la balle, on verifie collisions avec bords(sup/inf) et joueurs
        if (outOfBounds(ball.y, ballHeight)) {
            ball.velocityY *= -1;
            if (ball.y <= 0)
                ball.y = 0;
            if (ball.y + ballHeight >= boardHeight)
                ball.y = boardHeight - ballHeight;
        }
        if (ball.x < boardWidth / 2 && detectCollision(ball, player1)) {
            ball.velocityX = Math.abs(ball.velocityX);
            ball.x = player1.x + player1.width;
        }
        if (ball.x > boardWidth / 2 && detectCollision(ball, player2)) {
            ball.velocityX = -Math.abs(ball.velocityX);
            ball.x = player2.x - ball.width;
        }
        context.fillRect(ball.x, ball.y, ballWidth, ballHeight);
        if (ball.x < 0) {
            player2Score++;
            checkWinner();
            serve(1);
        }
        else if (ball.x + ballWidth > boardWidth) {
            player1Score++;
            checkWinner();
            serve(-1);
        }
        // Use translated player names or custom names
        const displayPlayer1Name = player1Name === "PLAYER 1" ? getPlayerName("player_1", "PLAYER 1") : player1Name;
        const displayPlayer2Name = player2Name === "PLAYER 2" ? getPlayerName("player_2", "PLAYER 2") : player2Name;
        context.font = "16px 'Press Start 2P', monospace";
        context.fillText(displayPlayer1Name, boardWidth / 5 - 30, 35);
        context.fillText(displayPlayer2Name, boardWidth * 4 / 5 - 75, 35);
        context.font = "32px 'Press Start 2P', monospace";
        context.fillText(player1Score.toString(), boardWidth / 5, 75);
        context.fillText(player2Score.toString(), boardWidth * 4 / 5 - 45, 75);
        for (let i = 10; i < board.height; i += 25)
            context.fillRect(board.width / 2 - 10, i, 5, 5);
    }
    function checkWinner() {
        if (player1Score >= WINNING_SCORE)
            endGame(player1Name);
        else if (player2Score >= WINNING_SCORE)
            endGame(player2Name);
    }
    function endGame(winner) {
        isGameRunning = false;
        console.log(`Game Over! Winner: ${winner}`);
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(0, 0, boardWidth, boardHeight);
        const i18n = window.i18n;
        const winnerText = i18n && typeof i18n.t === 'function' ? i18n.t('winner_announcement') : 'WINNER!';
        // Translate winner name if it's a default player name
        let displayWinnerName = winner;
        if (winner === "PLAYER 1") {
            displayWinnerName = getPlayerName("player_1", "PLAYER 1");
        }
        else if (winner === "PLAYER 2") {
            displayWinnerName = getPlayerName("player_2", "PLAYER 2");
        }
        context.fillStyle = "#00ff00";
        context.font = "48px 'Press Start 2P', monospace";
        context.textAlign = "center";
        context.fillText(winnerText, boardWidth / 2, boardHeight / 2 - 30);
        context.fillText(displayWinnerName, boardWidth / 2, boardHeight / 2 + 30);
        context.textAlign = "left";
        if (GameEndCallback) {
            setTimeout(() => {
                GameEndCallback(winner); //TODO ! à verifier
            }, 2000);
        }
    }
    function outOfBounds(yPosition, Height) {
        return (yPosition <= 0 || yPosition + Height >= boardHeight);
    }
    function playerMoves(e) {
        if (e.code == "Space") {
            switchPause();
            return;
        }
        // quand la touche est enfoncée, velocityY reste à 3 ou -3 alors que update() est appelé en boucle via requestAnimationFrame
        if (e.code == "KeyW") {
            player1.velocityY = -3;
        }
        else if (e.code == "KeyS") {
            player1.velocityY = 3;
        }
        if (e.code == "ArrowUp") {
            player2.velocityY = -3;
        }
        else if (e.code == "ArrowDown") {
            player2.velocityY = 3;
        }
    }
    function PlayerStops(e) {
        if (e.code == "KeyW" || e.code == "KeyS") {
            player1.velocityY = 0;
        }
        if (e.code == "ArrowUp" || e.code == "ArrowDown") {
            player2.velocityY = 0;
        }
    }
    function detectCollision(a, b) {
        return a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y;
    }
    function serve(direction) {
        ball = {
            x: boardWidth / 2,
            y: boardHeight / 2,
            width: ballWidth,
            height: ballHeight,
            velocityX: direction * 2,
            velocityY: 4
        };
    }
    class PongGame {
        start(invitedGame = false) {
            board = document.getElementById("board");
            if (!board) {
                console.error("Canvas not found");
                return;
            }
            board.height = boardHeight;
            board.width = boardWidth;
            context = board.getContext("2d");
            player1Score = 0;
            player2Score = 0;
            isGameRunning = true;
            isPaused = false;
            isInvitedGame = invitedGame;
            initializeGameObjects();
            setupEventListeners();
            update();
        }
        setPlayerNames(name1, name2) {
            player1Name = name1;
            player2Name = name2;
        }
        resetPlayerNames() {
            player1Name = "PLAYER 1";
            player2Name = "PLAYER 2";
        }
        setCallback(callback) {
            GameEndCallback = callback;
        }
        stop() {
            isGameRunning = false;
            isPaused = false;
            isInvitedGame = false;
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId); // annule la requête d'animation planifiée correspondant à cet identifiant pour empêcher l'exécution de la fonction update et donc stopper la boucle de jeu
                animationFrameId = null;
            }
            removeEventListeners();
        }
    }
    if (!window.PONG) {
        window.PONG = {};
    }
    window.PONG.PongGame = new PongGame();
})();
//# sourceMappingURL=pong.js.map