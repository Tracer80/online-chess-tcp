// client/index.js
const net = require('net');
const readline = require('readline');

const HOST = 'localhost';
const PORT = 5555;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const socket = net.connect(PORT, HOST, () => {
  console.log(`♟️  Connected to server at ${HOST}:${PORT}`);
  rl.question('Enter username: ', name => {
    socket.write(JSON.stringify({ type: 'LOGIN', username: name }));
  });
});

socket.on('data', data => {
  const msg = JSON.parse(data.toString());
  console.log('SERVER ➜', msg);

  switch (msg.type) {
    case 'LOGIN_ACK':
      if (msg.success) {
        console.log(`✅ Logged in! There are ${msg.waitingCount} people waiting.`);
        promptCommand();
      } else {
        console.log('❌ Login failed');
      }
      break;

    case 'LIST_WAITING_ACK':
      console.log('🕒 Waiting players:', msg.waiting.length
        ? msg.waiting.join(', ')
        : '<none>');
      promptCommand();
      break;

    default:
      console.log('🔔 Unhandled from server:', msg);
      promptCommand();
  }
});

socket.on('end', () => console.log('Disconnected from server'));

function promptCommand() {
  rl.question('\n> ', line => {
    const [ cmd, arg ] = line.trim().split(/\s+/);
    if (cmd === 'list') {
      socket.write(JSON.stringify({ type: 'LIST_WAITING' }));
    } else if (cmd === 'quit') {
      socket.end();
      rl.close();
      return;
    } else {
      console.log(`Unknown command: ${cmd}`);
    }
    // loop
    // further commands (challenge, move) will be added here later
  });
}