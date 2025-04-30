// server/board.js
// Enhanced with king one-step moves, castling, and game-over detection
class Board {
  constructor() {
    this.reset();
  }

  reset() {
    // initial chess position
    this.grid = [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['.','.','.','.','.','.','.','.'],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R'],
    ];
    this.turn = 'WHITE';

    // Castling and movement flags
    this.whiteKingMoved      = false;
    this.whiteKingRookMoved  = false; // h1 rook
    this.whiteQueenRookMoved = false; // a1 rook
    this.blackKingMoved      = false;
    this.blackKingRookMoved  = false; // h8 rook
    this.blackQueenRookMoved = false; // a8 rook

    // Game-over state
    this.gameOver = false;
    this.winner   = null;
  }

  get([r, c]) {
    return this.grid[r - 1][c - 1];
  }

  set([r, c], v) {
    this.grid[r - 1][c - 1] = v;
  }

  _validatePawn(from, to, piece, dr, dc, isCapture) {
    const dir = piece === 'P' ? -1 : +1;
    const startRow = piece === 'P' ? 7 : 2;
    // one step
    if (!isCapture && dc === 0 && dr === dir) return true;
    // two steps from starting rank
    if (!isCapture && dc === 0 && dr === 2 * dir && from[0] === startRow) {
      const mid = [from[0] + dir, from[1]];
      if (this.get(mid) === '.') return true;
    }
    // diagonal capture
    if (isCapture && Math.abs(dc) === 1 && dr === dir) return true;
    return false;
  }

  _validateKnight(dr, dc) {
    return (
      (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
      (Math.abs(dr) === 1 && Math.abs(dc) === 2)
    );
  }

  /**
   * King: one square in any direction, or castling
   */
  _validateKing(from, to, dr, dc) {
    // one square any direction
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;

    // castling logic
    const row = from[0];
    const color = this.turn;
    // king-side castle: move two to the right
    if (dr === 0 && dc === 2 &&
        !this._kingMoved(color) &&
        !this._rookMoved(color, 'KING') &&
        this._clearPath([row,5], [row,8])
    ) return true;
    // queen-side castle: move two to the left
    if (dr === 0 && dc === -2 &&
        !this._kingMoved(color) &&
        !this._rookMoved(color, 'QUEEN') &&
        this._clearPath([row,1], [row,5])
    ) return true;

    return false;
  }

  /**
   * Universal sliding validator for B, R, Q
   */
  _validateSliding(from, to, dr, dc, allowedDirs) {
    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);

    const isDiagonal = Math.abs(dr) === Math.abs(dc);
    const isStraight = (dr === 0 && dc !== 0) || (dc === 0 && dr !== 0);

    if (isDiagonal && !allowedDirs.includes('B')) return false;
    if (isStraight && !allowedDirs.includes('R')) return false;
    if (!isDiagonal && !isStraight) return false;

    let [r, c] = [from[0] + stepR, from[1] + stepC];
    while (r !== to[0] || c !== to[1]) {
      if (this.get([r, c]) !== '.') return false;
      r += stepR; c += stepC;
    }
    return true;
  }

  isValidMove(from, to) {
    if (this.gameOver) return false;
    // bounds check
    if (
      from[0] < 1 || from[0] > 8 || from[1] < 1 || from[1] > 8 ||
      to[0]   < 1 || to[0]   > 8 || to[1]   < 1 || to[1]   > 8
    ) return false;

    const piece = this.get(from);
    if (piece === '.') return false;

    // enforce turn
    const isWhite = piece === piece.toUpperCase();
    if ((this.turn === 'WHITE') !== isWhite) return false;

    const target = this.get(to);
    if (target !== '.' && (target === target.toUpperCase()) === isWhite) return false;

    const dr = to[0] - from[0];
    const dc = to[1] - from[1];
    const isCapture = target !== '.';

    switch (piece.toUpperCase()) {
      case 'P': return this._validatePawn(from, to, piece, dr, dc, isCapture);
      case 'N': return this._validateKnight(dr, dc);
      case 'K': return this._validateKing(from, to, dr, dc);
      case 'B': return this._validateSliding(from, to, dr, dc, ['B']);
      case 'R': return this._validateSliding(from, to, dr, dc, ['R']);
      case 'Q': return this._validateSliding(from, to, dr, dc, ['R','B']);
      default:  return false;
    }
  }

  move(from, to) {
    if (!this.isValidMove(from, to)) return false;

    const piece  = this.get(from);
    const target = this.get(to);
    const dc     = to[1] - from[1];

    // handle castling rook relocation
    if (piece.toUpperCase() === 'K' && Math.abs(dc) === 2) {
      const row = from[0];
      if (dc === 2) {
        // king-side: rook from col=8 → col=6
        this.set([row,6], this.get([row,8]));
        this.set([row,8], '.');
      } else {
        // queen-side: rook from col=1 → col=4
        this.set([row,4], this.get([row,1]));
        this.set([row,1], '.');
      }
    }

    // move piece
    this.set(to, piece);
    this.set(from, '.');

    // update moved flags
    this._flagMoved(piece, from);

    // king capture ends game
    if (target.toUpperCase() === 'K') {
      this.gameOver = true;
      this.winner   = this.turn;
    }

    // switch turn
    this.turn = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
    return true;
  }

  // --- Helper methods for castling & game state ---

  _clearPath(start, end) {
    const row = start[0];
    const step = start[1] < end[1] ? 1 : -1;
    for (let c = start[1] + step; c !== end[1]; c += step) {
      if (this.get([row,c]) !== '.') return false;
    }
    return true;
  }

  _kingMoved(color) {
    return color === 'WHITE' ? this.whiteKingMoved : this.blackKingMoved;
  }

  _rookMoved(color, side) {
    if (color === 'WHITE') {
      return side === 'KING' ? this.whiteKingRookMoved : this.whiteQueenRookMoved;
    } else {
      return side === 'KING' ? this.blackKingRookMoved : this.blackQueenRookMoved;
    }
  }

  _flagMoved(piece, from) {
    const [r,c] = from;
    if (piece === 'K') {
      if (this.turn === 'WHITE') this.whiteKingMoved = true;
      else                       this.blackKingMoved = true;
    }
    if (piece === 'R') {
      // track rook moves from initial squares
      if (r === 8 && c === 8) this.whiteKingRookMoved  = true;
      if (r === 8 && c === 1) this.whiteQueenRookMoved = true;
      if (r === 1 && c === 8) this.blackKingRookMoved  = true;
      if (r === 1 && c === 1) this.blackQueenRookMoved = true;
    }
  }
}

module.exports = Board;