import { GameManager } from '../prototype/scripts/game_manager.js';

console.log("💎 Testing Resource Generation...\n");

const game = new GameManager();
game.map.clear();

// Test 1: Outpost Production Only
console.log("Test 1: Outpost Production (No Hero Adjacent)");
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6, outpost: true, fortress: false, ownerId: 1
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: true, numberToken: 8, outpost: true, fortress: false, ownerId: 1
});

// Place hero far away
game.hero.location = { q: 10, r: 10, edgeIndex: 0 };
game.map.set("10,10", { q: 10, r: 10, type: 'barren', revealed: true, outpost: false });
game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

const playerGains1 = game.harvest(6);
// Check player 1's gains (ownerId would be 1)
const player1 = game.players.find(p => p.id === 1);
if (player1.resources.scrap !== 1) throw new Error(`Expected 1 scrap from outpost, got ${player1.resources.scrap}`);
console.log("✅ Outpost produces without hero");

// Test 2: Hero Adjacent Production (No Outpost)
console.log("\nTest 2: Hero Adjacent Production (No Outpost)");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'overgrown', revealed: true, numberToken: 5, outpost: false, fortress: false
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'crash_site', revealed: true, numberToken: 5, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 }; // Edge 0 connects to (1,0)
game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

const playerGains2 = game.harvest(5);
// Check active player's resources
if (game.activePlayer.resources.food !== 1 || game.activePlayer.resources.alloy !== 1) {
    throw new Error(`Expected 1 food and 1 alloy from hero-adjacent tiles, got food=${game.activePlayer.resources.food}, alloy=${game.activePlayer.resources.alloy}`);
}
console.log("✅ Hero produces from both adjacent tiles");

// Test 3: Fortress Double Production
console.log("\nTest 3: Fortress Double Production");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'bunker', revealed: true, numberToken: 10, outpost: true, fortress: true, ownerId: 1
});

game.hero.location = { q: 5, r: 5, edgeIndex: 0 }; // Far away
game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

game.harvest(10);
if (game.activePlayer.resources.intel !== 2) throw new Error(`Expected 2 intel from fortress, got ${game.activePlayer.resources.intel}`);
console.log("✅ Fortress produces 2x resources");

// Test 4: Multiple Tiles Same Number
console.log("\nTest 5: Multiple Tiles Same Number");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 8, outpost: true, fortress: false, ownerId: 1
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'wasteland', revealed: true, numberToken: 8, outpost: true, fortress: false, ownerId: 1
});
game.map.set("-1,0", {
    q: -1, r: 0, type: 'overgrown', revealed: true, numberToken: 8, outpost: true, fortress: false, ownerId: 1
});

game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

game.harvest(8);
if (game.activePlayer.resources.scrap !== 1 || game.activePlayer.resources.fuel !== 1 || game.activePlayer.resources.food !== 1) {
    throw new Error(`Expected 1 of each resource, got scrap=${game.activePlayer.resources.scrap}, fuel=${game.activePlayer.resources.fuel}, food=${game.activePlayer.resources.food}`);
}
console.log("✅ Multiple tiles with same number produce");

// Test 6: Barren Tiles Don't Produce
console.log("\nTest 6: Barren Tiles Don't Produce");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'barren', revealed: true, numberToken: 6, outpost: true, fortress: false, ownerId: 1
});

game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

game.harvest(6);
const totalResources = Object.values(game.activePlayer.resources).reduce((a, b) => a + b, 0);
if (totalResources !== 0) throw new Error(`Expected 0 production from barren, got ${totalResources}`);
console.log("✅ Barren tiles don't produce");

// Test 7: Outpost + Hero Overlap (Should produce once)
console.log("\nTest 7: Outpost + Hero Overlap");
game.map.clear();
game.map.set("0,0", {
    q: 0, r: 0, type: 'crash_site', revealed: true, numberToken: 11, outpost: true, fortress: false, ownerId: 1
});
game.map.set("1,0", {
    q: 1, r: 0, type: 'bunker', revealed: true, numberToken: 11, outpost: false, fortress: false
});

game.hero.location = { q: 0, r: 0, edgeIndex: 0 }; // Hero on outpost tile
game.activePlayer.resources = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

game.harvest(11);
// Tile (0,0) has outpost AND hero - should produce 1 (not 2)
// Tile (1,0) is hero-adjacent - should produce 1
if (game.activePlayer.resources.alloy !== 1 || game.activePlayer.resources.intel !== 1) {
    throw new Error(`Expected 1 alloy and 1 intel, got alloy=${game.activePlayer.resources.alloy}, intel=${game.activePlayer.resources.intel}`);
}
console.log("✅ Outpost + Hero doesn't double-produce");

// Test 8: Roll 7 (No Production)
console.log("\nTest 8: Roll 7 (Invasion)");
const result8 = game.harvest(7);
if (result8 !== null) throw new Error("Expected null for roll 7");
console.log("✅ Roll 7 returns null (invasion)");

console.log("\n✅ All resource generation tests passed!");
process.exit(0);
