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
let player2Name: string = "AI";

// Helper function to get translated player names
function getPlayerName(key: string, fallback: string): string {
    if ((window as any).i18n && typeof (window as any).i18n.t === 'function') {
        return (window as any).i18n.t(key);
    }
    return fallback;
}

const WINNING_SCORE: number = 5;
let GameEndCallback: ((winner: string) => void) | null = null;
let isGameRunning: boolean = false;
let isPaused: boolean = false;
let predictedImpactY: number | null = null;
let animationFrameId: number | null = null;

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityY: number;
    lastDecisionTime?: number;
    targetY?: number;
}

let player1: Player = {
    x: 50,
    y: (boardHeight / 2) - (playerHeight / 2),
    width: playerWidth,
    height: playerHeight,
    velocityY: 0
};

let player2: Player = {
    x: boardWidth - playerWidth - 50,
    y: (boardHeight / 2) - (playerHeight / 2),
    width: playerWidth,
    height: playerHeight,
    velocityY: 0
};

interface Ball {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityX: number;
    velocityY: number;
}

let ball: Ball = {
    x: (boardWidth / 2) - (ballWidth / 2),
    y: (boardHeight / 2) - (ballHeight / 2),
    width: ballWidth,
    height: ballHeight,
    velocityX: 2,
    velocityY: 4
};

function switchPause(): void {
    if (!isGameRunning) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        showPauseMenu();
    } else {
        hidePauseMenu();
        update();
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
    document.addEventListener("keydown", playerMoves);
    document.addEventListener("keyup", PlayerStops);
    document.getElementById("resume-btn")?.addEventListener("click", switchPause);
    attachAIKeyListeners();
}

function removeEventListeners(): void {
    document.removeEventListener("keydown", playerMoves);
    document.removeEventListener("keyup", PlayerStops);
    detachAIKeyListeners();
}

// Handlers and helpers to simulate keyboard input for the AI (ArrowUp / ArrowDown)
function player2KeyDown(e: KeyboardEvent): void {
    if (e.code === "ArrowUp") {
        player2.velocityY = -3;
    } else if (e.code === "ArrowDown") {
        player2.velocityY = 3;
    }
}

function player2KeyUp(e: KeyboardEvent): void {
    if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        player2.velocityY = 0;
    }
}

function simulateKey(keyCode: "ArrowUp" | "ArrowDown", durationMs: number): void {
    const kd = new KeyboardEvent('keydown', { code: keyCode });
    const ku = new KeyboardEvent('keyup', { code: keyCode });
    document.dispatchEvent(kd);
    setTimeout(() => document.dispatchEvent(ku), durationMs);
}

// Attach AI key listeners along with existing listeners
function attachAIKeyListeners(): void {
    document.addEventListener('keydown', player2KeyDown);
    document.addEventListener('keyup', player2KeyUp);
}

function detachAIKeyListeners(): void {
    document.removeEventListener('keydown', player2KeyDown);
    document.removeEventListener('keyup', player2KeyUp);
}

