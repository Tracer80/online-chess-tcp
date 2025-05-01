// bots.js — minimal bot client, makes basic legal-looking moves until one king is gone

const net = require('net');
const HOST = 'localhost';
const PORT = 5555;

class Bot {
  constructor(name, opponent) {
    this.name = name;
    this.opponent = opponent;
    this.color = '';
    this.socket = null;
  }

  connect() {
    this.socket = net.connect(PORT, HOST, () => {
      console.log(`[${this.name}] Connected`);
      this.send({ type: 'LOGIN', username: this.name });
    });

    this.socket.on('data', raw => {
      raw.toString().split('\n').filter(l => l.trim()).forEach(line => {
        let msg;
        try { msg = JSON.parse(line); } catch { return; }
        this.handle(msg);
      });
    });

    this.socket.on('error', err =>
      console.error(`[${this.name}] Error:`, err.message)
    );

    this.socket.on('close', () =>
      console.log(`[${this.name}] Disconnected`)
    );
  }

  send(obj) {
    this.socket.write(JSON.stringify(obj) + '\n');
  }

  handle(msg) {
    if (msg.type === 'LOGIN_ACK' && this.name === 'BotA') {
      setTimeout(() => this.send({ type: 'CHALLENGE', target: this.opponent }), 300);
    }

    if (msg.type === 'INCOMING_CHALLENGE') {
      this.send({ type: 'ACCEPT', from: msg.from });
    }

    if (msg.type === 'GAME_START') {
      this.color = msg.white === this.name ? 'WHITE' : 'BLACK';
    }

    if (msg.type === 'BOARD_UPDATE' && msg.turn === this.color) {
      if (isGameOver(msg.board)) {
        console.log(`[${this.name}] King missing — stopping`);
        this.socket.end();
      } else {
        this.makeMove(msg.board);
      }
    }

    if (msg.type === 'GAME_OVER') {
      console.log(`[${this.name}] GAME_OVER — winner: ${msg.winner}`);
      this.socket.end();
    }
  }

  makeMove(board) {
    const myPieces = this.color === 'WHITE' ? 'PRNBQK' : 'prnbqk';

    for (let i = 0; i < 100; i++) {
      const from = [rand(), rand()];
      const to   = [rand(), rand()];
      const piece = board?.[from[0] - 1]?.[from[1] - 1] || '.';

      if (myPieces.includes(piece)) {
        console.log(`[${this.name}] → MOVE ${from} → ${to}`);
        this.send({ type: 'MOVE', from, to });
        return;
      }
    }

    console.log(`[${this.name}] Could not find a move`);
  }
}

function rand() {
  return Math.floor(Math.random() * 8) + 1;
}

function isGameOver(board) {
  const flat = board.flat();
  return !(flat.includes('K') && flat.includes('k'));
}

const botA = new Bot('BotA', 'BotB');
const botB = new Bot('BotB', 'BotA');

botA.connect();
setTimeout(() => botB.connect(), 100);