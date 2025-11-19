import { GameManager } from '../scripts/game_manager.js';
import assert from 'assert';

const game = new GameManager();
game.resources.fuel = 10;

// 1. Setup
game.handleInitialPlacement(0, 0, 0); // Place at 0,0 Edge 0

// 2. Move to reveal new tile
// Move to Edge 1 (Same tile, no new reveal)
// Move to Edge 2 (Same tile, no new reveal)
// Move to Neighbor?
// Let's force a move that reveals a hidden tile.
// (0,0) neighbors are (1,0), (0,1), etc.
// Initial placement revealed (0,0) and (1,0) (Edge 0 neighbor).
// Let's move to Edge 3 (Left). Neighbor is (-1, 0).
// Move to Edge 1 (Adjacent to Edge 0)
// Edge 1 neighbor is (0,1). It should be hidden.
const result = game.moveHero(0, 0, 1);
console.log("Move result:", result);

assert.strictEqual(result.success, true);
assert.ok(result.encounters.length > 0, "Should trigger encounter");
console.log("Encounter:", result.encounters[0].card.title);

// 3. Verify Threat Increase
const initialTrack = game.threatTrack;
const initialLevel = game.threatLevel;

const threatRes = game.handleEncounterFailure();
console.log("Threat Result:", threatRes);

assert.strictEqual(game.threatTrack, initialTrack + 1, "Threat track should increase");

// 4. Verify Level Up
// Fill track
game.threatTrack = 4;
const levelRes = game.increaseThreat();
console.log("Level Up Result:", levelRes);

assert.strictEqual(levelRes.level, initialLevel + 1, "Threat level should increase");
assert.strictEqual(levelRes.track, 0, "Track should reset");

console.log("All threat tests passed!");