function update(): void {
    if (!isGameRunning || isPaused)
        return;
    
    animationFrameId = requestAnimationFrame(update);
    context.clearRect(0, 0, board.width, board.height);
    context.fillStyle = "white";
    
    // Player 1 movement
    let nextPlayer1Y: number = player1.y + player1.velocityY;
    if (!outOfBounds(nextPlayer1Y, playerHeight))
        player1.y = nextPlayer1Y;
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
    
    // AI decision making (limited to 1Hz refresh rate)
    const currentTime = Date.now();
    if (!player2.lastDecisionTime) player2.lastDecisionTime = currentTime;
    
    if (currentTime - player2.lastDecisionTime >= 1000) {
        player2.lastDecisionTime = currentTime;
        
        // AI has a 1Hz 'vision' — predict impact and simulate human key presses
        if (ball.velocityX > 0 && ball.x > boardWidth / 3) {
            predictedImpactY = findImpact(ball, player2, board);
            // Decide direction based on predicted impact
            const centerPlayer2 = player2.y + player2.height / 2;
            const targetY = (predictedImpactY !== null ? predictedImpactY : boardHeight / 2);
            const diff = targetY - centerPlayer2;
            const absDiff = Math.abs(diff);
            if (absDiff >= 6) {
                const key: "ArrowUp" | "ArrowDown" = diff > 0 ? "ArrowDown" : "ArrowUp";
                // Estimate duration to hold key so paddle moves approx absDiff pixels
                const estimatedMs = Math.min(900, Math.max(120, Math.round((absDiff / 3) * 16)));
                // Add a small random jitter so AI isn't perfect every time
                const jitter = Math.round((Math.random() - 0.5) * 120);
                simulateKey(key, Math.max(80, estimatedMs + jitter));
            }
        } else {
            predictedImpactY = null;
            // Bring AI back to center occasionally
            const centerPlayer2 = player2.y + player2.height / 2;
            const diff = (boardHeight / 2) - centerPlayer2;
            const absDiff = Math.abs(diff);
            if (absDiff >= 10) {
                const key: "ArrowUp" | "ArrowDown" = diff > 0 ? "ArrowDown" : "ArrowUp";
                const estimatedMs = Math.min(700, Math.max(120, Math.round((absDiff / 3) * 16)));
                simulateKey(key, estimatedMs + Math.round((Math.random() - 0.5) * 200));
            }
        }
    }
    
    // Player 2 movement is driven by velocity set by (real or synthetic) keyboard events
    let nextPlayer2Y = player2.y + player2.velocityY;
    if (!outOfBounds(nextPlayer2Y, player2.height)) {
        player2.y = nextPlayer2Y;
    }
    
    if (player2.y < 0) player2.y = 0;
    if (player2.y + player2.height > boardHeight) 
        player2.y = boardHeight - player2.height;
    
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
    
    // Ball movement
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);
    
    // Ball collision with top/bottom walls
    if (outOfBounds(ball.y, ballHeight)) {
        ball.velocityY *= -1;
        predictedImpactY = null;
    }
    
    // Ball collision with player 1
    if (detectCollision(ball, player1)) {
        if (ball.x >= player1.x + playerWidth / 2) {
            ball.velocityX *= -1;
            ball.x = player1.x + player1.width;
            predictedImpactY = null;
        } else {
            ball.velocityY *= -1;
        }
    }
    // Ball collision with player 2 (AI)
    else if (detectCollision(ball, player2)) {
        if (ball.x + ball.width <= player2.x + playerWidth / 2) {
            ball.velocityX *= -1;
            ball.x = player2.x - ball.width;
        } else {
            ball.velocityY *= -1;
        }
    }
    
    // Scoring
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
    
    // Draw scores and player names
    const displayPlayer1Name = player1Name === "PLAYER 1" ? getPlayerName("player_1", "PLAYER 1") : player1Name;
    const displayPlayer2Name = getPlayerName("ai", "AI");
    
    context.font = "16px 'Press Start 2P', monospace";
    context.fillText(displayPlayer1Name, boardWidth/5 - 30, 35);
    context.fillText(displayPlayer2Name, boardWidth*4/5 - 75, 35);
    
    context.font = "32px 'Press Start 2P', monospace";
    context.fillText(player1Score.toString(), boardWidth/5, 75);
    context.fillText(player2Score.toString(), boardWidth*4/5 - 45, 75);
    
    // Draw center line
    for (let i = 10; i < board.height; i += 25)
        context.fillRect(board.width / 2 - 10, i, 5, 5);
}

function checkWinner(): void {
    if (player1Score >= WINNING_SCORE) {
        endGame(player1Name);
    } else if (player2Score >= WINNING_SCORE) {
        const aiName = getPlayerName("ai", "AI");
        endGame(aiName);
    }
}

