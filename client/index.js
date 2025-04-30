// client/index.js
const net      = require('net');
const readline = require('readline');

const HOST = 'localhost';
const PORT = 5555;

let username = '';
let myColor  = '';   // will become 'WHITE' or 'BLACK'

const socket = net.connect(PORT, HOST, () => {
  console.log(`♟️  Connected to server at ${HOST}:${PORT}`);
});

// ——— graceful error & close handling ———
socket.on('error', err => {
  console.error(`⚠️  Connection error: ${err.message}`);
});

socket.on('close', hadError => {
  console.log(`🔌 Disconnected from server${hadError ? ' (due to error)' : ''}`);
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

// Step 1: ask for your name
socket.on('connect', () => {
  rl.question('Enter username: ', name => {
    username = name.trim() || 'Guest';
    socket.write(JSON.stringify({ type: 'LOGIN', username }) + '\n');
    rl.setPrompt(`${username}> `);
    rl.prompt();
  });
});

// Step 2: handle every server message (supports multiple JSON per packet)
socket.on('data', raw => {
  const lines = raw.toString().split('\n').filter(l => l.trim());
  for (const line of lines) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch (e) {
      console.error('⚠️  Invalid JSON from server:', line);
      continue;
    }

    switch (msg.type) {
      case 'LOGIN_ACK':
        console.log(msg.success
          ? `✅ Logged in as ${username}. Waiting: ${msg.waitingCount}`
          : `❌ Login failed`);
        break;

      case 'LIST_WAITING_ACK':
        console.log('🕒 Waiting players:', msg.waiting.join(', ') || '<none>');
        break;

      case 'INCOMING_CHALLENGE':
        console.log(`⚔️  ${msg.from} challenged you!`);
        console.log(`Type "accept ${msg.from}" or "reject ${msg.from}"`);
        break;

      case 'CHALLENGE_ACK':
        console.log(`📨 ${msg.message}`);
        break;

      case 'CHALLENGE_REJECTED':
        console.log(`🚫 ${msg.from} rejected your challenge`);
        break;

      case 'GAME_START':
        myColor = msg.white === username ? 'WHITE' : 'BLACK';
        console.log(`🎉 Game start — WHITE: ${msg.white}, BLACK: ${msg.black}`);
        console.log(`👉 You are playing as ${myColor}`);
        break;

      case 'MOVE_ACK':
        console.log(`✅ You moved ${msg.from} → ${msg.to}`);
        break;

      case 'OPPONENT_MOVE':
        console.log(`👤 Opponent moved ${msg.from} → ${msg.to}`);
        break;

      case 'MOVE_INVALID':
        console.log(
          `❌ Invalid move ${msg.from} → ${msg.to}` +
          (msg.reason ? `  [Reason: ${msg.reason}]` : '')
        );
        break;

      case 'BOARD_UPDATE':
        console.log('\n📋 Current Board:');
        msg.board.forEach(row => console.log(' ' + row.join(' ')));
        console.log(
          `⏱️  Timers — White: ${msg.timers.white.toFixed(1)}s, ` +
          `Black: ${msg.timers.black.toFixed(1)}s`
        );
        console.log(`→ ${msg.turn} to move`);
        break;

      case 'GAME_OVER':
        console.log(`🏁 Game over! Winner: ${msg.winner}`);
        socket.end();
        rl.close();
        break;

      default:
        console.log('🔔 Unhandled message:', msg);
    }
  }

  rl.setPrompt(`${myColor || username}> `);
  rl.prompt();
});

// Step 3: single readline loop for all your commands
rl.on('line', line => {
  const input = line.trim();
  if (!input) return rl.prompt();

  const [cmd, ...args] = input.split(/\s+/);
  switch (cmd) {
    case 'help':
      console.log('Commands:\n' +
        '  list\n' +
        '  challenge <user>\n' +
        '  accept    <user>\n' +
        '  reject    <user>\n' +
        '  move r1 c1 r2 c2   (numeric)\n' +
        '  move a2 a4         (algebraic)\n' +
        '  quit');
      break;

    case 'list':
      socket.write(JSON.stringify({ type: 'LIST_WAITING' }) + '\n');
      break;

    case 'challenge':
      if (!args[0]) console.log('Usage: challenge <username>');
      else socket.write(JSON.stringify({ type: 'CHALLENGE', target: args[0] }) + '\n');
      break;

    case 'accept':
      if (!args[0]) console.log('Usage: accept <username>');
      else socket.write(JSON.stringify({ type: 'ACCEPT', from: args[0] }) + '\n');
      break;

    case 'reject':
      if (!args[0]) console.log('Usage: reject <username>');
      else socket.write(JSON.stringify({ type: 'REJECT', from: args[0] }) + '\n');
      break;

    case 'move': {
      const algRe = /^[a-h][1-8]$/i;
      if (args.length === 2 && algRe.test(args[0]) && algRe.test(args[1])) {
        const fileToCol = f => f.toLowerCase().charCodeAt(0) - 96;
        const rankToRow = r => 9 - parseInt(r, 10);
        const [f0, r0] = args[0].split('');
        const [f1, r1] = args[1].split('');
        socket.write(JSON.stringify({
          type: 'MOVE',
          from: [rankToRow(r0), fileToCol(f0)],
          to:   [rankToRow(r1), fileToCol(f1)]
        }) + '\n');
      } else if (args.length >= 4) {
        const [r1, c1, r2, c2] = args.map(n => parseInt(n, 10));
        socket.write(JSON.stringify({
          type: 'MOVE',
          from: [r1, c1],
          to:   [r2, c2]
        }) + '\n');
      } else {
        console.log('Usage: move r1 c1 r2 c2   or   move a2 a4');
      }
      break;
    }

    case 'quit':
      socket.end();
      rl.close();
      break;

    default:
      console.log(`Unknown command: "${cmd}"`);
  }

  rl.prompt();
});