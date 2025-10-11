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

window.onload = function() {
    board = document.getElementById("board") as HTMLCanvasElement;
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d")!;

    context.fillStyle = "white";
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

    requestAnimationFrame(update);
    document.addEventListener("keydown", PlayerMoves);
    document.addEventListener("keyup", PlayerStops);
};

function update(): void {
    requestAnimationFrame(update);
    context.clearRect(0, 0, board.width, board.height);

    // Player 1
    context.fillStyle = "white";
    let nextPlayer1Y: number = player1.y + player1.velocityY;
    if (!outOfBounds(nextPlayer1Y, playerHeight))
        player1.y = nextPlayer1Y;
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);

    // Player 2 (IA) - Suit la balle
    if (ball.velocityX > 0)
    {
        let ballCenterY = ball.y + ball.height / 2;
        let player2CenterY = player2.y + player2.height / 2;

        if (Math.abs(ballCenterY - player2CenterY) > 3) {
            if (ballCenterY > player2CenterY) {
                player2.y += 3;
            } else {
                player2.y -= 3;
            }
        }
        
        if (player2.y < 0) player2.y = 0;
        if (player2.y + player2.height > boardHeight) 
            player2.y = boardHeight - player2.height;
    }
    
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

    if (outOfBounds(ball.y, ballHeight))
        ball.velocityY *= -1;

    if (detectCollision(ball, player1)) {
        ball.velocityX *= -1;
        ball.x = player1.x + player1.width;
    }
    else if (detectCollision(ball, player2)) {
        ball.velocityX *= -1;
        ball.x = player2.x - ball.width;
    }

    if (ball.x < 0) {
        player2Score++;
        resetGame(1);
    }
    else if (ball.x + ballWidth > boardWidth) {
        player1Score++;
        resetGame(-1);
    }

    context.font = "16px 'Press Start 2P', monospace";
    context.fillText("PLAYER 1", boardWidth/5 - 30, 35);
    context.fillText("AI", boardWidth*4/5 - 20, 35);
    context.font = "32px 'Press Start 2P', monospace";
    context.fillText(player1Score.toString(), boardWidth/5, 75);
    context.fillText(player2Score.toString(), boardWidth*4/5 - 45, 75);

    for (let i = 10; i < board.height; i += 25)
        context.fillRect(board.width / 2 - 10, i, 5, 5);
}

function outOfBounds(yPosition: number, Height: number): boolean {
    return (yPosition <= 0 || yPosition + Height >= boardHeight);
}

function PlayerMoves(e: KeyboardEvent): void {
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
}

})();