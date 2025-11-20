import { GameManager } from '../scripts/game_manager.js';

const game = new GameManager();

console.log("=== Testing Initial Placement ===");
console.log("Initial phase:", game.phase);
console.log("Map size:", game.map.size);

// Test placing on center tile (0,0) edge 0
const result = game.handleInitialPlacement(0, 0, 0);

console.log("Placement result:", result);
console.log("New phase:", game.phase);
console.log("Hero location:", game.hero.location);
console.log("VP:", game.victoryPoints);

// Check if center tile has outpost
const centerTile = game.map.get('0,0');
console.log("Center tile:", centerTile);

if (result.success) {
    console.log("✅ Initial placement works!");
} else {
    console.log("❌ Initial placement failed:", result.reason);
}
