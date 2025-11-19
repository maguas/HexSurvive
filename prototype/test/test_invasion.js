import { GameManager } from '../scripts/game_manager.js';

console.log("🧪 Testing Invasion Logic...");

const game = new GameManager();
game.initGame();

// Mock map for testing
game.map.set("0,0", { revealed: true, alienPatrol: false });
game.map.set("1,0", { revealed: true, alienPatrol: false });

// Force resources > 7
game.resources = { scrap: 5, fuel: 5, food: 5, alloy: 0, intel: 0 };
console.log("Initial Resources:", game.resources);

// Trigger Invasion
console.log("Triggering Invasion...");
const result = game.handleInvasion();

console.log("Threat Level:", result.threatLevel);
console.log("Discarded:", result.discarded);
console.log("Needs Patrol Move:", result.needsPatrolMove);

if (result.needsPatrolMove !== true) {
    console.error("❌ FAILED: needsPatrolMove should be true");
    process.exit(1);
}

if (result.threatLevel !== 2) {
    console.error("❌ FAILED: Threat Level should be 2");
    process.exit(1);
}

// Test Move Patrol
console.log("Moving Patrol to 1,0...");
const moveResult = game.moveAlienPatrol(1, 0);

if (!moveResult.success) {
    console.error("❌ FAILED: Move Patrol failed", moveResult.reason);
    process.exit(1);
}

if (game.map.get("1,0").alienPatrol !== true) {
    console.error("❌ FAILED: Tile 1,0 should have alienPatrol");
    process.exit(1);
}

console.log("✅ Invasion Logic Verified!");
