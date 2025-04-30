// server/manager.js
const Board = require('./board');

class Session {
  constructor(whiteName, blackName, whiteSocket, blackSocket) {
    this.white = { name: whiteName, socket: whiteSocket };
    this.black = { name: blackName, socket: blackSocket };
    this.board = new Board();

    // initialize 5-minute clocks for each side
    this.timers = { white: 5 * 60, black: 5 * 60 };
    this.lastMoveTimestamp = Date.now();
  }

  handleMove(socket, from, to) {
    // update clock for the side that just moved
    const now = Date.now();
    const elapsed = (now - this.lastMoveTimestamp) / 1000;
    if (socket === this.white.socket) {
      this.timers.white = Math.max(0, this.timers.white - elapsed);
    } else {
      this.timers.black = Math.max(0, this.timers.black - elapsed);
    }
    this.lastMoveTimestamp = now;

    // perform the board move
    return this.board.move(from, to);
  }

  getTimers() {
    // include current running side in timing
    const now = Date.now();
    const elapsed = (now - this.lastMoveTimestamp) / 1000;
    const out = { ...this.timers };
    // subtract elapsed from the side whose turn it currently is
    if (this.board.turn === 'WHITE') {
      out.white = Math.max(0, out.white - elapsed);
    } else {
      out.black = Math.max(0, out.black - elapsed);
    }
    return out;
  }
}

class SessionManager {
  constructor() {
    this.clients = new Map();
    this.sessions = new Map();
  }

  addClient(username, socket) {
    this.clients.set(username, socket);
  }

  findClient(username) {
    const sock = this.clients.get(username);
    return sock ? { socket: sock, username } : null;
  }

  removeClient(socket) {
    for (const [user, sock] of this.clients.entries()) {
      if (sock === socket) {
        this.clients.delete(user);
        break;
      }
    }
  }

  listWaiting(socket) {
    // Return all usernames except the one in this socket
    const you = [...this.clients.entries()] 
      .find(([_, s]) => s === socket)?.[0];
    return Array.from(this.clients.keys()).filter(u => u !== you);
  }

  startSession(whiteName, blackName) {
    const whiteSocket = this.clients.get(whiteName);
    const blackSocket = this.clients.get(blackName);
    if (!whiteSocket || !blackSocket) return null;

    const sess = new Session(whiteName, blackName, whiteSocket, blackSocket);
    this.sessions.set(whiteSocket, sess);
    this.sessions.set(blackSocket, sess);
    return sess;
  }

  findSession(socket) {
    return this.sessions.get(socket) || null;
  }
}

module.exports = SessionManager;