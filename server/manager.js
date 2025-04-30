// server/manager.js
const GameSession = require('./session');

class SessionManager {
  constructor() {
    this.clients = [];    // { username, socket }
    this.sessions = [];   // GameSession[]
  }

  addClient(username, socket) {
    this.clients.push({ username, socket });
  }

  removeClient(socket) {
    this.clients = this.clients.filter(c => c.socket !== socket);
    // TODO: tear down sessions involving this socket if needed
  }

  listWaiting(socket) {
    return this.clients
      .filter(c => c.socket !== socket)
      .map(c => c.username);
  }

  findClient(username) {
    return this.clients.find(c => c.username === username);
  }

  startSession(whiteName, blackName) {
    const white = this.findClient(whiteName);
    const black = this.findClient(blackName);
    if (!white || !black) return null;

    const session = new GameSession(white, black);
    this.sessions.push(session);
    return session;
  }

  findSession(socket) {
    return this.sessions.find(s =>
      s.white.socket === socket || s.black.socket === socket
    );
  }
}

module.exports = SessionManager;