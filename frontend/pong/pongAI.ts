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

const WINNING_SCORE: number = 5;

let onGameEndCallback: ((winner: string) => void) | null = null;

let isGameRunning: boolean = false;
let isPaused: boolean = false;

let predictedImpactY: number | null = null;

interface Player {
    x: number;
    y: number;
    width: number;
    height: number;
    velocityY: number;
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

function togglePause(): void {
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
    if (!pauseOverlay) {
        pauseOverlay = document.createElement('div');
        pauseOverlay.id = 'pause-overlay';
        pauseOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        pauseOverlay.innerHTML = `
            <h1 style="color: #00ff00; font-family: 'Press Start 2P', cursive; font-size: 3em; margin-bottom: 50px; text-shadow: 0 0 20px #00ff00;">PAUSED</h1>
            <button id="resume-btn" style="font-family: 'Press Start 2P', cursive; font-size: 1.2em; padding: 20px 40px; margin: 15px; background: #00ff00; color: #000; border: none; border-radius: 10px; cursor: pointer; min-width: 250px;">
                RESUME
            </button>
            <button id="menu-btn" style="font-family: 'Press Start 2P', cursive; font-size: 1.2em; padding: 20px 40px; margin: 15px; background: #ff4444; color: white; border: none; border-radius: 10px; cursor: pointer; min-width: 250px;">
                MENU
            </button>
        `;
        
        document.body.appendChild(pauseOverlay);
        
        document.getElementById('resume-btn')!.onclick = () => {
            togglePause();
        };
        
        document.getElementById('menu-btn')!.onclick = () => {
            if (confirm('Are you sure you want to quit to menu? Progress will be lost.')) {
                hidePauseMenu();
                isGameRunning = false;
                isPaused = false;
                (window as any).showHome();
            }
        };
    }
    
    pauseOverlay.style.display = 'flex';
}

function hidePauseMenu(): void {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.style.display = 'none';
    }
}

function update(): void {
    if (!isGameRunning || isPaused)
        return;
    requestAnimationFrame(update);
    
    context.clearRect(0, 0, board.width, board.height);

    context.fillStyle = "white";
    let nextPlayer1Y: number = player1.y + player1.velocityY;
    if (!outOfBounds(nextPlayer1Y, playerHeight))
        player1.y = nextPlayer1Y;
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

    if (ball.velocityX > 0) {
        if (ball.x > boardWidth / 3) {
            if (predictedImpactY === null)
                predictedImpactY = findImpact(ball, player2, board);
            
            let centerPlayer2 = player2.y + player2.height / 2;
            if (Math.abs(predictedImpactY - centerPlayer2) > 3) {
                if (predictedImpactY > centerPlayer2) {
                    player2.y += 3;
                } else {
                    player2.y -= 3;
                }
            }
        }
    } else {
        predictedImpactY = null;

        let centerY = (boardHeight / 2) - (playerHeight / 2);
        
        if (Math.abs(centerY - player2.y) > 3) {
            if (centerY > player2.y) {
                player2.y += 2;
            } else {
                player2.y -= 2;
            }
        }
    }
    
    if (player2.y < 0) player2.y = 0;
    if (player2.y + player2.height > boardHeight) 
        player2.y = boardHeight - player2.height;
    
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

    if (outOfBounds(ball.y, ballHeight)) {
        ball.velocityY *= -1;
        predictedImpactY = null;
    }

    if (detectCollision(ball, player1)) {
        if (ball.x >= player1.x + playerWidth / 2) {
            ball.velocityX *= -1;
            ball.x = player1.x + player1.width;
            predictedImpactY = null;
        } else {
            ball.velocityY *= -1;
        }
    }
    else if (detectCollision(ball, player2)) {
        if (ball.x + ball.width <= player2.x + playerWidth / 2) {
            ball.velocityX *= -1;
            ball.x = player2.x - ball.width;
        } else {
            ball.velocityY *= -1;
        }
    }

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
    context.fillText("AI", boardWidth*4/5 - 20, 35);
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
        endGame("AI");
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

function resetGame(direction: number): void {
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
    
    while(ballX < player2.x) {
        ballX += ballVelocityX;
        ballY += ballVelocityY;
        if (ballY <= 0) {
            ballY = 0;
            ballVelocityY *= -1;
        }
        else if (ballY + ballHeight >= boardHeight) {
            ballY = boardHeight - ballHeight;
            ballVelocityY *= -1;
        }
    }

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
        if (!board) return;
        
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
        
        resetGame(1);

        document.removeEventListener("keydown", PlayerMoves);
        document.removeEventListener("keyup", PlayerStops);
        document.addEventListener("keydown", PlayerMoves);
        document.addEventListener("keyup", PlayerStops);
        
        update();
    }

    onGameEnd(callback: (winner: string) => void): void {
        onGameEndCallback = callback;
    }
}

(window as any).PongGameAI = new PongGameAI();

})();