function endGame(winner: string): void {
    isGameRunning = false;
    
    console.log(`Game Over! Winner: ${winner}`);
    
    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    context.fillRect(0, 0, boardWidth, boardHeight);
    
    const i18n = (window as any).i18n;
    const winnerText = i18n && typeof i18n.t === 'function' ? i18n.t('winner_announcement') : 'WINNER!';
    
    // Translate winner name if it's a default player name
    let displayWinnerName = winner;
    if (winner === "PLAYER 1") {
        displayWinnerName = getPlayerName("player_1", "PLAYER 1");
    } else if (winner === "AI") {
        displayWinnerName = getPlayerName("ai", "AI");
    }
    
    context.fillStyle = "#00ff00";
    context.font = "48px 'Press Start 2P', monospace";
    context.textAlign = "center";
    context.fillText(winnerText, boardWidth / 2, boardHeight / 2 - 30);
    context.fillText(displayWinnerName, boardWidth / 2, boardHeight / 2 + 30);
    context.textAlign = "left";
    
    if (GameEndCallback) {
        setTimeout(() => {
            GameEndCallback(winner);
        }, 2000);
    }
}

function outOfBounds(yPosition: number, Height: number): boolean {
    return (yPosition <= 0 || yPosition + Height >= boardHeight);
}

function playerMoves(e: KeyboardEvent): void {
    if (e.code == "Space") {
        e.preventDefault();
        switchPause();
        return;
    }
    if (e.code == "KeyW") {
        player1.velocityY = -3;
    }
    else if (e.code == "KeyS") {
        player1.velocityY = 3;
    }
}

function PlayerStops(e: KeyboardEvent): void {
    if (e.code == "KeyW" || e.code == "KeyS") {
        player1.velocityY = 0;
    }
}

function detectCollision(a: Ball | Player, b: Ball | Player): boolean {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}

function serve(direction: number): void {
    ball = {
        x: boardWidth/2,
        y: boardHeight/2,
        width: ballWidth,
        height: ballHeight,
        velocityX: direction * 2,
        velocityY: 4
    };
    predictedImpactY = null;
}

function findImpact(ball: Ball, player2: Player, board: HTMLCanvasElement): number {
    let ballX = ball.x;
    let ballY = ball.y;
    let ballVelocityX = ball.velocityX;
    let ballVelocityY = ball.velocityY;
    
    const initialDistance = player2.x - ball.x;
    
    // Simulate ball trajectory until it reaches AI paddle
    while(ballX < player2.x) {
        ballX += ballVelocityX;
        ballY += ballVelocityY;
        
        // Handle wall bounces
        if (ballY <= 0) {
            ballY = 0;
            ballVelocityY *= -1;
        }
        else if (ballY + ballHeight >= boardHeight) {
            ballY = boardHeight - ballHeight;
            ballVelocityY *= -1;
        }
    }
    
    // Add proximity-based error (less accurate when ball is far)
    const currentDistance = player2.x - ball.x;
    const proximityFactor = Math.max(0, currentDistance / initialDistance);
    
    const maxError = 110 * proximityFactor;
    let error = (Math.random() - 0.5) * maxError;
    
    let predictedY = ballY + ballHeight / 2 + error;
    
    return predictedY;
}

class PongGameAI {
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
        predictedImpactY = null;
        
        player1.y = (boardHeight / 2) - (playerHeight / 2);
        player2.y = (boardHeight / 2) - (playerHeight / 2);
        player1.velocityY = 0;
        player2.velocityY = 0;
        player2.lastDecisionTime = undefined;
        player2.targetY = undefined;
        
        serve(1);
        removeEventListeners();
        setupEventListeners();
        
        update();
    }
    
    setPlayerName(name: string): void {
        player1Name = name;
    }
    
    setCallback(callback: (winner: string) => void): void {
        GameEndCallback = callback;
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
(window as any).PONG.PongGameAI = new PongGameAI();
})();