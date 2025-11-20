import { GameManager } from '../prototype/scripts/game_manager.js';

try {
    console.log("--- TEST: Multiplayer Logic ---");
    const game = new GameManager();

    // Verify initial state
    if (game.players.length !== 2) throw new Error("Should have 2 players");
    if (game.activePlayer.id !== 1) throw new Error("Player 1 should start");
    if (game.setupStep !== 0) throw new Error("Should be at setup step 0");

    // --- Setup Phase ---
    console.log("\nTest 1: Setup Phase");

    // Step 0: P1 Outpost
    game.map.set("0,0", { q: 0, r: 0, type: 'ruins', revealed: false });
    let res = game.handleInitialPlacement(0, 0, 0);
    if (!res.success) throw new Error(`P1 Outpost failed: ${res.reason}`);
    if (game.setupStep !== 1) throw new Error("Should be at setup step 1");
    if (game.map.get("0,0").ownerId !== 1) throw new Error("Tile should be owned by P1");

    // Step 1: P1 Hero
    res = game.handleInitialPlacement(0, 0, 1);
    if (!res.success) throw new Error(`P1 Hero failed: ${res.reason}`);
    if (game.setupStep !== 2) throw new Error("Should be at setup step 2");
    if (game.activePlayer.id !== 2) throw new Error("Should switch to Player 2");

    // Step 2: P2 Outpost
    game.map.set("1,0", { q: 1, r: 0, type: 'wasteland', revealed: false });
    res = game.handleInitialPlacement(1, 0, 0);
    if (!res.success) throw new Error(`P2 Outpost failed: ${res.reason}`);
    if (game.setupStep !== 3) throw new Error("Should be at setup step 3");
    if (game.map.get("1,0").ownerId !== 2) throw new Error("Tile should be owned by P2");

    // Step 3: P2 Hero
    res = game.handleInitialPlacement(1, 0, 1);
    if (!res.success) throw new Error(`P2 Hero failed: ${res.reason}`);
    if (game.setupStep !== 4) throw new Error("Should be at setup step 4");
    if (game.activePlayer.id !== 1) throw new Error("Should switch back to Player 1");
    if (game.phase !== 'production') throw new Error("Should be in production phase");

    // --- Turn Switching ---
    console.log("\nTest 2: Turn Switching");

    // P1 Turn
    game.resources.fuel += 5; // Give P1 fuel
    const p1Fuel = game.resources.fuel;

    // End Turn -> P2
    const turnRes = game.endTurn();
    if (turnRes.nextPlayer !== "Commander Blue") throw new Error("Next player should be Blue");
    if (game.activePlayer.id !== 2) throw new Error("Active player should be 2");

    // Verify P2 resources are separate
    if (game.resources.fuel === p1Fuel) throw new Error("P2 should have different fuel than P1");
    if (game.resources.fuel !== 1) throw new Error("P2 should have default 1 fuel");

    // End Turn -> P1
    game.endTurn();
    if (game.activePlayer.id !== 1) throw new Error("Active player should be 1");
    if (game.resources.fuel !== p1Fuel) throw new Error("P1 should have their fuel back");

    console.log("\n--- ALL MULTIPLAYER TESTS PASSED ---");

} catch (e) {
    console.error("\n!!! TEST FAILED !!!");
    console.error(e);
    process.exit(1);
}
