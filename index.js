import init, { GameState, Player } from './pkg/game_of_ur.js';

let game = null;

async function run() {
    await init();
    game = new GameState();
    renderBoard();
    updateUI();
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('roll-btn').addEventListener('click', () => {
        if (!game || game.game_over) {
            return;
        }
        
        const diceValue = game.roll_dice();
        renderBoard();
        updateUI();
        
        // Check if there are valid moves
        const validMoves = game.get_valid_moves();
        if (validMoves.length === 0 && diceValue !== 0) {
            document.getElementById('status').textContent = 'No valid moves. Turn passes.';
            setTimeout(() => {
                game.pass_turn();
                renderBoard();
                updateUI();
            }, 1000);
        }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        if (!game) {
            return;
        }
        game.reset();
        renderBoard();
        updateUI();
    });
}

function renderBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    
    const currentPlayer = game.current_player;
    
    // Game of Ur board layout:
    // 1st Left Section: 4 squares wide × 3 squares long (indices 0-11)
    // Centre: 2 squares wide × 1 square long (indices 12-13)
    // 2nd Right Section: 2 squares wide × 3 squares long (indices 14-19)
    
    // Create main board container
    const mainBoard = document.createElement('div');
    mainBoard.className = 'main-board';
    
    // 1st Left Section: 4 columns × 3 rows (indices 0-11)
    const leftSection = document.createElement('div');
    leftSection.className = 'board-section left-section';
    for (let row = 0; row < 3; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        for (let col = 0; col < 4; col++) {
            const index = row * 4 + col; // 0-11
            const square = createSquare(index, currentPlayer);
            rowDiv.appendChild(square);
        }
        leftSection.appendChild(rowDiv);
    }
    mainBoard.appendChild(leftSection);
    
    // Centre: 2 columns × 1 row (indices 12-13)
    const centreSection = document.createElement('div');
    centreSection.className = 'board-section centre-section';
    const centreRow = document.createElement('div');
    centreRow.className = 'board-row';
    for (let i = 12; i < 14; i++) {
        const square = createSquare(i, currentPlayer);
        centreRow.appendChild(square);
    }
    centreSection.appendChild(centreRow);
    mainBoard.appendChild(centreSection);
    
    // 2nd Right Section: 2 columns × 3 rows (indices 14-19)
    const rightSection = document.createElement('div');
    rightSection.className = 'board-section right-section';
    for (let row = 0; row < 3; row++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        for (let col = 0; col < 2; col++) {
            const index = 14 + row * 2 + col; // 14-19
            const square = createSquare(index, currentPlayer);
            rowDiv.appendChild(square);
        }
        rightSection.appendChild(rowDiv);
    }
    mainBoard.appendChild(rightSection);
    
    board.appendChild(mainBoard);
    
    // Create container for start areas at bottom, centered
    const startAreasContainer = document.createElement('div');
    startAreasContainer.className = 'start-areas-container';
    
    // Light start area (left)
    const lightStartArea = document.createElement('div');
    lightStartArea.className = 'start-area light-start';
    lightStartArea.innerHTML = '<div class="start-label">Light Start</div>';
    const lightPiecesInStart = game.light_pieces_start;
    const validMoves = game.get_valid_moves();
    for (let i = 0; i < lightPiecesInStart; i++) {
        const piece = document.createElement('div');
        piece.className = 'start-piece light-piece';
        piece.textContent = '○';
        piece.dataset.pathPos = '0';
        if (validMoves.includes(0) && currentPlayer === Player.Light) {
            piece.className += ' valid-move';
        }
        piece.addEventListener('click', () => handleStartClick(0, Player.Light));
        lightStartArea.appendChild(piece);
    }
    startAreasContainer.appendChild(lightStartArea);
    
    // Dark start area (right)
    const darkStartArea = document.createElement('div');
    darkStartArea.className = 'start-area dark-start';
    darkStartArea.innerHTML = '<div class="start-label">Dark Start</div>';
    const darkPiecesInStart = game.dark_pieces_start;
    for (let i = 0; i < darkPiecesInStart; i++) {
        const piece = document.createElement('div');
        piece.className = 'start-piece dark-piece';
        piece.textContent = '●';
        piece.dataset.pathPos = '0';
        if (validMoves.includes(0) && currentPlayer === Player.Dark) {
            piece.className += ' valid-move';
        }
        piece.addEventListener('click', () => handleStartClick(0, Player.Dark));
        darkStartArea.appendChild(piece);
    }
    startAreasContainer.appendChild(darkStartArea);
    
    board.appendChild(startAreasContainer);
}

