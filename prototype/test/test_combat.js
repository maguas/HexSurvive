import { CombatSystem } from '../scripts/combat.js';

console.log("⚔️ Testing Combat Logic...");

// Mock Game
const mockGame = {
    hero: {
        xp: 0,
        health: 10,
        level: 1,
        stats: { tactics: 2, strength: 2, tech: 0 }
    },
    levelUpHero: () => console.log("Level Up!"),
    victoryPoints: 0
};

const combat = new CombatSystem(mockGame);

// Test Case 1: Victory
console.log("\nTest 1: Victory Case");
const encounterCard1 = {
    type: 'combat',
    level: 1,
    title: 'Test Alien',
    enemy: {
        defense: 7,
        slots: [
            { type: 'str', value: 4, label: 'Armor' },
            { type: 'any', value: 3, label: 'Health' }
        ]
    },
    reward: { type: 'xp', value: 10 }
};

combat.currentEncounter = encounterCard1;
// Mock dice: Str 5, Tac 3. Str 5 covers Str 4. Tac 3 covers Any 3.
combat.playerDice = [
    { type: 'str', value: 5 },
    { type: 'tac', value: 3 }
];

const result1 = combat.resolveCombat();
console.log("Result 1:", result1);

if (!result1.victory) {
    console.error("❌ FAILED: Should be victory");
    process.exit(1);
} else {
    console.log("✅ Passed Victory");
}

// Test Case 2: Defeat (Partial)
console.log("\nTest 2: Defeat Case");
combat.currentEncounter = encounterCard1;
// Mock dice: Str 2, Tac 2. 
// Slot 1 (Str 4): Str 2 is not enough. Fail.
// Slot 2 (Any 3): Tac 2 is not enough. Wait, remaining dice is Str 2 (unused) and Tac 2 (unused).
// Logic check:
// Loop 1: Slot Str 4. Suitable: Str 2. Sum 2 < 4. Fail. Dice not used.
// Loop 2: Slot Any 3. Suitable: Str 2, Tac 2. Sorted desc: Str 2, Tac 2.
// Sum: 2 + 2 = 4 >= 3. Success. Used both.
// Result: 1 slot covered. Damage taken.
combat.playerDice = [
    { type: 'str', value: 2 },
    { type: 'tac', value: 2 }
];

const result2 = combat.resolveCombat();
console.log("Result 2:", result2);

if (result2.victory) {
    console.error("❌ FAILED: Should be defeat");
    process.exit(1);
}

if (result2.damageTaken !== 1) {
    console.error(`❌ FAILED: Should take 1 damage (standard), got ${result2.damageTaken}`);
    process.exit(1);
} else {
    console.log("✅ Passed Defeat (Correct Damage)");
}

console.log("\n✅ All combat tests passed!");
process.exit(0);
