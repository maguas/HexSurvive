import { GameManager } from '../scripts/game_manager.js';

console.log("🏰 Testing Fortress Upgrade...");

const game = new GameManager();
game.initGame();

// Mock resources
game.resources = { scrap: 10, fuel: 10, food: 10, alloy: 10, intel: 10 };

// Reveal tile 1,0
game.map.set("1,0", { revealed: true, type: 'ruins', outpost: false, fortress: false });

// Build Outpost
console.log("Building Outpost...");
const buildResult = game.buildOutpost(1, 0);
if (!buildResult.success) {
    console.error("❌ Build Outpost failed");
    process.exit(1);
}

if (game.victoryPoints !== 1) {
    console.error("❌ VP should be 1");
    process.exit(1);
}

// Upgrade to Fortress
console.log("Upgrading to Fortress...");
const upgradeResult = game.upgradeToFortress(1, 0);

if (!upgradeResult.success) {
    console.error("❌ Upgrade Fortress failed", upgradeResult.reason);
    process.exit(1);
}

const tile = game.map.get("1,0");
if (!tile.fortress) {
    console.error("❌ Tile should be fortress");
    process.exit(1);
}

if (game.victoryPoints !== 2) {
    console.error("❌ VP should be 2");
    process.exit(1);
}

console.log("✅ Fortress Upgrade Verified!");
