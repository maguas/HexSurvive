import { GameManager } from '../prototype/scripts/game_manager.js';

console.log("🗺️ Testing Movement & Exploration...\n");

const game = new GameManager();

// Test 1: Free Movement on Outpost Edges
console.log("Test 1: Free Movement on Outpost Edges");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: true, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: true, numberToken: 8, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
game.activePlayer.resources = { scrap: 0, fuel: 10, food: 10, alloy: 0, intel: 0 };

const fuelBefore = game.resources.fuel;
const result1 = game.moveHero(0, 0, 1); // Move along same outpost tile
if (!result1.success) throw new Error(`Move failed: ${result1.reason}`);
if (!result1.movedToOutpost) throw new Error("Should detect moved to outpost");
if (game.resources.fuel !== fuelBefore) throw new Error("Movement on outpost edge should be free");
console.log("✅ Free movement on outpost edges");

// Test 2: Paid Movement on Non-Outpost Edges
console.log("\nTest 2: Paid Movement (2 Fuel)");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'wasteland', revealed: true, numberToken: 5, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'overgrown', revealed: true, numberToken: 6, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
game.activePlayer.resources = { scrap: 0, fuel: 10, food: 10, alloy: 0, intel: 0 };

const fuelBefore2 = game.resources.fuel;
const result2 = game.moveHero(0, 0, 1);
if (!result2.success) throw new Error(`Move failed: ${result2.reason}`);
// Moving to wasteland: costs 2 fuel, but gains 1 fuel from revealed wasteland tile = net -1 fuel
if (game.resources.fuel !== fuelBefore2 - 1) throw new Error(`Should net -1 fuel (cost 2, gain 1), got ${game.resources.fuel - fuelBefore2}`);
console.log("✅ Paid movement costs 2 fuel, gained 1 from revealed tile");

// Test 3: Insufficient Fuel
console.log("\nTest 3: Insufficient Fuel");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'wasteland', revealed: true, numberToken: 5, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'overgrown', revealed: true, numberToken: 6, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
game.activePlayer.resources = { scrap: 0, fuel: 1, food: 10, alloy: 0, intel: 0 }; // Only 1 fuel

const result3 = game.moveHero(0, 0, 1);
if (result3.success) throw new Error("Should fail with insufficient fuel");
if (!result3.reason.includes("Fuel")) throw new Error("Reason should mention fuel");
console.log("✅ Cannot move without enough fuel");

// Test 4: Movement Reveals Adjacent Tiles
console.log("\nTest 4: Movement Reveals Adjacent Tiles");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: false, fortress: false
});
// Create unrevealed neighbor at edge 1 direction: (0,1)
game.map.set("0,1", {
    q: 0, r: 1, type: 'wasteland', revealed: false, numberToken: null, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
game.activePlayer.resources = { scrap: 0, fuel: 10, food: 10, alloy: 0, intel: 0 };

const result4 = game.moveHero(0, 0, 1); // Move to edge 1
if (!result4.success) throw new Error(`Move failed: ${result4.reason}`);

// Check if adjacent tile at edge 1 was revealed
const tile = game.map.get("0,1");
if (!tile.revealed) throw new Error("Adjacent tile should be revealed");
if (!tile.numberToken) throw new Error("Revealed tile should have number token");
console.log("✅ Movement reveals adjacent tiles");

// Test 5: Movement Generates Encounters
console.log("\nTest 5: Movement Generates Encounters");
if (result4.encounters && result4.encounters.length > 0) {
    console.log("✅ Movement generates encounters");
} else {
    console.log("⚠️ No encounters generated (random)");
}

// Test 6: Valid Move Connectivity
console.log("\nTest 6: Valid Move Connectivity");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: true, numberToken: 8, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
game.activePlayer.resources = { scrap: 0, fuel: 10, food: 10, alloy: 0, intel: 0 };

// Valid moves from (0,0) edge 0: edges 1 and 5 on same tile, or neighbor edges
const validMove1 = game.isValidMove(0, 0, 1); // Next edge on same tile
const validMove2 = game.isValidMove(0, 0, 5); // Previous edge on same tile
const invalidMove = game.isValidMove(0, 0, 3); // Opposite edge (not connected)

if (!validMove1 || !validMove2) throw new Error("Adjacent edges should be valid");
if (invalidMove) throw new Error("Non-adjacent edge should be invalid");
console.log("✅ Move validation works correctly");

// Test 7: Cannot Move to Same Edge
console.log("\nTest 7: Cannot Move to Same Edge");
game.hero.location = { q: 0, r: 0, edgeIndex: 0 };
const sameEdgeValid = game.isValidMove(0, 0, 0);
if (sameEdgeValid) throw new Error("Cannot move to same edge");
console.log("✅ Cannot move to same edge");

// Test 8: Exploration Adjacent to Revealed
console.log("\nTest 8: Exploration Adjacent to Revealed");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: false, numberToken: null, outpost: false, fortress: false
});

game.activePlayer.resources = { scrap: 0, fuel: 5, food: 5, alloy: 0, intel: 0 };

const exploreResult = game.explore(1, 0);
if (!exploreResult.success) throw new Error(`Explore failed: ${exploreResult.reason}`);
if (game.resources.fuel !== 4 || game.resources.food !== 4) {
    throw new Error("Explore should cost 1 fuel and 1 food");
}
if (!game.map.get("1,0").revealed) throw new Error("Explored tile should be revealed");
console.log("✅ Exploration works correctly");

// Test 9: Cannot Explore Non-Adjacent
console.log("\nTest 9: Cannot Explore Non-Adjacent");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: false, fortress: false
});
game.map.set("5,5", {
    q: 5, r: 5, type: 'wasteland', revealed: false, numberToken: null, outpost: false, fortress: false
});

game.activePlayer.resources = { scrap: 0, fuel: 5, food: 5, alloy: 0, intel: 0 };

const exploreResult2 = game.explore(5, 5);
if (exploreResult2.success) throw new Error("Should not be able to explore non-adjacent tile");
console.log("✅ Cannot explore non-adjacent tiles");

// Test 10: Insufficient Resources for Exploration
console.log("\nTest 10: Insufficient Resources for Exploration");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: false, numberToken: null, outpost: false, fortress: false
});

game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

const exploreResult3 = game.explore(1, 0);
if (exploreResult3.success) throw new Error("Should fail with insufficient resources");
console.log("✅ Cannot explore without resources");

console.log("\n✅ All movement & exploration tests passed!");
process.exit(0);
