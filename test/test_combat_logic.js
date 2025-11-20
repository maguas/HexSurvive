import { CombatSystem } from '../prototype/scripts/combat.js';

// Mock Game and Hero
const mockGame = {
    hero: {
        stats: {
            tactics: 2,
            strength: 2,
            tech: 2
        }
    },
    resources: {
        food: 5
    }
};

const combat = new CombatSystem(mockGame);

console.log("--- TEST: Combat System ---");

// Test 1: Dice Rolling
console.log("\nTest 1: Dice Rolling");
const dice = combat.rollHeroDice(mockGame.hero);
console.log(`Rolled ${dice.length} dice (Expected 6)`);
console.log("Dice types:", dice.map(d => d.type).join(', '));
if (dice.length !== 6) console.error("FAIL: Incorrect number of dice");

// Test 2: Combat Resolution (Victory)
console.log("\nTest 2: Combat Resolution (Victory Scenario)");
const easyEncounter = {
    enemy: {
        slots: [
            { type: 'any', value: 3 },
            { type: 'str', value: 2 }
        ],
        reward: { type: 'xp', value: 1 }
    }
};

// Force dice for deterministic test
combat.currentEncounter = easyEncounter;
combat.playerDice = [
    { type: 'str', value: 6 },
    { type: 'str', value: 5 },
    { type: 'tac', value: 4 }
];

const resultWin = combat.resolveCombat();
console.log("Victory Result:", resultWin.victory);
if (!resultWin.victory) console.error("FAIL: Should have won");
if (resultWin.damageDealt !== 100) console.error("FAIL: Damage dealt should be 100 on win");

// Test 3: Combat Resolution (Defeat)
console.log("\nTest 3: Combat Resolution (Defeat Scenario)");
const hardEncounter = {
    enemy: {
        slots: [
            { type: 'tech', value: 20 } // Impossible
        ],
        reward: { type: 'xp', value: 1 }
    }
};

combat.currentEncounter = hardEncounter;
combat.playerDice = [
    { type: 'str', value: 1 }
];

const resultLoss = combat.resolveCombat();
console.log("Defeat Result:", resultLoss.victory);
if (resultLoss.victory) console.error("FAIL: Should have lost");
if (resultLoss.damageTaken !== 1) console.error("FAIL: Should take 1 damage");

// Test 4: Retreat
console.log("\nTest 4: Retreat");
const retreatResult = combat.retreat();
console.log("Retreat Message:", retreatResult.message);
if (mockGame.resources.food !== 4) console.error("FAIL: Should have consumed 1 food (5 -> 4)");

console.log("\n--- End Test ---");
