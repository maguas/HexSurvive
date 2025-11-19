import { GameManager } from '../scripts/game_manager.js';
import assert from 'assert';

const game = new GameManager();

// 1. Verify Map Generation
console.log("Map size:", game.map.size);
assert.ok(game.map.size > 1, "Map should have tiles");
// Radius 3 hex grid size = 3*3*(3+1) + 1 = 37 tiles?
// Formula: 3n(n+1) + 1. 3*3*4 + 1 = 37. Correct.
assert.strictEqual(game.map.size, 37, "Should have 37 tiles for radius 3");

// 2. Verify Hidden
for (const tile of game.map.values()) {
    assert.strictEqual(tile.revealed, false, "All tiles should be hidden initially");
}

// 3. Verify Phase
assert.strictEqual(game.phase, 'setup', "Phase should be setup");

// 4. Initial Placement
// Place on Edge 0 of (0,0)
const result = game.handleInitialPlacement(0, 0, 0);
console.log("Initial Placement:", result);
assert.strictEqual(result.success, true);

// 5. Verify State
const tile = game.map.get('0,0');
assert.strictEqual(tile.outpost, true, "Outpost should be placed");
assert.strictEqual(tile.revealed, true, "Tile should be revealed");
assert.strictEqual(game.hero.location.q, 0, "Hero q should be 0");
assert.strictEqual(game.hero.location.edgeIndex, 0, "Hero edge should be 0");

// Verify adjacent revealed
// Neighbor of (0,0) Edge 0 is (1,0)
const neighbor = game.map.get('1,0');
assert.strictEqual(neighbor.revealed, true, "Neighbor should be revealed");

// 6. Verify Phase Change
assert.strictEqual(game.phase, 'production', "Phase should be production");

console.log("All setup tests passed!");
