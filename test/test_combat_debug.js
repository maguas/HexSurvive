import { CombatSystem } from '../prototype/scripts/combat.js';

try {
    // Mock Game and Hero
    const mockGame = {
        hero: {
            stats: { tactics: 2, strength: 2, tech: 2 },
            health: 3
        },
        resources: { food: 5 },
        increaseThreat: () => ({ gameOver: false, level: 1, track: 1 }),
        handleEncounterFailure: function () {
            this.hero.health -= 1;
            return this.increaseThreat();
        }
    };

    const combat = new CombatSystem(mockGame);

    console.log("--- TEST: Combat System ---");

    // Test 1: Dice Rolling
    console.log("\nTest 1: Dice Rolling");
    const dice = combat.rollHeroDice(mockGame.hero);
    console.log(`Rolled ${dice.length} dice`);
    if (dice.length !== 6) throw new Error("Incorrect number of dice");

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

    combat.currentEncounter = easyEncounter;
    combat.playerDice = [
        { type: 'str', value: 6 },
        { type: 'str', value: 5 },
        { type: 'tac', value: 4 }
    ];

    const resultWin = combat.resolveCombat();
    console.log("Victory Result:", resultWin.victory);
    if (!resultWin.victory) throw new Error("Should have won");
    if (resultWin.damageDealt !== 100) throw new Error("Damage dealt should be 100");
    if (!resultWin.assignments || resultWin.assignments.length === 0) throw new Error("Should return assignments");
    console.log("Assignments count:", resultWin.assignments.length);

    // Test 3: Combat Resolution (Defeat)
    console.log("\nTest 3: Combat Resolution (Defeat Scenario)");
    const hardEncounter = {
        enemy: {
            slots: [{ type: 'tech', value: 20 }],
            reward: { type: 'xp', value: 1 }
        }
    };

    combat.currentEncounter = hardEncounter;
    combat.playerDice = [{ type: 'str', value: 1 }];

    const resultLoss = combat.resolveCombat();
    console.log("Defeat Result:", resultLoss.victory);
    if (resultLoss.victory) throw new Error("Should have lost");

    // Test 4: Retreat
    console.log("\nTest 4: Retreat");
    const retreatResult = combat.retreat();
    console.log("Retreat Message:", retreatResult.message);
    if (mockGame.resources.food !== 4) throw new Error(`Food should be 4, is ${mockGame.resources.food}`);

    console.log("\n--- ALL TESTS PASSED ---");

} catch (e) {
    console.error("\n!!! TEST FAILED !!!");
    console.error(e);
    process.exit(1);
}
