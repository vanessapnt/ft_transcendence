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
    velocityX: 1,
    velocityY: 2
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

    // Player 2 (IA) - utilise la logique des triangles semblables
    if (ball.velocityX > 0) {
        let impactY: number = findImpact(ball, player2, board);
        player2.y = impactY - player2.height / 2;
        
        // Limiter player2 dans les bornes
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
        velocityX: direction,
        velocityY: 2
    };
}

// Votre logique des triangles semblables - CORRIGÉE
function findImpact(ball: Ball, player2: Player, board: HTMLCanvasElement): number {
    let x = ball.x;
    let y = ball.y;
    let velocityX = ball.velocityX;
    let velocityY = ball.velocityY;
    
    // Protection contre velocityY trop petit
    if (Math.abs(velocityY) < 0.1) {
        return y;
    }
    
    const targetX = player2.x; // On vise player2, pas le bord du board
    let iterations = 0;
    
    // Boucle jusqu'à atteindre player2.x
    while (x < targetX && iterations < 50) {
        iterations++;
        
        // AB = distance verticale jusqu'au bord (haut ou bas)
        // BC = velocityX (distance horizontale par frame)
        // AD = distance verticale jusqu'au prochain rebond
        // DE = distance horizontale jusqu'au prochain rebond
        
        const AB = Math.abs(velocityY);
        const BC = Math.abs(velocityX);
        
        let AD: number;
        if (velocityY > 0) {
            // Va vers le bas
            AD = board.height - y;
        } else {
            // Va vers le haut
            AD = y;
        }
        
        // Triangles semblables : AB/AD = BC/DE
        // Donc : DE = BC * (AD / AB)
        const DE = BC * (AD / AB);
        
        // Si on dépasse player2.x avant le rebond
        if (x + DE >= targetX) {
            // On calcule où sera la balle exactement à targetX
            // EP = distance restante horizontalement
            const EP = targetX - x;
            // PO/EP = AD/DE  donc  PO = EP * (AD / DE)
            const PO = EP * (AD / DE);
            
            // Calculer la position finale Y
            if (velocityY > 0) {
                y = y + PO;
            } else {
                y = y - PO;
            }
            
            return y;
        }
        
        // Sinon on rebondit
        x = x + DE;
        
        // Après le rebond, y est au bord
        if (velocityY > 0) {
            y = board.height;
        } else {
            y = 0;
        }
        
        // Inverser la direction verticale
        velocityY *= -1;
    }
    
    // Fallback si problème
    return board.height / 2;
}

})();