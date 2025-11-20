import { GameManager } from '../scripts/game_manager.js';
import { CombatSystem } from '../scripts/combat.js';
import { EncounterManager } from '../scripts/encounter_manager.js';

// Mock Game and UI
const game = new GameManager();
const combat = new CombatSystem(game);

console.log("=== Testing Combat Integration ===");

// Setup Hero
game.hero.stats = { tactics: 2, strength: 2, tech: 1 };
console.log("Hero Stats:", game.hero.stats);

// Draw Encounter Card
const encounterManager = new EncounterManager();
const card = encounterManager.drawCard(1); // Level 1
console.log("Drawn Card:", card.title, card.type);

if (card.type === 'combat' || card.type === 'hazard') {
    // Initiate Combat
    console.log("Initiating Combat...");
    const combatData = combat.initiateCombat(card);

    console.log("Enemy Slots:", combatData.enemy.slots);
    console.log("Player Dice:", combatData.playerDice);

    // Resolve Combat (Auto-resolve logic in resolveCombat is greedy)
    console.log("Resolving Combat...");
    const result = combat.resolveCombat();

    console.log("Result:", result);

    if (result.victory) {
        console.log("Victory! Reward:", result.reward);
    } else {
        console.log("Defeat! Damage Taken:", result.damageTaken);
    }

} else {
    console.log("Drawn stash card, skipping combat test.");
}
