use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum Player {
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Square {
    piece: Option<Player>,
}

impl Default for Square {
    fn default() -> Self {
        Square {
            piece: None,
        }
    }
}

#[derive(Debug, Clone)]
#[wasm_bindgen]
pub struct GameState {
    board: [Square; 20],
    light_pieces_off: u8,  // Pieces that have exited the board
    dark_pieces_off: u8,
    light_pieces_start: u8,  // Pieces still in start area (position 0)
    dark_pieces_start: u8,
    current_player: Player,
    dice_value: u8,
    game_over: bool,
    winner: Option<Player>,
}

#[wasm_bindgen]
impl GameState {
    #[wasm_bindgen(constructor)]
    pub fn new() -> GameState {
        let board = [Square::default(); 20];
        
        GameState {
            board,
            light_pieces_off: 0,
            dark_pieces_off: 0,
            light_pieces_start: 7,
            dark_pieces_start: 7,
            current_player: Player::Light,
            dice_value: 0,
            game_over: false,
            winner: None,
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn current_player(&self) -> Player {
        self.current_player
    }
    
    #[wasm_bindgen(getter)]
    pub fn dice_value(&self) -> u8 {
        self.dice_value
    }
    
    #[wasm_bindgen(getter)]
    pub fn game_over(&self) -> bool {
        self.game_over
    }
    
    #[wasm_bindgen(getter)]
    pub fn winner(&self) -> Option<Player> {
        self.winner
    }
    
    #[wasm_bindgen(getter)]
    pub fn light_pieces_start(&self) -> u8 {
        self.light_pieces_start
    }
    
    #[wasm_bindgen(getter)]
    pub fn dark_pieces_start(&self) -> u8 {
        self.dark_pieces_start
    }
    
    #[wasm_bindgen(getter)]
    pub fn light_pieces_off(&self) -> u8 {
        self.light_pieces_off
    }
    
    #[wasm_bindgen(getter)]
    pub fn dark_pieces_off(&self) -> u8 {
        self.dark_pieces_off
    }
    
    pub fn get_board(&self) -> JsValue {
        // Convert board to a format JavaScript can understand
        // 0 = empty, 1 = light piece, 2 = dark piece
        let board_array: Vec<u8> = self.board.iter().map(|sq| {
            match sq.piece {
                Some(Player::Light) => 1,
                Some(Player::Dark) => 2,
                None => 0,
            }
        }).collect();
        serde_wasm_bindgen::to_value(&board_array).unwrap()
    }
    
    pub fn roll_dice(&mut self) -> u8 {
        // Roll 4 tetrahedral dice (each shows 0 or 1, total 0-4)
        // Game rules require 1-4 for entering, so if 0, treat as 1
        // Use JavaScript Math.random for better randomness
        let mut total = 0;
        for _ in 0..4 {
            if js_sys::Math::random() > 0.5 {
                total += 1;
            }
        }
        // Ensure minimum of 1 for entering the board (per game rules)
        if total == 0 {
            total = 1;
        }
        self.dice_value = total;
        self.dice_value
    }
    
    #[wasm_bindgen]
    pub fn board_index_to_path(&self, square_index: usize, player: Player) -> Option<usize> {
        // Board layout:
        // Left section: indices 0-11 (squares 1-12)
        // Centre: indices 12-13 (squares 13-14)
        // Right section: indices 14-19 (squares 15-20)
        
        match player {
            Player::Light => {
                // Light path: squares 4-1 (entry) -> 5-8, 13-18 (middle, skipping 9-12) -> 16-15 (end) -> off
                // path 1-4 = squares 4-1 (indices 3-0)
                // path 5-8 = squares 5-8 (indices 4-7)
                // path 9-14 = squares 13-18 (indices 12-17, but excluding 14-15 which are in end)
                // path 19-20 = squares 16-15 (indices 15-14)
                if square_index <= 3 {
                    // Entry squares 4-1 (indices 3-0) -> path 1-4
                    Some(4 - square_index) // index 3 -> path 1, index 2 -> path 2, index 1 -> path 3, index 0 -> path 4
                } else if square_index >= 14 && square_index <= 15 {
                    // End squares 16-15 (indices 15-14) -> path 19-20 (check BEFORE middle to avoid overlap)
                    Some(34 - square_index) // index 15 -> path 19, index 14 -> path 20
                } else if square_index >= 4 && square_index <= 7 {
                    // Middle squares 5-8 (indices 4-7) -> path 5-8
                    Some(square_index + 1) // index 4 -> path 5, index 7 -> path 8
                } else if square_index >= 12 && square_index <= 13 {
                    // Middle squares 13-14 (indices 12-13) -> path 9-10
                    Some(square_index - 3) // index 12 -> path 9, index 13 -> path 10
                } else if square_index >= 16 && square_index <= 17 {
                    // Middle squares 17-18 (indices 16-17) -> path 11-12
                    Some(square_index - 5) // index 16 -> path 11, index 17 -> path 12
                } else {
                    // Squares 9-12 (indices 8-11) are skipped - not part of Light's path
                    None
                }
            }
            Player::Dark => {
                // Dark path: squares 12-9 (entry) -> 5-18 (middle, skipping 1-4) -> 20-19 (end) -> off
                // path 1-4 = squares 12-9 (indices 11-8)
                // path 5-18 = squares 5-18 (indices 4-17) - shared section, excluding 0-3 (squares 1-4)
                // path 19-20 = squares 20-19 (indices 19-18)
                if square_index >= 8 && square_index <= 11 {
                    // Entry squares 12-9 (indices 11-8) -> path 1-4
                    Some(12 - square_index) // index 11 -> path 1, index 10 -> path 2, index 9 -> path 3, index 8 -> path 4
                } else if square_index >= 4 && square_index <= 17 {
                    // Middle squares 5-18 (indices 4-17) -> path 5-18
                    // Note: indices 0-3 (squares 1-4) are skipped - not part of Dark's path
                    Some(square_index + 1) // index 4 -> path 5, index 17 -> path 18
                } else if square_index >= 18 && square_index <= 19 {
                    // End squares 20-19 (indices 19-18) -> path 19-20
                    Some(38 - square_index) // index 19 -> path 19, index 18 -> path 20
                } else {
                    // Squares 1-4 (indices 0-3) are skipped - not part of Dark's path
                    None
                }
            }
        }
    }
    
    fn path_to_board_index(&self, path_pos: usize, player: Player) -> Option<usize> {
        if path_pos == 0 {
            return None; // Start area
        }
        if path_pos > 20 {
            return None; // Off board
        }
        
        match player {
            Player::Light => {
                // Light path: 1-4 (squares 4-1) -> 5-8, 9-14 (squares 5-8, 13-18, skipping 9-12) -> 19-20 (squares 16-15) -> off
                // path 5-8 maps to indices 4-7 (squares 5-8)
                // path 9-10 maps to indices 12-13 (squares 13-14)
                // path 11-12 maps to indices 16-17 (squares 17-18)
                // path 19-20 maps to indices 15-14 (squares 16-15)
                if path_pos <= 4 {
                    Some(4 - path_pos) // path 1 -> index 3, path 2 -> index 2, path 3 -> index 1, path 4 -> index 0
                } else if path_pos <= 8 {
                    Some(path_pos - 1) // path 5 -> index 4, path 8 -> index 7
                } else if path_pos <= 10 {
                    Some(path_pos + 3) // path 9 -> index 12, path 10 -> index 13
                } else if path_pos <= 12 {
                    Some(path_pos + 5) // path 11 -> index 16, path 12 -> index 17
                } else {
                    Some(34 - path_pos) // path 19 -> index 15, path 20 -> index 14
                }
            }
            Player::Dark => {
                // Dark path: 1-4 (squares 12-9) -> 5-18 (squares 5-18) -> 19-20 (squares 20-19) -> off
                if path_pos <= 4 {
                    Some(12 - path_pos) // path 1 -> index 11, path 2 -> index 10, path 3 -> index 9, path 4 -> index 8
                } else if path_pos <= 18 {
                    Some(path_pos - 1) // path 5 -> index 4, path 18 -> index 17
                } else {
                    Some(38 - path_pos) // path 19 -> index 19, path 20 -> index 18
                }
            }
        }
    }
    
    pub fn can_move(&self, from_path_pos: usize) -> bool {
        if self.game_over || self.dice_value == 0 {
            return false;
        }
        
        let player = self.current_player;
        
        // Check if moving from start area
        if from_path_pos == 0 {
            let pieces_in_start = match player {
                Player::Light => self.light_pieces_start,
                Player::Dark => self.dark_pieces_start,
            };
            if pieces_in_start == 0 {
                return false;
            }
            
            // Can enter if dice is 1-4
            if self.dice_value == 0 || self.dice_value > 4 {
                return false;
            }
            
            match player {
                Player::Light => {
                    // Light enters at squares 4-1 (indices 3-0) based on dice roll
                    // dice 1 -> square 4 (index 3), dice 2 -> square 3 (index 2), dice 3 -> square 2 (index 1), dice 4 -> square 1 (index 0)
                    let to_board_idx = (4 - self.dice_value) as usize; // dice 1->3, 2->2, 3->1, 4->0
                    if to_board_idx >= 4 {
                        return false;
                    }
                    // Check if destination is blocked by own piece
                    if let Some(piece_player) = self.board[to_board_idx].piece {
                        if piece_player == player {
                            return false;
                        }
                    }
                    return true;
                }
                Player::Dark => {
                    // Dark enters at squares 12-9 (indices 11-8) based on dice roll
                    // dice 1 -> square 12 (index 11), dice 2 -> square 11 (index 10), dice 3 -> square 10 (index 9), dice 4 -> square 9 (index 8)
                    let to_board_idx = (12 - self.dice_value) as usize; // dice 1->11, 2->10, 3->9, 4->8
                    if to_board_idx < 8 || to_board_idx > 11 {
                        return false;
                    }
                    // Check if destination is blocked by own piece
                    if let Some(piece_player) = self.board[to_board_idx].piece {
                        if piece_player == player {
                            return false;
                        }
                    }
                    return true;
                }
            }
        }
        
        // Moving piece on board
        let from_board = self.path_to_board_index(from_path_pos, player);
        if let None = from_board {
            return false;
        }
        let from_board_idx = from_board.unwrap();
        
        // Check if piece belongs to current player
        if let Some(piece_player) = self.board[from_board_idx].piece {
            if piece_player != player {
                return false;
            }
        } else {
            return false;
        }
        
        let to_path_pos = from_path_pos + self.dice_value as usize;
        
        // Check if moving off board
        // Rule: To exit the board, you roll exact or more number needed
        if to_path_pos >= 21 {
            return true;
        }
        
        let to_board = self.path_to_board_index(to_path_pos, player);
        if let Some(board_idx) = to_board {
            // Check if destination is blocked by own piece
            if let Some(piece_player) = self.board[board_idx].piece {
                if piece_player == player {
                    return false;
                }
            }
            return true;
        }
        
        false
    }
    
    pub fn get_valid_moves(&self) -> JsValue {
        let mut moves = Vec::new();
        
        let player = self.current_player;
        let pieces_in_start = match player {
            Player::Light => self.light_pieces_start,
            Player::Dark => self.dark_pieces_start,
        };
        
        // Check start area (path position 0)
        if pieces_in_start > 0 && self.can_move(0) {
            moves.push(0);
        }
        
        // Check pieces on board
        for board_idx in 0..20 {
            if let Some(piece_player) = self.board[board_idx].piece {
                if piece_player == player {
                    if let Some(path_pos) = self.board_index_to_path(board_idx, player) {
                        if self.can_move(path_pos) {
                            moves.push(path_pos);
                        }
                    }
                }
            }
        }
        
        serde_wasm_bindgen::to_value(&moves).unwrap()
    }
    
    pub fn make_move(&mut self, from_path_pos: usize) -> bool {
        if !self.can_move(from_path_pos) {
            return false;
        }
        
        let player = self.current_player;
        
        // Handle moving from start area
        if from_path_pos == 0 {
            match player {
                Player::Light => {
                    if self.light_pieces_start == 0 {
                        return false;
                    }
                    self.light_pieces_start -= 1;
                }
                Player::Dark => {
                    if self.dark_pieces_start == 0 {
                        return false;
                    }
                    self.dark_pieces_start -= 1;
                }
            }
            
            let to_board_idx = match player {
                Player::Light => {
                    // Light enters at squares 4-1 (indices 3-0)
                    // dice 1 -> square 4 (index 3), dice 2 -> square 3 (index 2), dice 3 -> square 2 (index 1), dice 4 -> square 1 (index 0)
                    (4 - self.dice_value) as usize
                }
                Player::Dark => {
                    // Dark enters at squares 12-9 (indices 11-8)
                    // dice 1 -> square 12 (index 11), dice 2 -> square 11 (index 10), dice 3 -> square 10 (index 9), dice 4 -> square 9 (index 8)
                    (12 - self.dice_value) as usize
                }
            };
            
            // Handle capturing opponent piece
            if let Some(opponent) = self.board[to_board_idx].piece {
                if opponent != player {
                    // Send opponent back to start
                    match opponent {
                        Player::Light => self.light_pieces_start += 1,
                        Player::Dark => self.dark_pieces_start += 1,
                    }
                }
            }
            
            // Place piece
            self.board[to_board_idx].piece = Some(player);
            
            // After placing, turn passes (handled below)
            
        } else {
            // Moving piece on board
            let from_board = self.path_to_board_index(from_path_pos, player).unwrap();
            let to_path_pos = from_path_pos + self.dice_value as usize;
            
            // Rule: To exit the board, you roll exact or more number needed
            if to_path_pos >= 21 {
                // Moving off board
                self.board[from_board].piece = None;
                match player {
                    Player::Light => self.light_pieces_off += 1,
                    Player::Dark => self.dark_pieces_off += 1,
                }
                self.dice_value = 0;
                self.check_win_condition();
                if !self.game_over {
                    self.switch_player();
                }
                return true;
            }
            
            let to_board = self.path_to_board_index(to_path_pos, player).unwrap();
            
            // Handle capturing opponent piece
            if let Some(opponent) = self.board[to_board].piece {
                if opponent != player {
                    // Send opponent back to start
                    match opponent {
                        Player::Light => self.light_pieces_start += 1,
                        Player::Dark => self.dark_pieces_start += 1,
                    }
                }
            }
            
            // Move piece
            self.board[from_board].piece = None;
            self.board[to_board].piece = Some(player);
        }
        
        // Rule: After moving, turn passes to opponent
        self.dice_value = 0;
        self.switch_player();
        self.check_win_condition();
        true
    }
    
    pub fn pass_turn(&mut self) {
        // Pass turn when no valid moves available
        if self.dice_value != 0 {
            self.dice_value = 0;
            self.switch_player();
        }
    }
    
    fn switch_player(&mut self) {
        self.current_player = match self.current_player {
            Player::Light => Player::Dark,
            Player::Dark => Player::Light,
        };
    }
    
    fn check_win_condition(&mut self) {
        if self.light_pieces_off == 7 {
            self.game_over = true;
            self.winner = Some(Player::Light);
        } else if self.dark_pieces_off == 7 {
            self.game_over = true;
            self.winner = Some(Player::Dark);
        }
    }
    
    pub fn reset(&mut self) {
        *self = GameState::new();
    }
    
    #[wasm_bindgen]
    pub fn get_square_info(&self, square_index: usize) -> JsValue {
        // Returns: [piece_type, is_valid_move]
        // piece_type: 0=empty, 1=light, 2=dark
        // is_valid_move: 0=false, 1=true
        let piece_type = match self.board[square_index].piece {
            Some(Player::Light) => 1,
            Some(Player::Dark) => 2,
            None => 0,
        };
        
        let path_pos = self.board_index_to_path(square_index, self.current_player);
        let is_valid_move = if let Some(path) = path_pos {
            let valid_moves = self.get_valid_moves();
            // Convert JsValue to Vec<usize> for checking
            let moves_vec: Vec<usize> = serde_wasm_bindgen::from_value(valid_moves).unwrap_or_default();
            moves_vec.contains(&path) as u8
        } else {
            0
        };
        
        serde_wasm_bindgen::to_value(&[piece_type, is_valid_move]).unwrap()
    }
    
    #[wasm_bindgen]
    pub fn count_pieces_on_board(&self, player: Player) -> u8 {
        let mut count = 0;
        for square in &self.board {
            if let Some(piece_player) = square.piece {
                if piece_player == player {
                    count += 1;
                }
            }
        }
        count
    }
    
    #[wasm_bindgen]
    pub fn get_status_message(&self) -> JsValue {
        if self.game_over {
            if let Some(winner) = self.winner {
                let winner_name = match winner {
                    Player::Light => "Light",
                    Player::Dark => "Dark",
                };
                serde_wasm_bindgen::to_value(&format!("Game Over! {} Player Wins!", winner_name)).unwrap()
            } else {
                serde_wasm_bindgen::to_value(&"Game Over!").unwrap()
            }
        } else if self.dice_value == 0 {
            serde_wasm_bindgen::to_value(&"").unwrap()
        } else {
            serde_wasm_bindgen::to_value(&"Select a piece to move").unwrap()
        }
    }
    
    #[wasm_bindgen]
    pub fn get_player_name(&self) -> JsValue {
        let name = match self.current_player {
            Player::Light => "Light",
            Player::Dark => "Dark",
        };
        serde_wasm_bindgen::to_value(&name).unwrap()
    }
}

#[wasm_bindgen]
pub fn init() {
    console_error_panic_hook::set_once();
}
