// board_tests.js
// Silence Board debug output
['log', 'warn', 'error', 'table'].forEach(fn => console[fn] = () => {});

const assert = require('assert');
const Board  = require('./server/board');

function testPawnMoves() {
  const b = new Board();
  // White pawn double-step from a2 → a4
  assert(b.move([7,1], [5,1]), 'White pawn a2→a4 should be legal');
  // Turn flips to BLACK
  assert.strictEqual(b.turn, 'BLACK', 'Turn should flip to BLACK');
  // Black pawn single-step from a7 → a6
  assert(b.move([2,1], [3,1]), 'Black pawn a7→a6 should be legal');
}

function testIllegalPawn() {
  const b = new Board();
  // Pawn cannot move sideways
  assert(!b.move([7,1], [7,2]), 'Pawn cannot move sideways from a2→b2');
}

function testKnightMoves() {
  const b = new Board();
  // White knight from b1 → c3
  assert(b.move([8,2], [6,3]), 'Knight b1→c3 should be legal');
  // Knight cannot move straight
  assert(!b.move([6,3], [6,4]), 'Knight cannot move straight from c3→d3');
}

function testCaptureAndGraveyard() {
  const b = new Board();
  // Move white pawn out, black pawn out
  b.move([7,1], [5,1]); // a2→a4
  b.move([2,2], [4,2]); // b7→b5
  // White pawn captures black pawn
  assert(b.move([5,1], [4,2]), 'Pawn a4 captures pawn on b5');
  // Check graveyard
  assert.deepStrictEqual(b.graveyard.BLACK, ['p'], 'Black pawn should be recorded in graveyard');
}

function runAll() {
  console.log('• Pawn moves…');             testPawnMoves();              console.log('  ✔');
  console.log('• Illegal pawn moves…');     testIllegalPawn();            console.log('  ✔');
  console.log('• Knight moves…');            testKnightMoves();            console.log('  ✔');
  console.log('• Capture & graveyard…');     testCaptureAndGraveyard();    console.log('  ✔');
  console.log('✅ All board tests passed!');
}

runAll();