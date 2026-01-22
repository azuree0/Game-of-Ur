import init, { GameState, Player } from './pkg/game_of_ur.js';

let game = null;

async function loadGame() {
    await init();
    game = new GameState();
    updateUI();
}

function updateUI() {
    if (!game) return;
    
    const playerNameEl = document.getElementById('player-name');
    const diceDisplayEl = document.getElementById('dice-display');
    const statusEl = document.getElementById('status');
    const lightStartEl = document.getElementById('light-pieces-start');
    const darkStartEl = document.getElementById('dark-pieces-start');
    const lightOffEl = document.getElementById('light-pieces-off');
    const darkOffEl = document.getElementById('dark-pieces-off');
    const rollButtonEl = document.getElementById('roll-dice');
    
    if (playerNameEl) {
        playerNameEl.textContent = game.get_player_name();
        playerNameEl.className = game.current_player === Player.Dark ? 'dark' : '';
    }
    
    if (diceDisplayEl) {
        diceDisplayEl.textContent = game.dice_value || '-';
    }
    
    if (statusEl) {
        statusEl.textContent = game.get_status_message();
        statusEl.style.color = game.game_over ? '#ff6347' : '#667eea';
    }
    
    if (lightStartEl) lightStartEl.textContent = game.light_pieces_start;
    if (darkStartEl) darkStartEl.textContent = game.dark_pieces_start;
    if (lightOffEl) lightOffEl.textContent = game.light_pieces_off;
    if (darkOffEl) darkOffEl.textContent = game.dark_pieces_off;
    
    if (rollButtonEl) {
        rollButtonEl.disabled = game.dice_value !== 0 || game.game_over;
    }
    
    renderBoard();
}

function renderBoard() {
    const boardContainer = document.getElementById('board');
    if (!boardContainer || !game) return;
    
    boardContainer.innerHTML = '';
    
    const mainBoard = document.createElement('div');
    mainBoard.className = 'main-board';
    
    const leftSection = document.createElement('div');
    leftSection.className = 'board-section left-section';
    for (let row = 0; row < 3; row++) {
        const boardRow = document.createElement('div');
        boardRow.className = 'board-row';
        for (let col = 0; col < 4; col++) {
            boardRow.appendChild(createSquare(row * 4 + col));
        }
        leftSection.appendChild(boardRow);
    }
    
    const centreSection = document.createElement('div');
    centreSection.className = 'board-section centre-section';
    const centreRow = document.createElement('div');
    centreRow.className = 'board-row';
    centreRow.appendChild(createSquare(12));
    centreRow.appendChild(createSquare(13));
    centreSection.appendChild(centreRow);
    
    const rightSection = document.createElement('div');
    rightSection.className = 'board-section right-section';
    for (let row = 0; row < 3; row++) {
        const boardRow = document.createElement('div');
        boardRow.className = 'board-row';
        for (let col = 0; col < 2; col++) {
            boardRow.appendChild(createSquare(14 + row * 2 + col));
        }
        rightSection.appendChild(boardRow);
    }
    
    mainBoard.appendChild(leftSection);
    mainBoard.appendChild(centreSection);
    mainBoard.appendChild(rightSection);
    
    const startAreasContainer = document.createElement('div');
    startAreasContainer.className = 'start-areas-container';
    
    const validMoves = game.get_valid_moves();
    const currentPlayer = game.current_player;
    
    const lightStartArea = document.createElement('div');
    lightStartArea.className = 'start-area light-start';
    const lightLabel = document.createElement('div');
    lightLabel.className = 'start-label';
    lightLabel.textContent = 'Light Start';
    lightStartArea.appendChild(lightLabel);
    
    for (let i = 0; i < game.light_pieces_start; i++) {
        const piece = document.createElement('div');
        piece.className = `start-piece light-piece ${validMoves.includes(0) && currentPlayer === Player.Light ? 'valid-move' : ''}`;
        piece.textContent = '○';
        piece.onclick = () => handleStartClick(0, Player.Light);
        lightStartArea.appendChild(piece);
    }
    
    const darkStartArea = document.createElement('div');
    darkStartArea.className = 'start-area dark-start';
    const darkLabel = document.createElement('div');
    darkLabel.className = 'start-label';
    darkLabel.textContent = 'Dark Start';
    darkStartArea.appendChild(darkLabel);
    
    for (let i = 0; i < game.dark_pieces_start; i++) {
        const piece = document.createElement('div');
        piece.className = `start-piece dark-piece ${validMoves.includes(0) && currentPlayer === Player.Dark ? 'valid-move' : ''}`;
        piece.textContent = '●';
        piece.onclick = () => handleStartClick(0, Player.Dark);
        darkStartArea.appendChild(piece);
    }
    
    startAreasContainer.appendChild(lightStartArea);
    startAreasContainer.appendChild(darkStartArea);
    
    boardContainer.appendChild(mainBoard);
    boardContainer.appendChild(startAreasContainer);
}

function createSquare(boardIndex) {
    const square = document.createElement('div');
    square.className = 'square';
    
    const squareInfo = game.get_square_info(boardIndex);
    const pieceType = squareInfo[0];
    const isValidMove = squareInfo[1];
    
    let content = '';
    switch (pieceType) {
        case 1:
            content = '○';
            square.className += ' light-piece';
            break;
        case 2:
            content = '●';
            square.className += ' dark-piece';
            break;
        default:
            square.className += ' empty';
    }
    
    if (isValidMove === 1) {
        square.className += ' valid-move';
    }
    
    square.textContent = content;
    
    const squareNumber = document.createElement('span');
    squareNumber.className = 'square-number';
    squareNumber.textContent = boardIndex + 1;
    square.appendChild(squareNumber);
    
    square.onclick = () => handleSquareClick(boardIndex);
    
    return square;
}

function handleRollDice() {
    if (!game || game.game_over) return;
    
    game.roll_dice();
    updateUI();
    
    const moves = game.get_valid_moves();
    if (moves.length === 0 && game.dice_value !== 0) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'No valid moves. Turn passes.';
        }
        setTimeout(() => {
            game.pass_turn();
            updateUI();
        }, 1000);
    }
}

function handleReset() {
    if (!game) return;
    game.reset();
    updateUI();
}

function handleStartClick(pathPos, player) {
    if (!game || game.game_over) return;
    if (game.current_player !== player) return;
    if (game.dice_value === 0) return;
    
    const moves = game.get_valid_moves();
    if (!moves.includes(pathPos)) return;
    
    if (game.make_move(pathPos)) {
        updateUI();
    }
}

function handleSquareClick(boardIndex) {
    if (!game || game.game_over) return;
    if (game.dice_value === 0) return;
    
    const pathPos = game.board_index_to_path(boardIndex, game.current_player);
    if (pathPos === null || pathPos === undefined) return;
    
    const moves = game.get_valid_moves();
    if (!moves.includes(pathPos)) return;
    
    if (game.make_move(pathPos)) {
        updateUI();
    }
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const rollButton = document.getElementById('roll-dice');
    const resetButton = document.getElementById('reset');
    
    if (rollButton) {
        rollButton.onclick = handleRollDice;
    }
    
    if (resetButton) {
        resetButton.onclick = handleReset;
    }
    
    loadGame();
});
