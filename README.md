<img width="1245" height="787" alt="Screenshot 2025-12-15 130113" src="https://github.com/user-attachments/assets/3adea6d7-749f-466a-bc9d-b614a54646bb" />

# Prerequisites

- Rust (latest stable version)
wasm-pack, install with: 
```bash
cargo install wasm-pack
```

### Build Steps

1. Build the WebAssembly module:
```bash
wasm-pack build --target web
```

2. Serve the files with a local web server (required for WebAssembly):
```bash
python -m http.server 8000
```

3. Open browser:
```bash
http://localhost:8000
```
<br>

# Game Rules
Be the first player to move all 7 of your pieces from the start area, through the board, and off the opposite end.

- **Entry**:   Roll tetrahedral dice (number 1- 4). Light piece start at square 4 - 1 . Dark piece start at square 12 - 9.

- **Path**: Light piece move from squares 4 - 1, 5 - 18, 16 - 15, off board. Dark piece move from squares 12 - 9, 5 - 18, 20 - 19, off board.

- **Blocking**: You cannot land on a square occupied by your own piece.
- **End Turn to opponent**: After placing, capture, moving pieces.

- **Landing on Opponent**: If you land on a square occupied by an opponent's piece, you **capture** it.
- **Capture Effect**: The opponent's piece is sent back to Light/ Dark start.

- **To Exit**: Roll extact or more needed.
- **Victory**: The players who move all 7 of your pieces off the board.

<br>

# Game of Ur

Also known as the "Game of Twenty Squares" is one of the oldest known board games, dating back to around 2600 BCE. The game was discovered in the Royal Cemetery of Ur in modern-day Iraq by archaeologist Sir Leonard Woolley in the 1920s.

*Based on Tablet BM 33333B (Babylon, 177-176 "BCE), a cuneiform tablet written by the Babylonian scribe **Itti-Marduk-balāṭu** on 3 November, 177-176 BCE. 

- **Multiple Boards Found**: Several game boards have been discovered, showing variations in design but consistent gameplay.

- **Widespread Popularity**: Evidence suggests the game was played across the ancient Near East for over 3000 years, from around 2600 BCE to the first millennium CE.

### Board Design Evolution

The board underwent significant evolution over its 3000-year history:

- **Third Millennium BCE** (original Ur boards): The board had a distinctive T-shaped layout with a block of 4×3 squares joined to a smaller block of 2×3 by a "bridge" of two squares, totaling 20 squares.
- **Second Millennium BCE onwards**: The smaller block of six squares (3×2) was straightened out into a continuation of the "bridge" element, forming a continuous projecting run of eight squares, or a central run of twelve squares in total. The board still possessed 20 squares but with a different layout.
- **Marked Squares**: Early boards featured marked or cross-cut squares (rosettes), though after 2000 BCE there was a tendency to dispense with marked squares in the corners.

<br>

# Project Structure

```
.
├── Cargo.toml          # Rust project configuration
├── src/
│   ├── lib.rs          # Main game logic
│   └── main.rs         # Entry point
├── index.html          # Web interface
├── style.css           # Styling
├── index.js            # JavaScript bindings
├── build.bat           # Windows build script
├── build.sh            # Unix build script
└── README.md           # This file
```
