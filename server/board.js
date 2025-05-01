// server/board.js
// Enhanced with king one-step moves, castling, game-over detection, detailed invalid move reasons, capture graveyard, and checkmate/stalemate logic
class Board {
  constructor() {
    this.reset();
  }

  reset() {
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
    this.graveyard = { WHITE: [], BLACK: [] };
    this.turn = 'WHITE';
    this.whiteKingMoved = false;
    this.whiteKingRookMoved = false;
    this.whiteQueenRookMoved = false;
    this.blackKingMoved = false;
    this.blackKingRookMoved = false;
    this.blackQueenRookMoved = false;
    this.gameOver = false;
    this.winner = null;
    this.lastInvalidReason = null;
  }

  get([r, c]) { return this.grid[r - 1][c - 1]; }
  set([r, c], v) { this.grid[r - 1][c - 1] = v; }

  _validatePawn(from, to, piece, dr, dc, isCapture) {
    const dir = piece === 'P' ? -1 : +1;
    const startRow = piece === 'P' ? 7 : 2;
    if (!isCapture && dc === 0 && dr === dir) return true;
    if (!isCapture && dc === 0 && dr === 2 * dir && from[0] === startRow && this.get([from[0] + dir, from[1]]) === '.') return true;
    if (isCapture && Math.abs(dc) === 1 && dr === dir) return true;
    return false;
  }

  _validateKnight(dr, dc) {
    return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
  }

  _validateKing(from, to, dr, dc) {
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
    return false;
  }

  _validateSliding(from, to, dr, dc, allowedDirs) {
    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);
    const isDiagonal = Math.abs(dr) === Math.abs(dc);
    const isStraight = (dr === 0 || dc === 0);
    if (isDiagonal && !allowedDirs.includes('B')) return false;
    if (isStraight && !allowedDirs.includes('R')) return false;
    let [r, c] = [from[0] + stepR, from[1] + stepC];
    while (r !== to[0] || c !== to[1]) {
      if (this.get([r, c]) !== '.') return false;
      r += stepR; c += stepC;
    }
    return true;
  }

  isValidMove(from, to) {
    this.lastInvalidReason = null;
    if (from[0] < 1 || from[0] > 8 || from[1] < 1 || from[1] > 8 || to[0] < 1 || to[0] > 8 || to[1] < 1 || to[1] > 8) {
      this.lastInvalidReason = 'Move out of board bounds'; return false;
    }
    const piece = this.get(from);
    const target = this.get(to);
    if (piece === '.') { this.lastInvalidReason = 'No piece at source square'; return false; }
    const isWhite = piece === piece.toUpperCase();
    if ((this.turn === 'WHITE') !== isWhite) {
      this.lastInvalidReason = `It is not your turn (${this.turn})`; return false;
    }
    if (target !== '.' && (target === target.toUpperCase()) === isWhite) {
      this.lastInvalidReason = 'Cannot capture your own piece'; return false;
    }
    const dr = to[0] - from[0];
    const dc = to[1] - from[1];
    const isCapture = target !== '.';

    let ok = false;
    switch (piece.toUpperCase()) {
      case 'P': ok = this._validatePawn(from, to, piece, dr, dc, isCapture); if (!ok) this.lastInvalidReason = 'Illegal pawn move'; break;
      case 'N': ok = this._validateKnight(dr, dc); if (!ok) this.lastInvalidReason = 'Illegal knight move'; break;
      case 'K': ok = this._validateKing(from, to, dr, dc); if (!ok) this.lastInvalidReason = 'Illegal king move'; break;
      case 'B': ok = this._validateSliding(from, to, dr, dc, ['B']); if (!ok) this.lastInvalidReason = 'Illegal bishop move'; break;
      case 'R': ok = this._validateSliding(from, to, dr, dc, ['R']); if (!ok) this.lastInvalidReason = 'Illegal rook move'; break;
      case 'Q': ok = this._validateSliding(from, to, dr, dc, ['R','B']); if (!ok) this.lastInvalidReason = 'Illegal queen move'; break;
      default: this.lastInvalidReason = `No rule for piece '${piece}'`;
    }
    return ok;
  }

  move(from, to) {
    if (!this.isValidMove(from, to)) return false;
    const piece = this.get(from);
    const target = this.get(to);
    if (target !== '.') {
      const capturedColor = target === target.toUpperCase() ? 'WHITE' : 'BLACK';
      this.graveyard[capturedColor].push(target);
    }
    this.set(to, piece);
    this.set(from, '.');
    if (target.toUpperCase() === 'K') {
      this.gameOver = true;
      this.winner = this.turn;
    }
    const enemy = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
    this.turn = enemy;
    this.isCheckmateOrStalemate();
    return true;
  }

  findKing(color) {
    const k = color === 'WHITE' ? 'K' : 'k';
    for (let r = 1; r <= 8; r++) for (let c = 1; c <= 8; c++) if (this.get([r, c]) === k) return [r, c];
    return null;
  }

  isInCheck(color) {
    const king = this.findKing(color);
    if (!king) return false;
    const enemy = color === 'WHITE' ? 'BLACK' : 'WHITE';
    for (let r = 1; r <= 8; r++) {
      for (let c = 1; c <= 8; c++) {
        const piece = this.get([r, c]);
        if (piece === '.' || (piece === piece.toUpperCase()) === (color === 'WHITE')) continue;
        const saved = this.turn; this.turn = enemy;
        const valid = this.isValidMove([r, c], king);
        this.turn = saved;
        if (valid) return true;
      }
    }
    return false;
  }

  hasLegalMoves(color) {
    for (let r1 = 1; r1 <= 8; r1++) {
      for (let c1 = 1; c1 <= 8; c1++) {
        const piece = this.get([r1, c1]);
        if (piece === '.' || (piece === piece.toUpperCase()) !== (color === 'WHITE')) continue;
        for (let r2 = 1; r2 <= 8; r2++) {
          for (let c2 = 1; c2 <= 8; c2++) {
            const clone = new Board();
            clone.grid = JSON.parse(JSON.stringify(this.grid));
            clone.turn = color;
            if (clone.move([r1, c1], [r2, c2]) && !clone.isInCheck(color)) return true;
          }
        }
      }
    }
    return false;
  }

  isCheckmateOrStalemate() {
    if (!this.hasLegalMoves(this.turn)) {
      if (this.isInCheck(this.turn)) {
        this.gameOver = true;
        this.winner = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
        console.log(`[DEBUG] Checkmate! ${this.winner} wins`);
      } else {
        this.gameOver = true;
        this.winner = null;
        console.log(`[DEBUG] Stalemate! It's a draw.`);
      }
      return true;
    }
    return false;
  }
}

module.exports = Board;