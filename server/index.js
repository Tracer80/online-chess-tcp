// server/index.js
const net = require('net');
const PORT = 5555;

const clients = [];  
// will hold objects: { username: string, socket: Socket }

const server = net.createServer((socket) => {
  console.log('Client connected:', socket.remoteAddress);

  socket.on('data', data => {
    const text = data.toString();
    console.log('-- raw data:', JSON.stringify(text));

    // Split on newline in case multiple messages arrive together
    const lines = text.split('\n').filter(line => line.trim());
    for (const line of lines) {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (err) {
        console.warn('Invalid JSON:', line);
        continue;
      }

      switch (msg.type) {
        case 'LOGIN':
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

        case 'LIST_WAITING':
          const waiting = clients
            .filter(c => c.socket !== socket)
            .map(c => c.username);
          socket.write(
            JSON.stringify({
              type: 'LIST_WAITING_ACK',
              waiting
            }) + '\n'
          );
          break;

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