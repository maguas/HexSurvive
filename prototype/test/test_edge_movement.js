import { GameManager } from '../scripts/game_manager.js';
import assert from 'assert';

const game = new GameManager();

// Mock resources for testing
game.resources.fuel = 10;

// 1. Initial Placement
// Place hero on Edge 0 of HQ (0,0)
game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
console.log("Hero placed at 0,0 Edge 0");

// 2. Valid Move: Same Tile, Adjacent Edge
// Move to Edge 1 of (0,0)
let result = game.moveHero(0, 0, 1);
console.log("Move to 0,0 Edge 1:", result);
assert.strictEqual(result.success, true, "Should be able to move to adjacent edge on same tile");
assert.strictEqual(game.hero.location.edgeIndex, 1, "Hero should be on Edge 1");
assert.strictEqual(game.resources.fuel, 9, "Should consume 1 fuel");

// 3. Valid Move: Neighbor Tile, Shared Vertex
// From Edge 1 of (0,0), we are at vertex between Edge 1 and Edge 2.
// Edge 1 is Bottom-Right.
// Neighbor at Edge 1 is (0,1).
// Let's try to move to Edge 0 of (0,1).
// Edge 0 of (0,1) connects to Top-Right vertex of (0,1).
// Edge 1 of (0,0) connects to Top-Left vertex of (0,1)?
// Let's check the logic in isValidMove.
// It checks if target is in the list of 4 connected edges.

// Let's try to move to Edge 2 of (0,0) (Next edge)
result = game.moveHero(0, 0, 2);
console.log("Move to 0,0 Edge 2:", result);
assert.strictEqual(result.success, true);

// 4. Invalid Move: Non-adjacent
result = game.moveHero(0, 0, 4);
console.log("Move to 0,0 Edge 4 (Invalid):", result);
assert.strictEqual(result.success, false);

// 5. Valid Move: Neighbor Tile
// We are at (0,0) Edge 2 (Bottom).
// Neighbor is (0,1) (South-East? No, Edge 2 is Bottom-Left? Let's check getNeighbor)
// Edge 0: (+1, 0)
// Edge 1: (0, +1)
// Edge 2: (-1, +1)
// So Neighbor is (-1, 1).
// Shared edge on Neighbor is (2+3)%6 = 5.
// Connected edges on Neighbor are 4 and 0.
// Let's try moving to (-1, 1) Edge 4.
result = game.moveHero(-1, 1, 4);
console.log("Move to -1,1 Edge 4:", result);
assert.strictEqual(result.success, true);

console.log("All tests passed!");