function createSquare(boardIndex, currentPlayer) {
    const square = document.createElement('div');
    square.className = 'square';
    square.dataset.index = boardIndex;
    
    // Get square info from Rust: [piece_type, is_valid_move]
    const squareInfo = game.get_square_info(boardIndex);
    const pieceType = squareInfo[0];
    const isValidMove = squareInfo[1];
    
    let content = '';
    
    // Determine piece type: 0=empty, 1=light, 2=dark
    switch (pieceType) {
        case 1: // LightPiece
            content = '○';
            square.className += ' light-piece';
            break;
        case 2: // DarkPiece
            content = '●';
            square.className += ' dark-piece';
            break;
        default:
            square.className += ' empty';
    }
    
    // Check if this square is a valid move (from Rust)
    if (isValidMove === 1) {
        square.className += ' valid-move';
    }
    
    square.textContent = content;
    
    // Add square number
    const number = document.createElement('span');
    number.className = 'square-number';
    number.textContent = boardIndex + 1;
    square.appendChild(number);
    
    square.addEventListener('click', () => handleSquareClick(boardIndex, currentPlayer));
    return square;
}


function handleStartClick(pathPos, player) {
    if (!game || game.game_over) {
        return;
    }
    
    if (game.current_player !== player) {
        return;
    }
    
    const diceValue = game.dice_value;
    if (diceValue === 0) {
        return;
    }
    
    const validMoves = game.get_valid_moves();
    if (!validMoves.includes(pathPos)) {
        return;
    }
    
    const success = game.make_move(pathPos);
    if (success) {
        renderBoard();
        updateUI();
    }
}

function handleSquareClick(boardIndex, player) {
    if (!game || game.game_over) {
        return;
    }
    
    if (game.current_player !== player) {
        return;
    }
    
    const diceValue = game.dice_value;
    if (diceValue === 0) {
        return;
    }
    
    const pathPos = game.board_index_to_path(boardIndex, player);
    if (pathPos === null || pathPos === undefined) {
        return;
    }
    
    const validMoves = game.get_valid_moves();
    if (!validMoves.includes(pathPos)) {
        return;
    }
    
    const success = game.make_move(pathPos);
    if (success) {
        renderBoard();
        updateUI();
    }
}

function updateUI() {
    const currentPlayer = game.current_player;
    const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';
    const playerNameEl = document.getElementById('player-name');
    playerNameEl.textContent = playerName;
    playerNameEl.className = currentPlayer === Player.Light ? '' : 'dark';
    
    const diceValue = game.dice_value;
    document.getElementById('dice-value').textContent = diceValue || '-';
    
    const rollBtn = document.getElementById('roll-btn');
    rollBtn.disabled = diceValue !== 0 || game.game_over;
    
    // Update piece counts
    document.getElementById('light-pieces-start').textContent = game.light_pieces_start;
    document.getElementById('dark-pieces-start').textContent = game.dark_pieces_start;
    
    // Calculate pieces off (7 - pieces on board - pieces in start)
    const lightOnBoard = countPiecesOnBoard(Player.Light);
    const darkOnBoard = countPiecesOnBoard(Player.Dark);
    const lightOff = 7 - game.light_pieces_start - lightOnBoard;
    const darkOff = 7 - game.dark_pieces_start - darkOnBoard;
    document.getElementById('light-pieces-off').textContent = lightOff;
    document.getElementById('dark-pieces-off').textContent = darkOff;
    
    const statusEl = document.getElementById('status');
    if (game.game_over) {
        const winner = game.winner;
        const winnerName = winner === Player.Light ? 'Light' : 'Dark';
        statusEl.textContent = `Game Over! ${winnerName} Player Wins!`;
        statusEl.style.color = '#ff6347';
    } else if (diceValue === 0) {
        statusEl.textContent = '';
        statusEl.style.color = '#667eea';
    } else {
        statusEl.textContent = 'Select a piece to move';
        statusEl.style.color = '#667eea';
    }
}

function countPiecesOnBoard(player) {
    return game.count_pieces_on_board(player);
}

run().catch(console.error);
