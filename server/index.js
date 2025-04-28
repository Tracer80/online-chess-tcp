// server/index.js
const net = require('net');
const PORT = 5555;

const clients = [];  // { username, socket }

const server = net.createServer((socket) => {
  console.log('Client connected:', socket.remoteAddress);

  socket.on('data', data => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
      let msg;
      try { msg = JSON.parse(line); }
      catch (err) { console.warn('Invalid JSON:', line); continue; }

      switch (msg.type) {
        case 'LOGIN': {
          socket.username = msg.username;
          clients.push({ username: msg.username, socket });
          console.log(`→ ${msg.username} logged in`);
          socket.write(
            JSON.stringify({
              type: 'LOGIN_ACK',
              success: true,
              waitingCount: clients.length - 1
            }) + '\n'
          );
          break;
        }

        case 'LIST_WAITING': {
          const waiting = clients
            .filter(c => c.socket !== socket)
            .map(c => c.username);
          socket.write(
            JSON.stringify({ type: 'LIST_WAITING_ACK', waiting }) + '\n'
          );
          break;
        }

        case 'CHALLENGE': {
          const challenger = socket.username;
          const targetEntry = clients.find(c => c.username === msg.target);
          if (!targetEntry) {
            socket.write(
              JSON.stringify({
                type: 'CHALLENGE_ACK',
                success: false,
                message: `User ${msg.target} not found`
              }) + '\n'
            );
          } else {
            // notify challenger
            socket.write(
              JSON.stringify({
                type: 'CHALLENGE_ACK',
                success: true,
                message: `Challenge sent to ${msg.target}`
              }) + '\n'
            );
            // notify target
            targetEntry.socket.write(
              JSON.stringify({
                type: 'INCOMING_CHALLENGE',
                from: challenger
              }) + '\n'
            );
          }
          break;
        }

        case 'ACCEPT': {
          const accepter = socket.username;
          const fromEntry = clients.find(c => c.username === msg.from);
        
          console.log(`🔔 ACCEPT received: ${accepter} is accepting a challenge from ${msg.from}`);
        
          if (!fromEntry) {
            console.warn(`User ${msg.from} not found for ACCEPT`);
            break;
          }
        
          // decide colors once
          const white = Math.random() < 0.5 ? fromEntry.username : accepter;
          const black = white === fromEntry.username ? accepter : fromEntry.username;
        
          // log the assignment
          console.log(`♟️ Game start between [${fromEntry.username}] and [${accepter}]: WHITE=${white}, BLACK=${black}`);
        
          // notify both players
          const startMsg = JSON.stringify({
            type: 'GAME_START',
            white,
            black
          }) + '\n';
        
          fromEntry.socket.write(startMsg);
          socket.write(startMsg);
          break;
        }
        

        case 'REJECT': {
          const rejecter = socket.username;
          const fromEntry = clients.find(c => c.username === msg.from);
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

        default:
          console.warn('Unhandled message type:', msg.type);
      }
    }
  });

  socket.on('close', () => {
    const idx = clients.findIndex(c => c.socket === socket);
    if (idx !== -1) clients.splice(idx, 1);
    console.log('Client disconnected:', socket.username || socket.remoteAddress);
  });
});

server.listen(PORT, () => {
  console.log(`♟️  ChessServer listening on port ${PORT}`);
});