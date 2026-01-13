import { useState, useEffect } from 'react';
import init, { GameState, Player } from '../pkg/game_of_ur.js';
import './App.css';
import {
  initDatabase,
  createGame,
  saveMove,
  updateGame,
  getGameMoves,
  getGameStats
} from './database.js';

function App() {
  const [game, setGame] = useState(null);
  const [board, setBoard] = useState([]);
  const [validMoves, setValidMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(Player.Light);
  const [diceValue, setDiceValue] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('');
  const [lightPiecesStart, setLightPiecesStart] = useState(7);
  const [darkPiecesStart, setDarkPiecesStart] = useState(7);
  const [lightPiecesOff, setLightPiecesOff] = useState(0);
  const [darkPiecesOff, setDarkPiecesOff] = useState(0);
  const [currentGameId, setCurrentGameId] = useState(null);
  const [moveNumber, setMoveNumber] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [gameMoves, setGameMoves] = useState([]);

  useEffect(() => {
    async function loadGame() {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }

      await init();
      const newGame = new GameState();
      setGame(newGame);
      updateGameState(newGame);
      
      const gameId = createGame();
      setCurrentGameId(gameId);
      setMoveNumber(0);
    }
    loadGame();
  }, []);

  function loadCurrentGameMoves() {
    if (currentGameId) {
      const moves = getGameMoves(currentGameId);
      setGameMoves(moves);
    } else {
      setGameMoves([]);
    }
  }

  // Helper function to convert path position to square number (1-20)
  // Based on Rust path_to_board_index logic
  function pathToSquare(pathPos, player) {
    if (pathPos === 0 || pathPos > 20) {
      return null; // Start area or off board
    }
    
    if (player === Player.Light) {
      // Light path: 1-4 (squares 4-1) -> 5-8 (squares 5-8) -> 9-14 (squares 13-18) -> 19-20 (squares 16-15)
      if (pathPos <= 4) {
        return (4 - pathPos) + 1; // path 1 -> square 4, path 4 -> square 1
      } else if (pathPos <= 8) {
        return pathPos; // path 5 -> square 5, path 8 -> square 8
      } else if (pathPos <= 10) {
        return pathPos + 4; // path 9 -> square 13, path 10 -> square 14
      } else if (pathPos <= 12) {
        return pathPos + 6; // path 11 -> square 17, path 12 -> square 18
      } else {
        return 35 - pathPos; // path 19 -> square 16, path 20 -> square 15
      }
    } else {
      // Dark path: 1-4 (squares 12-9) -> 5-18 (squares 5-18) -> 19-20 (squares 20-19)
      if (pathPos <= 4) {
        return 13 - pathPos; // path 1 -> square 12, path 4 -> square 9
      } else if (pathPos <= 18) {
        return pathPos; // path 5 -> square 5, path 18 -> square 18
      } else {
        return 39 - pathPos; // path 19 -> square 20, path 20 -> square 19
      }
    }
  }

  function updateGameState(gameInstance) {
    if (!gameInstance) return;
    
    const newBoard = gameInstance.get_board();
    const newValidMoves = gameInstance.get_valid_moves();
    const newCurrentPlayer = gameInstance.current_player;
    const newDiceValue = gameInstance.dice_value;
    const newGameOver = gameInstance.game_over;
    const newLightPiecesStart = gameInstance.light_pieces_start;
    const newDarkPiecesStart = gameInstance.dark_pieces_start;
    const lightOnBoard = gameInstance.count_pieces_on_board(Player.Light);
    const darkOnBoard = gameInstance.count_pieces_on_board(Player.Dark);
    const newLightPiecesOff = 7 - newLightPiecesStart - lightOnBoard;
    const newDarkPiecesOff = 7 - newDarkPiecesStart - darkOnBoard;
    
    setBoard(newBoard);
    setValidMoves(newValidMoves);
    setCurrentPlayer(newCurrentPlayer);
    setDiceValue(newDiceValue);
    setGameOver(newGameOver);
    setLightPiecesStart(newLightPiecesStart);
    setDarkPiecesStart(newDarkPiecesStart);
    setLightPiecesOff(newLightPiecesOff);
    setDarkPiecesOff(newDarkPiecesOff);
    
    if (newGameOver) {
      setWinner(gameInstance.winner);
      const winnerName = gameInstance.winner === Player.Light ? 'Light' : 'Dark';
      setStatus(`Game Over! ${winnerName} Player Wins!`);
      
      if (currentGameId) {
        updateGame(currentGameId, winnerName, moveNumber);
      }
    } else {
      setWinner(null);
      if (newDiceValue === 0) {
        setStatus('');
      } else {
        setStatus('Select a piece to move');
      }
    }
  }

  function handleRollDice() {
    if (!game || gameOver) return;
    
    const rolledValue = game.roll_dice();
    updateGameState(game);
    
    const moves = game.get_valid_moves();
    if (moves.length === 0 && rolledValue !== 0) {
      setStatus('No valid moves. Turn passes.');
      setTimeout(() => {
        game.pass_turn();
        updateGameState(game);
      }, 1000);
    }
  }

  function handleReset() {
    if (!game) return;
    
    const gameId = createGame();
    setCurrentGameId(gameId);
    setMoveNumber(0);
    
    game.reset();
    setWinner(null);
    setStatus('');
    setGameMoves([]);
    
    updateGameState(game);
  }

  function handleStartClick(pathPos, player) {
    if (!game || gameOver) return;
    if (game.current_player !== player) return;
    if (game.dice_value === 0) return;
    
    const moves = game.get_valid_moves();
    if (!moves.includes(pathPos)) return;
    
    const playerName = player === Player.Light ? 'Light' : 'Dark';
    const diceValue = game.dice_value; // Store before move
    const success = game.make_move(pathPos);
    
    if (success) {
      if (currentGameId != null && currentGameId > 0) {
        const newMoveNumber = moveNumber + 1;
        setMoveNumber(newMoveNumber);
        // When moving from start (pathPos=0), destination path is dice_value
        const destPathPos = diceValue;
        const destSquare = pathToSquare(destPathPos, player);
        saveMove(
          currentGameId,
          playerName,
          0, // from start
          destPathPos,
          destSquare, // square number (1-20)
          diceValue,
          newMoveNumber
        );
        if (showHistory) {
          loadCurrentGameMoves();
        }
      }
      updateGameState(game);
    }
  }

  function handleSquareClick(boardIndex, player) {
    if (!game || gameOver) return;
    if (game.current_player !== player) return;
    if (game.dice_value === 0) return;
    
    const pathPos = game.board_index_to_path(boardIndex, player);
    if (pathPos === null || pathPos === undefined) return;
    
    const moves = game.get_valid_moves();
    if (!moves.includes(pathPos)) return;
    
    const playerName = player === Player.Light ? 'Light' : 'Dark';
    const diceValue = game.dice_value; // Store before move
    const success = game.make_move(pathPos);
    
    if (success) {
      if (currentGameId != null && currentGameId > 0) {
        const newMoveNumber = moveNumber + 1;
        setMoveNumber(newMoveNumber);
        // Destination path is current path + dice value
        const destPathPos = pathPos + diceValue;
        const destSquare = pathToSquare(destPathPos, player);
        saveMove(
          currentGameId,
          playerName,
          pathPos, // from path position
          destPathPos, // to path position
          destSquare, // square number (1-20)
          diceValue,
          newMoveNumber
        );
        if (showHistory) {
          loadCurrentGameMoves();
        }
      }
      updateGameState(game);
    }
  }

  function createSquare(boardIndex, currentPlayer) {
    if (!game) {
      return (
        <div key={boardIndex} className="square empty">
          <span className="square-number">{boardIndex + 1}</span>
        </div>
      );
    }
    
    const squareInfo = game.get_square_info(boardIndex);
    const pieceType = squareInfo[0];
    const isValidMove = squareInfo[1];
    
    let content = '';
    let squareClassName = 'square';
    
    switch (pieceType) {
      case 1:
        content = '○';
        squareClassName += ' light-piece';
        break;
      case 2:
        content = '●';
        squareClassName += ' dark-piece';
        break;
      default:
        squareClassName += ' empty';
    }
    
    if (isValidMove === 1) {
      squareClassName += ' valid-move';
    }
    
    return (
      <div
        key={boardIndex}
        className={squareClassName}
        onClick={() => handleSquareClick(boardIndex, currentPlayer)}
      >
        {content}
        <span className="square-number">{boardIndex + 1}</span>
      </div>
    );
  }

  const playerName = currentPlayer === Player.Light ? 'Light' : 'Dark';

  if (!game) {
    return (
      <div className="container">
        <header>
          <h1>Game of Ur</h1>
        </header>
        <div className="loading">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>Game of Ur</h1>
      </header>
      
      <div className="game-info">
        <div className="player-info">
          <div id="current-player" className={`player-indicator ${currentPlayer === Player.Dark ? 'dark' : ''}`}>
            <span>Current: </span>
            <span id="player-name">{playerName}</span>
          </div>
          <div id="dice-display">
            <span>Dice: </span>
            <span>{diceValue || '-'}</span>
          </div>
          <div id="pieces-info">
            <div>Light: <span>{lightPiecesStart}</span> start, <span>{lightPiecesOff}</span> off</div>
            <div>Dark: <span>{darkPiecesStart}</span> start, <span>{darkPiecesOff}</span> off</div>
          </div>
        </div>
        <div className="controls">
          <button 
            className="btn btn-primary"
            onClick={handleRollDice}
            disabled={diceValue !== 0 || gameOver}
          >
            Roll Dice
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
          <button 
            className="btn btn-history"
            onClick={() => {
              if (!showHistory) {
                loadCurrentGameMoves();
              }
              setShowHistory(!showHistory);
            }}
          >
            History
          </button>
        </div>
      </div>
      
      <div className="board">
        <div className="main-board">
          <div className="board-section left-section">
            {[0, 1, 2].map(row => (
              <div key={row} className="board-row">
                {[0, 1, 2, 3].map(col => {
                  const index = row * 4 + col;
                  return createSquare(index, currentPlayer);
                })}
              </div>
            ))}
          </div>
          
          <div className="board-section centre-section">
            <div className="board-row">
              {[12, 13].map(index => createSquare(index, currentPlayer))}
            </div>
          </div>
          
          <div className="board-section right-section">
            {[0, 1, 2].map(row => (
              <div key={row} className="board-row">
                {[0, 1].map(col => {
                  const index = 14 + row * 2 + col;
                  return createSquare(index, currentPlayer);
                })}
              </div>
            ))}
          </div>
        </div>
        
        <div className="start-areas-container">
          <div className="start-area light-start">
            <div className="start-label">Light Start</div>
            {Array.from({ length: lightPiecesStart }).map((_, i) => (
              <div
                key={i}
                className={`start-piece light-piece ${validMoves.includes(0) && currentPlayer === Player.Light ? 'valid-move' : ''}`}
                onClick={() => handleStartClick(0, Player.Light)}
              >
                ○
              </div>
            ))}
          </div>
          
          <div className="start-area dark-start">
            <div className="start-label">Dark Start</div>
            {Array.from({ length: darkPiecesStart }).map((_, i) => (
              <div
                key={i}
                className={`start-piece dark-piece ${validMoves.includes(0) && currentPlayer === Player.Dark ? 'valid-move' : ''}`}
                onClick={() => handleStartClick(0, Player.Dark)}
              >
                ●
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div 
        className="status"
        style={{ color: gameOver ? '#ff6347' : '#667eea' }}
      >
        {status}
      </div>

      {showHistory && (
        <div className="history-panel">
          <div className="history-header">
            <h2>Record</h2>
            {currentGameId && (
              <div className="history-game-info">
                <span>Game #{currentGameId}</span>
              </div>
            )}
          </div>
          
          {gameMoves.length === 0 ? (
            <div className="history-empty">No moves.</div>
          ) : (
            <div className="history-content">
              <div className="history-moves">
                <h3>Moves</h3>
                <div className="moves-list">
                  {gameMoves.map((move) => (
                    <div key={move.id} className="move-item">
                      <span className="move-number">#{move.move_number}</span>
                      <span className={`move-player ${move.player.toLowerCase()}`}>
                        {move.player}
                      </span>
                      <span className="move-details">
                        {move.path_from !== null && move.path_from !== 0 ? `Path ${move.path_from}` : 'Start'} 
                        {' → '} 
                        {move.square_to !== null && move.square_to !== undefined 
                          ? `Square ${move.square_to}` 
                          : `Path ${move.path_to}`}
                      </span>
                      <span className="move-dice">🎲 {move.dice_value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
