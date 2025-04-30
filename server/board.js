// server/board.js
class Board {
    constructor() { this.reset(); }
  
    reset() {
      // 8×8 grid, row 1 is Black’s back rank, row 8 is White’s
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
    }
  
    get([r, c]) {
      return this.grid[r-1][c-1];
    }
  
    set([r, c], piece) {
      this.grid[r-1][c-1] = piece;
    }
  
    isValidMove(from, to) {
      // stub: you’ll replace this with real chess rules later
      const piece = this.get(from);
      return piece !== '.';
    }
  
    move(from, to) {
      if (!this.isValidMove(from, to)) return false;
      const piece = this.get(from);
      this.set(to, piece);
      this.set(from, '.');
      this.turn = this.turn === 'WHITE' ? 'BLACK' : 'WHITE';
      return true;
    }
  }
  
  module.exports = Board;  