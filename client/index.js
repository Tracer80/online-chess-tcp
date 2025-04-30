// client/index.js
const net = require('net');
const readline = require('readline');

const HOST = 'localhost';
const PORT = 5555;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const socket = net.connect(PORT, HOST, () => {
  console.log(`♟️  Connected to server at ${HOST}:${PORT}`);
  rl.question('Enter username: ', name => {
    socket.write(JSON.stringify({ type: 'LOGIN', username: name }) + '\n');
  });
});

socket.on('data', data => {
  const msg = JSON.parse(data.toString());
  console.log('SERVER ➜', msg);

  switch (msg.type) {
    case 'LOGIN_ACK':
      if (msg.success) {
        console.log(`✅ Logged in! ${msg.waitingCount} waiting.`);
        promptCommand();
      }
      break;

    case 'LIST_WAITING_ACK':
      console.log('🕒 Waiting players:', msg.waiting.join(', ') || '<none>');
      promptCommand();
      break;

    case 'INCOMING_CHALLENGE':
      console.log(`⚔️  ${msg.from} challenged you!`);
      console.log(`Type "accept ${msg.from}" or "reject ${msg.from}"`);
      promptCommand();
      break;

    case 'CHALLENGE_ACK':
      console.log(`📨 ${msg.message}`);
      promptCommand();
      break;

    case 'CHALLENGE_REJECTED':
      console.log(`🚫 ${msg.from} rejected your challenge`);
      promptCommand();
      break;

    case 'GAME_START':
      console.log(
        `🎉 Game starting - WHITE: ${msg.white}, BLACK: ${msg.black}`
      );
      promptCommand();
      break;

    case 'MOVE_ACK':
      console.log(`✅ You moved from ${msg.from} → ${msg.to}`);
      promptCommand();
      break;

    case 'OPPONENT_MOVE':
      console.log(`👤 Opponent moved from ${msg.from} → ${msg.to}`);
      promptCommand();
      break;

    case 'BOARD_UPDATE':
      console.log('\n📋 Current Board:');
      msg.board.forEach(row => console.log(' ' + row.join(' ')));
      console.log(
        `⏱️  Timers — White: ${msg.timers.white.toFixed(1)}s, ` +
        `Black: ${msg.timers.black.toFixed(1)}s`
      );
      console.log(`Next turn: ${msg.turn}\n`);
      promptCommand();
      break;

    case 'MOVE_INVALID':
      console.log('❌ Invalid move:', msg.from, '→', msg.to);
      promptCommand();
      break;

    default:
      // Unknown or unhandled message
      promptCommand();
  }
});

socket.on('end', () => console.log('Disconnected from server'));

function promptCommand() {
  rl.question('\n> ', line => {
    const parts = line.trim().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];

    switch (cmd) {
      case 'list':
        socket.write(JSON.stringify({ type: 'LIST_WAITING' }) + '\n');
        break;

      case 'challenge':
        socket.write(JSON.stringify({
          type: 'CHALLENGE',
          target: arg
        }) + '\n');
        break;

      case 'accept':
        socket.write(JSON.stringify({
          type: 'ACCEPT',
          from: arg
        }) + '\n');
        break;

      case 'reject':
        socket.write(JSON.stringify({
          type: 'REJECT',
          from: arg
        }) + '\n');
        break;

      case 'move':
        // syntax: move r1 c1 r2 c2
        const [, r1, c1, r2, c2] = parts;
        socket.write(JSON.stringify({
          type: 'MOVE',
          from: [parseInt(r1, 10), parseInt(c1, 10)],
          to:   [parseInt(r2, 10), parseInt(c2, 10)]
        }) + '\n');
        break;

      case 'quit':
        socket.end();
        rl.close();
        return;

      default:
        console.log(`Unknown command: ${cmd}`);
    }

    // loop back for next command
    promptCommand();
  });
}
