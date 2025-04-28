// server/index.js
const net = require('net');
const PORT = 5555;

const clients = [];  
// will hold objects: { username: string, socket: Socket }

const server = net.createServer((socket) => {
  console.log('Client connected:', socket.remoteAddress);

  socket.on('data', data => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (err) {
      console.warn('Invalid JSON:', data.toString());
      return;
    }

    switch (msg.type) {
      case 'LOGIN':
        // store username + socket
        socket.username = msg.username;
        clients.push({ username: msg.username, socket });
        console.log(`→ ${msg.username} logged in`);
        socket.write(JSON.stringify({ 
          type: 'LOGIN_ACK', 
          success: true, 
          waitingCount: clients.length - 1 
        }));
        break;

      case 'LIST_WAITING':
        // all other clients who have logged in but not in a game
        const waiting = clients
          .filter(c => c.socket !== socket)
          .map(c => c.username);
        socket.write(JSON.stringify({
          type: 'LIST_WAITING_ACK',
          waiting
        }));
        break;

      default:
        console.warn('Unhandled message type:', msg.type);
    }
  });

  socket.on('close', () => {
    // remove from clients array
    const idx = clients.findIndex(c => c.socket === socket);
    if (idx !== -1) clients.splice(idx, 1);
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`♟️  ChessServer listening on port ${PORT}`);
});