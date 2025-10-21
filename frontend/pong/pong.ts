(function() {

let board: HTMLCanvasElement;
let boardWidth: number = 800;
let boardHeight: number = 500;
let context: CanvasRenderingContext2D;

let playerWidth: number = 10;
let playerHeight: number = 60;

let ballWidth: number = 10;
let ballHeight: number = 10;

let player1Score: number = 0;
let player2Score: number = 0;

let player1Name: string = "PLAYER 1";
let player2Name: string = "PLAYER 2";

const WINNING_SCORE: number = 5;

let onGameEndCallback: ((winner: string) => void) | null = null;

let isGameRunning: boolean = false;
let isPaused: boolean = false;
let animationFrameId: number | null = null;

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityY: number;
}

let player1: Player;
let player2: Player;
let ball: Ball;

interface Ball {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityX: number;
    velocityY: number;
}

function initializeGameObjects(): void {
    player1 = {
        x: 50,
        y: (boardHeight / 2) - (playerHeight / 2),
        width: playerWidth,
        height: playerHeight,
        velocityY: 0
    };

    player2 = {
        x: boardWidth - playerWidth - 50,
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

function togglePause(): void {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        showPauseMenu();
    } else {
        hidePauseMenu();
    }
}

function showPauseMenu(): void {
    let pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.classList.add('active');
    }
}

function hidePauseMenu(): void {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.classList.remove('active');
    }
}

function setupEventListeners(): void {
    document.addEventListener("keydown", PlayerMoves);
    document.addEventListener("keyup", PlayerStops);
}

function removeEventListeners(): void {
    document.removeEventListener("keydown", PlayerMoves);
    document.removeEventListener("keyup", PlayerStops);
}

function update(): void {
    if (!isGameRunning)
        return;
    
    if (isPaused) {
        animationFrameId = requestAnimationFrame(update);
        return;
    }
    
    animationFrameId = requestAnimationFrame(update);
    context.clearRect(0, 0, board.width, board.height);

    context.fillStyle = "white";
    let nextPlayer1Y: number = player1.y + player1.velocityY;
    if (!outOfBounds(nextPlayer1Y, playerHeight))
        player1.y = nextPlayer1Y;
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

    let nextPlayer2Y: number = player2.y + player2.velocityY;
    if (!outOfBounds(nextPlayer2Y, playerHeight))
        player2.y = nextPlayer2Y;
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    if (outOfBounds(ball.y, ballHeight)) {
        ball.velocityY *= -1;
        if (ball.y <= 0) ball.y = 0;
        if (ball.y + ballHeight >= boardHeight) ball.y = boardHeight - ballHeight;
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
        resetGame(1);
    }
    else if (ball.x + ballWidth > boardWidth) {
        player1Score++;
        checkWinner();
        resetGame(-1);
    }

    context.font = "16px 'Press Start 2P', monospace";
    context.fillText(player1Name, boardWidth/5 - 30, 35);
    context.fillText(player2Name, boardWidth*4/5 - 75, 35);
    context.font = "32px 'Press Start 2P', monospace";
    context.fillText(player1Score.toString(), boardWidth/5, 75);
    context.fillText(player2Score.toString(), boardWidth*4/5 - 45, 75);

    for (let i = 10; i < board.height; i += 25)
        context.fillRect(board.width / 2 - 10, i, 5, 5);
}

function checkWinner(): void {
    if (player1Score >= WINNING_SCORE) {
        endGame(player1Name);
    } else if (player2Score >= WINNING_SCORE) {
        endGame(player2Name);
    }
}

function endGame(winner: string): void {
    isGameRunning = false;
    
    console.log(`Game Over! Winner: ${winner}`);
    
    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    context.fillRect(0, 0, boardWidth, boardHeight);
    
    context.fillStyle = "#00ff00";
    context.font = "48px 'Press Start 2P', monospace";
    context.textAlign = "center";
    context.fillText("WINNER!", boardWidth / 2, boardHeight / 2 - 30);
    context.fillText(winner, boardWidth / 2, boardHeight / 2 + 30);
    context.textAlign = "left";
    
    if (onGameEndCallback) {
        setTimeout(() => {
            onGameEndCallback(winner);
        }, 2000);
    }
}

function outOfBounds(yPosition: number, Height: number): boolean {
    return (yPosition <= 0 || yPosition + Height >= boardHeight);
}

function PlayerMoves(e: KeyboardEvent): void {
    if (e.code == "Space") {
        e.preventDefault();
        togglePause();
        return;
    }

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

function PlayerStops(e: KeyboardEvent): void {
    if (e.code == "KeyW" || e.code == "KeyS") {
        player1.velocityY = 0;
    }
    if (e.code == "ArrowUp" || e.code == "ArrowDown") {
        player2.velocityY = 0;
    }
}

function detectCollision(a: Ball | Player, b: Ball | Player): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function isCollidingHorizontally(ball: Ball, player: Player): boolean {
    const ballCenterX = ball.x + ball.width / 2;
    const ballCenterY = ball.y + ball.height / 2;
    const playerCenterY = player.y + player.height / 2;
    
    return Math.abs(ballCenterY - playerCenterY) < player.height / 2 + ball.height / 2;
}

function resetGame(direction: number): void {
    ball = {
        x: boardWidth/2,
        y: boardHeight/2,
        width: ballWidth,
        height: ballHeight,
        velocityX: direction * 2,
        velocityY: 4
    };
}

class PongGame {
    start(): void {
        board = document.getElementById("board") as HTMLCanvasElement;
        if (!board) {
            console.error("Canvas not found");
            return;
        }
        
        board.height = boardHeight;
        board.width = boardWidth;
        context = board.getContext("2d")!;

        player1Score = 0;
        player2Score = 0;
        isGameRunning = true;
        isPaused = false;
        
        initializeGameObjects();
        
        setupEventListeners();
        update();
    }

    setPlayerNames(name1: string, name2: string): void {
        player1Name = name1;
        player2Name = name2;
    }

    resetPlayerNames(): void {
        player1Name = "PLAYER 1";
        player2Name = "PLAYER 2";
    }

    onGameEnd(callback: (winner: string) => void): void {
        onGameEndCallback = callback;
    }

    stop(): void {
        isGameRunning = false;
        isPaused = false;
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        removeEventListeners();
    }
}

if (!(window as any).PONG) {
    (window as any).PONG = {};
}
(window as any).PONG.PongGame = new PongGame();

})();