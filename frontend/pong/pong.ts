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

// x and y are the top left corner of the rectangle
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

// It moves by 1 pixel per frame on x axis and 2 pixels per frame on y axis
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
    velocityX: 1,
    velocityY: 2
};

let isGameRunning: boolean = false;

// function called after the html and css elements are loaded
window.onload = function() {
    board = document.getElementById("board") as HTMLCanvasElement; //name of the canvas element in .html
    if (!board)
        return;
    
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d")!;

    document.addEventListener("keydown", PlayerMoves); //when key is pressed, player moves
    document.addEventListener("keyup", PlayerStops); //when key is released, player stops moving
};

function update(): void {
    if (!isGameRunning)
        return;
    requestAnimationFrame(update);
    // clear the board for next frame
    context.clearRect(0, 0, board.width, board.height);

    // draw players and ball
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
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

    // if ball touches top or bottom of canvas
    if (outOfBounds(ball.y, ballHeight))
        ball.velocityY *= -1; //reverse direction

    // bounce the ball back
    if (detectCollision(ball, player1))
            ball.velocityX *= -1;
    else if (detectCollision(ball, player2))
            ball.velocityX *= -1;

    //game over
    if (ball.x < 0) {
        player2Score++;
        checkWinner();
        resetGame(1); //serves to the right
    }
    else if (ball.x + ballWidth > boardWidth) {
        player1Score++;
        checkWinner();
        resetGame(-1); //serves to the left
    }

    //score
    context.font = "16px 'Press Start 2P', monospace";
    context.fillText(player1Name, boardWidth/5 - 30, 35);
    context.fillText(player2Name, boardWidth*4/5 - 75, 35);
    context.font = "32px 'Press Start 2P', monospace";
    context.fillText(player1Score.toString(), boardWidth/5, 75);
    context.fillText(player2Score.toString(), boardWidth*4/5 - 45, 75);

    // draw dotted line down the middle
    for (let i = 10; i < board.height; i += 25)
        context.fillRect(board.width / 2 - 10, i, 5, 5); 
}

function checkWinner(): void
{
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
            onGameEndCallback!(winner);
        }, 2000);
    }
}

function outOfBounds(yPosition: number, Height: number): boolean {
    return (yPosition <= 0 || yPosition + Height >= boardHeight);
}

function PlayerMoves(e: KeyboardEvent): void {
    //player1
    if (e.code == "KeyW") {
        player1.velocityY = -3;
    }
    else if (e.code == "KeyS") {
        player1.velocityY = 3;
    }

    //player2
    if (e.code == "ArrowUp") {
        player2.velocityY = -3;
    }
    else if (e.code == "ArrowDown") {
        player2.velocityY = 3;
    }
}

function PlayerStops(e: KeyboardEvent): void {
    //player1
    if (e.code == "KeyW" || e.code == "KeyS") {
        player1.velocityY = 0;
    }
    //player2
    if (e.code == "ArrowUp" || e.code == "ArrowDown") {
        player2.velocityY = 0;
    }
}

function detectCollision(a: Ball | Player, b: Ball | Player): boolean { //a = ball, b = player
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
        velocityX: direction,
        velocityY: 2
    };
}

class PongGame {
    start(): void
    {
        player1Score = 0;
        player2Score = 0;
        isGameRunning = true;
        
        player1.y = (boardHeight / 2) - (playerHeight / 2);
        player2.y = (boardHeight / 2) - (playerHeight / 2);
        resetGame(1);
        
        update();
    }

    setPlayerNames(name1: string, name2: string): void {
        player1Name = name1;
        player2Name = name2;
    }

    onGameEnd(callback: (winner: string) => void): void {
        onGameEndCallback = callback;
    }

    pause(): void {
        isGameRunning = false;
    }

    resume(): void
    {
        if (!isGameRunning) {
            isGameRunning = true;
            update();
        }
    }
}

(window as any).PongGame = new PongGame();

})();