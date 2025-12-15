@echo off
REM Build script for Game of Ur WebAssembly (Windows)

echo Building Game of Ur WebAssembly module...
wasm-pack build --target web

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
    echo To run the game, start a local web server:
    echo   python -m http.server 8000
    echo   or
    echo   npx serve
    echo.
    echo Then open http://localhost:8000 in your browser
) else (
    echo Build failed!
    exit /b 1
)
