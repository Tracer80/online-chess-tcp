// server/session.js
const Board = require('./board');

class GameSession {
  constructor(whiteEntry, blackEntry) {
    this.white = whiteEntry;   // { username, socket }
    this.black = blackEntry;
    this.board = new Board();
    this.timers = { white: 0, black: 0 };
    this.lastTs = Date.now();
  }

  other(entry) {
    return entry.socket === this.white.socket ? this.black : this.white;
  }

  recordTime(socket) {
    const now = Date.now();
    const delta = (now - this.lastTs) / 1000;
    this.lastTs = now;
    const color = socket === this.white.socket ? 'white' : 'black';
    this.timers[color] += delta;
  }

  handleMove(socket, from, to) {
    this.recordTime(socket);

    if (!this.board.move(from, to)) {
      socket.write(
        JSON.stringify({ type: 'MOVE_INVALID', from, to }) + '\n'
      );
      return;
    }

    const update = {
      type: 'BOARD_UPDATE',
      board: this.board.grid,
      timers: this.timers,
      turn: this.board.turn
    };
    const msg = JSON.stringify(update) + '\n';

    this.white.socket.write(msg);
    this.black.socket.write(msg);
  }
}

module.exports = GameSession;