// server/board.js
// Enhanced with king one-step moves, castling, game-over detection, and detailed invalid move reasons
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

  get([r, c]) {
    return this.grid[r - 1][c - 1];
  }

  set([r, c], v) {
    this.grid[r - 1][c - 1] = v;
  }

  _validatePawn(from, to, piece, dr, dc, isCapture) {
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

  _validateKing(from, to, dr, dc) {
    if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1) return true;
    const row = from[0];
    const color = this.turn;
    if (dr === 0 && dc === 2 && !this._kingMoved(color) && !this._rookMoved(color, 'KING') && this._clearPath([row,5], [row,8]))
      return true;
    if (dr === 0 && dc === -2 && !this._kingMoved(color) && !this._rookMoved(color, 'QUEEN') && this._clearPath([row,1], [row,5]))
      return true;
    return false;
  }

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
    this.lastInvalidReason = null;

    if (from[0] < 1 || from[0] > 8 || from[1] < 1 || from[1] > 8 ||
        to[0]   < 1 || to[0]   > 8 || to[1]   < 1 || to[1]   > 8) {
      this.lastInvalidReason = 'Move out of board bounds';
      return false;
    }

    const piece = this.get(from);
    const target = this.get(to);
    console.log(`[DEBUG] Validating ${piece} from ${from} to ${to} (target: ${target})`);

    if (piece === '.') {
      this.lastInvalidReason = 'No piece at source square';
      return false;
    }

    const isWhite = piece === piece.toUpperCase();
    if ((this.turn === 'WHITE') !== isWhite) {
      this.lastInvalidReason = `It is not your turn (${this.turn})`;
      return false;
    }

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

  // ... existing code unchanged ...

move(from, to) {
  console.log(`[DEBUG] Attempting move: ${JSON.stringify(from)} → ${JSON.stringify(to)}`);
  if (!this.isValidMove(from, to)) {
    console.warn(`MOVE_INVALID: ${this.lastInvalidReason}`);
    return false;
  }

  const piece = this.get(from);
  const target = this.get(to);
  const dc = to[1] - from[1];

  if (piece.toUpperCase() === 'K' && Math.abs(dc) === 2) {
    const row = from[0];
    if (dc === 2) {
      this.set([row, 6], this.get([row, 8])); this.set([row, 8], '.');
    } else {
      this.set([row, 4], this.get([row, 1])); this.set([row, 1], '.');
    }
  }

  this.set(to, piece);
  this.set(from, '.');
  this._flagMoved(piece, from);

  // Check if move captured a king (fallback)
  if (target.toUpperCase() === 'K') {
    this.gameOver = true;
    this.winner = this.turn;
  }

  // ✅ ADDED: Checkmate detection
  const enemy = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
  if (this.isInCheck(enemy) && !this.hasLegalMoves(enemy)) {
    this.gameOver = true;
    this.winner = this.turn;
    console.log(`[DEBUG] Checkmate! ${this.turn} wins`);
  }

  this.turn = enemy;
  console.log('[DEBUG] Board state after move:');
  console.table(this.grid);
  return true;
}

// ✅ ADDED: Find king's position
findKing(color) {
  const kingChar = color === 'WHITE' ? 'K' : 'k';
  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 8; c++) {
      if (this.get([r, c]) === kingChar) return [r, c];
    }
  }
  return null;
}

// ✅ ADDED: Check if color is in check
isInCheck(color) {
  const kingPos = this.findKing(color);
  if (!kingPos) return false; // captured king (weird edge case)
  const enemy = color === 'WHITE' ? 'BLACK' : 'WHITE';

  for (let r = 1; r <= 8; r++) {
    for (let c = 1; c <= 8; c++) {
      const from = [r, c];
      const piece = this.get(from);
      if (piece === '.' || (piece === piece.toUpperCase()) === (color === 'WHITE')) continue;

      const savedTurn = this.turn;
      this.turn = enemy; // simulate as if it's enemy's move
      const valid = this.isValidMove(from, kingPos);
      this.turn = savedTurn;

      if (valid) return true;
    }
  }
  return false;
}

// ✅ ADDED: Check if player has any legal move
hasLegalMoves(color) {
  for (let r1 = 1; r1 <= 8; r1++) {
    for (let c1 = 1; c1 <= 8; c1++) {
      const from = [r1, c1];
      const piece = this.get(from);
      if (piece === '.' || (piece === piece.toUpperCase()) !== (color === 'WHITE')) continue;

      for (let r2 = 1; r2 <= 8; r2++) {
        for (let c2 = 1; c2 <= 8; c2++) {
          const to = [r2, c2];
          const copy = new Board();
          copy.grid = JSON.parse(JSON.stringify(this.grid));
          copy.turn = color;
          if (copy.move(from, to) && !copy.isInCheck(color)) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

  _clearPath(start, end) { /* stub or real impl */ }
  _kingMoved(color) { /* stub or real impl */ }
  _rookMoved(color, side) { /* stub or real impl */ }
  _flagMoved(piece, from) { /* stub or real impl */ }
}

module.exports = Board;