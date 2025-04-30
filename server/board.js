// server/board.js
// Enhanced with king one-step moves, castling, game-over detection, and detailed invalid move reasons
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

    // Last invalid move reason
    this.lastInvalidReason = null;
  }

  get([r, c]) {
    return this.grid[r - 1][c - 1];
  }

  set([r, c], v) {
    this.grid[r - 1][c - 1] = v;
  }

  _validatePawn(from, to, piece, dr, dc, isCapture) { /* unchanged pawn logic */
    const dir = piece === 'P' ? -1 : +1;
    const startRow = piece === 'P' ? 7 : 2;
    if (!isCapture && dc === 0 && dr === dir) return true;
    if (!isCapture && dc === 0 && dr === 2 * dir && from[0] === startRow) {
      const mid = [from[0] + dir, from[1]];
      if (this.get(mid) === '.') return true;
    }
    if (isCapture && Math.abs(dc) === 1 && dr === dir) return true;
    return false;
  }

  _validateKnight(dr, dc) {
    return (
      (Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
      (Math.abs(dr) === 1 && Math.abs(dc) === 2)
    );
  }

  _validateKing(from, to, dr, dc) { /* unchanged king logic */
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
    const row = from[0];
    const color = this.turn;
    if (dr === 0 && dc === 2 && !this._kingMoved(color) && !this._rookMoved(color, 'KING') && this._clearPath([row,5], [row,8]))
      return true;
    if (dr === 0 && dc === -2 && !this._kingMoved(color) && !this._rookMoved(color, 'QUEEN') && this._clearPath([row,1], [row,5]))
      return true;
    return false;
  }

  _validateSliding(from, to, dr, dc, allowedDirs) { /* unchanged sliding logic */
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
    // reset reason
    this.lastInvalidReason = null;

    // 1) bounds check
    if (from[0] < 1 || from[0] > 8 || from[1] < 1 || from[1] > 8 ||
        to[0]   < 1 || to[0]   > 8 || to[1]   < 1 || to[1]   > 8) {
      this.lastInvalidReason = 'Move out of board bounds';
      return false;
    }

    const piece = this.get(from);
    // 2) no piece
    if (piece === '.') {
      this.lastInvalidReason = 'No piece at source square';
      return false;
    }

    // 3) turn enforcement
    const isWhite = piece === piece.toUpperCase();
    if ((this.turn === 'WHITE') !== isWhite) {
      this.lastInvalidReason = `It is not your turn (${this.turn})`;
      return false;
    }

    const target = this.get(to);
    // 4) self-capture
    if (target !== '.' && (target === target.toUpperCase()) === isWhite) {
      this.lastInvalidReason = 'Cannot capture your own piece';
      return false;
    }

    const dr = to[0] - from[0];
    const dc = to[1] - from[1];
    const isCapture = target !== '.';

    let ok = false;
    switch (piece.toUpperCase()) {
      case 'P':
        ok = this._validatePawn(from, to, piece, dr, dc, isCapture);
        if (!ok) this.lastInvalidReason = 'Illegal pawn move';
        break;
      case 'N':
        ok = this._validateKnight(dr, dc);
        if (!ok) this.lastInvalidReason = 'Illegal knight move';
        break;
      case 'K':
        ok = this._validateKing(from, to, dr, dc);
        if (!ok) this.lastInvalidReason = 'Illegal king move or castling not allowed';
        break;
      case 'B':
        ok = this._validateSliding(from, to, dr, dc, ['B']);
        if (!ok) this.lastInvalidReason = 'Illegal bishop move';
        break;
      case 'R':
        ok = this._validateSliding(from, to, dr, dc, ['R']);
        if (!ok) this.lastInvalidReason = 'Illegal rook move';
        break;
      case 'Q':
        ok = this._validateSliding(from, to, dr, dc, ['R','B']);
        if (!ok) this.lastInvalidReason = 'Illegal queen move';
        break;
      default:
        this.lastInvalidReason = `No rule for piece '${piece}'`;
    }

    return ok;
  }

  move(from, to) {
    if (!this.isValidMove(from, to)) {
      console.warn(`MOVE_INVALID: ${this.lastInvalidReason}`);
      return false;
    }

    const piece  = this.get(from);
    const target = this.get(to);
    const dc     = to[1] - from[1];

    // castling rook move
    if (piece.toUpperCase() === 'K' && Math.abs(dc) === 2) {
      const row = from[0];
      if (dc === 2) {
        this.set([row,6], this.get([row,8])); this.set([row,8], '.');
      } else {
        this.set([row,4], this.get([row,1])); this.set([row,1], '.');
      }
    }

    // move piece
    this.set(to, piece);
    this.set(from, '.');

    // flag moved
    this._flagMoved(piece, from);

    // king capture
    if (target.toUpperCase() === 'K') {
      this.gameOver = true;
      this.winner   = this.turn;
    }

    this.turn = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
    return true;
  }

  // Helper methods (unchanged) ...
  _clearPath(start, end) { /* ... */ }
  _kingMoved(color) { /* ... */ }
  _rookMoved(color, side) { /* ... */ }
  _flagMoved(piece, from) { /* ... */ }
}

module.exports = Board;