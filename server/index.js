/// server/index.js
const net = require('net');
const SessionManager = require('./manager');
const PORT = 5555;

const mgr = new SessionManager();

const server = net.createServer(socket => {
  console.log('Client connected:', socket.remoteAddress);

  socket.on('data', data => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      let msg;
      try { msg = JSON.parse(line); }
      catch {
        console.warn('Invalid JSON:', line);
        continue;
      }

      switch (msg.type) {
        case 'LOGIN': {
          socket.username = msg.username;
          mgr.addClient(msg.username, socket);
          console.log(`→ ${msg.username} logged in`);
          socket.write(
            JSON.stringify({
              type: 'LOGIN_ACK',
              success: true,
              waitingCount: mgr.listWaiting(socket).length
            }) + '\n'
          );
          break;
        }

        case 'LIST_WAITING': {
          socket.write(
            JSON.stringify({
              type: 'LIST_WAITING_ACK',
              waiting: mgr.listWaiting(socket)
            }) + '\n'
          );
          break;
        }

        case 'CHALLENGE': {
          const challenger = socket.username;
          const targetEntry = mgr.findClient(msg.target);
          if (!targetEntry) {
            socket.write(
              JSON.stringify({
                type: 'CHALLENGE_ACK',
                success: false,
                message: `User ${msg.target} not found`
              }) + '\n'
            );
          } else {
            socket.write(
              JSON.stringify({
                type: 'CHALLENGE_ACK',
                success: true,
                message: `Challenge sent to ${msg.target}`
              }) + '\n'
            );
            targetEntry.socket.write(
              JSON.stringify({ type: 'INCOMING_CHALLENGE', from: challenger }) + '\n'
            );
          }
          break;
        }

        case 'ACCEPT': {
          const accepter = socket.username;
          const fromName = msg.from;
          const white = Math.random() < 0.5 ? fromName : accepter;
          const black = white === fromName ? accepter : fromName;
          const session = mgr.startSession(white, black);
          if (session) {
            const startMsg =
              JSON.stringify({ type: 'GAME_START', white, black }) + '\n';
            session.white.socket.write(startMsg);
            session.black.socket.write(startMsg);
            console.log(`♟️  Session started: White=${white}, Black=${black}`);
          }
          break;
        }

        case 'REJECT': {
          const rejecter = socket.username;
          const fromName = msg.from;
          const fromEntry = mgr.findClient(fromName);
          if (fromEntry) {
            fromEntry.socket.write(
              JSON.stringify({
                type: 'CHALLENGE_REJECTED',
                from: rejecter
              }) + '\n'
            );
          }
          break;
        }

        case 'MOVE': {
          const session = mgr.findSession(socket);
          if (session) {
            session.handleMove(socket, msg.from, msg.to);

            // if the move ended the game, notify both players
            if (session.board.gameOver) {
              const overMsg = JSON.stringify({
                type: 'GAME_OVER',
                winner: session.board.winner
              }) + '\n';
              session.white.socket.write(overMsg);
              session.black.socket.write(overMsg);
            }
          }
          break;
        }

        default:
          console.warn('Unhandled message type:', msg.type);
      }
    }
  });

  socket.on('close', () => {
    console.log('Client disconnected:', socket.username || socket.remoteAddress);
    mgr.removeClient(socket);
  });
});

server.listen(PORT, () => {
  console.log(`♟️  ChessServer listening on port ${PORT}`);
});