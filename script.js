class CheckersGame {
    constructor() {
        this.boardSize = 10; // Taille fixe à 10x10
        this.board = [];
        this.currentPlayer = 'black';
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.scores = { black: 0, white: 0 };
        this.mandatoryJumps = [];

        this.initializeBoard();
        this.setupEventListeners();
        this.updateDisplay();
    }

    initializeBoard() {
        this.board = [];
        for (let row = 0; row < this.boardSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.boardSize; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 4) {
                        this.board[row][col] = { color: 'black', isKing: false };
                    } else if (row > 5) {
                        this.board[row][col] = { color: 'white', isKing: false };
                    } else {
                        this.board[row][col] = null;
                    }
                } else {
                    this.board[row][col] = null;
                }
            }
        }
    }

    setupEventListeners() {
        document.getElementById('board').addEventListener('click', (e) => {
            const square = e.target.closest('.square');
            if (square) {
                const row = parseInt(square.dataset.row);
                const col = parseInt(square.dataset.col);
                this.handleSquareClick(row, col);
            }
        });

        document.getElementById('undo').addEventListener('click', () => this.undoMove());
        document.getElementById('restart').addEventListener('click', () => this.restartGame());
    }

    findAllMandatoryJumps() {
        this.mandatoryJumps = [];
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === this.currentPlayer) {
                    const jumps = this.getJumps(row, col, piece);
                    if (jumps.length > 0) {
                        this.mandatoryJumps.push({ row, col, jumps });
                    }
                }
            }
        }
        return this.mandatoryJumps.length > 0;
    }

    handleSquareClick(row, col) {
        const piece = this.board[row][col];
        const hasMandatoryJumps = this.findAllMandatoryJumps();

        if (this.selectedPiece) {
            const move = this.validMoves.find(m => m.toRow === row && m.toCol === col);
            if (move) {
                this.makeMove(move);
                this.selectedPiece = null;
                this.validMoves = [];

                if (move.captures.length > 0) {
                    const additionalJumps = this.getJumps(move.toRow, move.toCol, this.board[move.toRow][move.toCol]);
                    if (additionalJumps.length > 0) {
                        this.selectedPiece = { row: move.toRow, col: move.toCol };
                        this.validMoves = additionalJumps;
                        this.updateDisplay();
                        return;
                    }
                }
            } else {
                this.selectedPiece = null;
                this.validMoves = [];
            }
        } else if (piece && piece.color === this.currentPlayer) {
            if (hasMandatoryJumps) {
                const mandatoryMove = this.mandatoryJumps.find(m => m.row === row && m.col === col);
                if (mandatoryMove) {
                    this.selectedPiece = { row, col };
                    this.validMoves = mandatoryMove.jumps;
                }
            } else {
                const moves = this.getValidMoves(row, col);
                if (moves.length > 0) {
                    this.selectedPiece = { row, col };
                    this.validMoves = moves;
                }
            }
        }

        this.updateDisplay();
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const jumps = this.getJumps(row, col, piece);
        if (jumps.length > 0) return jumps;

        const moves = [];
        const directions = piece.isKing ? [-1, 1] : piece.color === 'black' ? [1] : [-1];

        for (const dRow of directions) {
            for (const dCol of [-1, 1]) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: newRow,
                        toCol: newCol,
                        captures: []
                    });
                }
            }
        }

        return moves;
    }

    getJumps(row, col, piece, captures = []) {
        const jumps = [];
        const directions = piece.isKing ? [-1, 1] : piece.color === 'black' ? [1] : [-1];

        for (const dRow of directions) {
            for (const dCol of [-1, 1]) {
                const jumpRow = row + dRow * 2;
                const jumpCol = col + dCol * 2;
                const captureRow = row + dRow;
                const captureCol = col + dCol;

                if (this.isValidPosition(jumpRow, jumpCol) && 
                    this.board[captureRow][captureCol]?.color !== piece.color &&
                    this.board[captureRow][captureCol] &&
                    !this.board[jumpRow][jumpCol] &&
                    !captures.some(c => c.row === captureRow && c.col === captureCol)) {
                    
                    const newCaptures = [...captures, { row: captureRow, col: captureCol }];
                    const jump = {
                        fromRow: row,
                        fromCol: col,
                        toRow: jumpRow,
                        toCol: jumpCol,
                        captures: newCaptures
                    };
                    jumps.push(jump);

                    const furtherJumps = this.getJumps(jumpRow, jumpCol, piece, newCaptures);
                    jumps.push(...furtherJumps);
                }
            }
        }

        return jumps;
    }

    makeMove(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        
        this.moveHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer,
            scores: {...this.scores}
        });

        move.captures.forEach(capture => {
            const capturedPiece = this.board[capture.row][capture.col];
            const pieceElement = document.querySelector(`[data-row="${capture.row}"][data-col="${capture.col}"] .piece`);
            if (pieceElement) {
                pieceElement.classList.add('capturing');
                setTimeout(() => {
                    this.board[capture.row][capture.col] = null;
                    this.scores[this.currentPlayer]++;
                }, 500);
            }
        });

        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = null;

        if ((piece.color === 'black' && move.toRow === this.boardSize - 1) ||
            (piece.color === 'white' && move.toRow === 0)) {
            piece.isKing = true;
            const pieceElement = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"] .piece`);
            if (pieceElement) {
                pieceElement.classList.add('promoting');
            }
        }

        if (move.captures.length === 0 || !this.getJumps(move.toRow, move.toCol, piece).length) {
            this.currentPlayer = this.currentPlayer === 'black' ? 'white' : 'black';
        }
    }

    undoMove() {
        if (this.moveHistory.length > 0) {
            const lastState = this.moveHistory.pop();
            this.board = lastState.board;
            this.currentPlayer = lastState.currentPlayer;
            this.scores = lastState.scores;
            this.selectedPiece = null;
            this.validMoves = [];
            this.updateDisplay();
        }
    }

    restartGame() {
        this.initializeBoard();
        this.currentPlayer = 'black';
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.scores = { black: 0, white: 0 };
        this.mandatoryJumps = [];
        this.updateDisplay();
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && col >= 0 && col < this.boardSize;
    }

    updateDisplay() {
        const boardElement = document.getElementById('board');
        boardElement.style.gridTemplateColumns = `repeat(${this.boardSize}, var(--square-size))`;
        boardElement.style.gridTemplateRows = `repeat(${this.boardSize}, var(--square-size))`;
        boardElement.innerHTML = '';

        const hasMandatoryJumps = this.findAllMandatoryJumps();

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}${piece.isKing ? ' king' : ''}`;
                    square.appendChild(pieceElement);
                }

                if (this.selectedPiece?.row === row && this.selectedPiece?.col === col) {
                    square.classList.add('selected');
                }

                if (this.validMoves.some(move => move.toRow === row && move.toCol === col)) {
                    square.classList.add('valid-move');
                    if (hasMandatoryJumps) {
                        square.classList.add('mandatory-move');
                    }
                }

                boardElement.appendChild(square);
            }
        }

        document.getElementById('black-score').textContent = this.scores.black;
        document.getElementById('white-score').textContent = this.scores.white;
        document.getElementById('player-turn').textContent = 
            this.currentPlayer === 'black' ? 'Noir' : 'Blanc';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CheckersGame();
});