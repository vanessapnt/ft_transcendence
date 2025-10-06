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

// x and y are the top left corner of the rectangle
let player1 = {
    x: 50,
    y: (boardHeight / 2) - (playerHeight / 2),
    width: playerWidth,
    height: playerHeight,
    velocityY : 0
}

let player2 = {
    x : boardWidth - playerWidth - 50,
    y : (boardHeight / 2) - (playerHeight / 2),
    width: playerWidth,
    height: playerHeight,
    velocityY : 0
}

// It moves by 1 pixel per frame on x axis and 2 pixels per frame on y axis
let ball = {
    x : (boardWidth / 2) - (ballWidth / 2),
    y : (boardHeight / 2) - (ballHeight / 2),
    width: ballWidth,
    height: ballHeight,
    velocityX : 1,
    velocityY : 2
}

// function called after the html and css elements are loaded
window.onload = function() {
    board = document.getElementById("board"); //name of the canvas element in .html
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    context.fillStyle="white";
    context.fillRect(player1.x, player1.y, playerWidth, playerHeight);
    context.fillRect(player2.x, player2.y, playerWidth, playerHeight);
    context.fillRect(ball.x, ball.y, ballWidth, ballHeight);

    requestAnimationFrame(update); //calls update function before the next frame is rendered
    document.addEventListener("keydown", PlayerMoves); //when key is pressed, player moves
    document.addEventListener("keyup", PlayerStops); //when key is released, player stops moving
}

function update() {
    requestAnimationFrame(update);
    // clear the board for next frame
    context.clearRect(0, 0, board.width, board.height);

    // draw players and ball
    context.fillStyle = "white";
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
        resetGame(1); //serves to the right
    }
    else if (ball.x + ballWidth > boardWidth) {
        player1Score++;
        resetGame(-1); //serves to the left
    }

    //score
    context.font = "16px 'Press Start 2P', monospace";
    context.fillText("PLAYER 1", boardWidth/5 - 30, 35);
    context.fillText("PLAYER 2", boardWidth*4/5 - 75, 35);
    context.font = "32px 'Press Start 2P', monospace";
    context.fillText(player1Score, boardWidth/5, 75);
    context.fillText(player2Score, boardWidth*4/5 - 45, 75);

    // draw dotted line down the middle
    for (let i = 10; i < board.height; i += 25)
        context.fillRect(board.width / 2 - 10, i, 5, 5); 
}

function outOfBounds(yPosition, Height) {
    return (yPosition <= 0 || yPosition + Height >= boardHeight);
}

function PlayerMoves(e) {
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

function PlayerStops(e) {
    //player1
    if (e.code == "KeyW" || e.code == "KeyS") {
        player1.velocityY = 0;
    }
    //player2
    if (e.code == "ArrowUp" || e.code == "ArrowDown") {
        player2.velocityY = 0;
    }
}

function detectCollision(a, b) { //a = ball, b = player
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

function resetGame(direction) {
    ball = {
        x : boardWidth/2,
        y : boardHeight/2,
        width: ballWidth,
        height: ballHeight,
        velocityX : direction,
        velocityY : 2
    }
}