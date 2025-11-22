import { CombatSystem } from '../prototype/scripts/combat.js';

console.log("⚔️⚔️ Advanced Combat Tests...");

// Mock Game
const mockGame = {
    hero: {
        xp: 0,
        health: 10,
        level: 1,
        stats: { tactics: 3, strength: 2, tech: 1 }
    },
    levelUpHero: () => console.log("Level Up!"),
    victoryPoints: 0
};

const combat = new CombatSystem(mockGame);

// Test 3: Multiple Specific Slots
console.log("\nTest 3: Multiple Specific Slots");
const encounterCard3 = {
    type: 'combat',
    level: 2,
    title: 'Elite Soldier',
    enemy: {
        defense: 10,
        slots: [
            { type: 'str', value: 3, label: 'Armor' },
            { type: 'tac', value: 3, label: 'Evasion' },
            { type: 'tech', value: 2, label: 'Shield' }
        ]
    },
    reward: { type: 'xp', value: 15 }
};

combat.currentEncounter = encounterCard3;
// Mock dice: Str 4, Tac 4, Tech 3
combat.playerDice = [
    { type: 'str', value: 4 },
    { type: 'tac', value: 4 },
    { type: 'tech', value: 3 }
];

const result3 = combat.resolveCombat();
console.log("Result 3:", result3);

if (!result3.victory) {
    console.error("❌ FAILED: Should be victory with exact matches");
    process.exit(1);
} else {
    console.log("✅ Passed Multiple Specific Slots");
}

// Test 4: "Any" Slot Priority
console.log("\nTest 4: Any Slot Priority");
const encounterCard4 = {
    type: 'combat',
    level: 1,
    title: 'Generic Enemy',
    enemy: {
        defense: 5,
        slots: [
            { type: 'str', value: 3, label: 'Armor' },
            { type: 'any', value: 5, label: 'Health' }
        ]
    },
    reward: { type: 'xp', value: 5 }
};

combat.currentEncounter = encounterCard4;
// Dice: Str 3, Tac 5. Str should cover armor, Tac should cover "any"
combat.playerDice = [
    { type: 'str', value: 3 },
    { type: 'tac', value: 5 }
];

const result4 = combat.resolveCombat();
console.log("Result 4:", result4);

if (!result4.victory) {
    console.error("❌ FAILED: Should allocate specific types first, then any");
    process.exit(1);
} else {
    console.log("✅ Passed Any Slot Priority");
}

// Test 5: Dice Pooling (Multiple small dice to cover one slot)
console.log("\nTest 5: Dice Pooling");
const encounterCard5 = {
    type: 'combat',
    level: 1,
    title: 'Tough Enemy',
    enemy: {
        defense: 10,
        slots: [
            { type: 'any', value: 10, label: 'Health' }
        ]
    },
    reward: { type: 'xp', value: 5 }
};

combat.currentEncounter = encounterCard5;
// Multiple small dice: 3 + 3 + 4 = 10
combat.playerDice = [
    { type: 'str', value: 3 },
    { type: 'tac', value: 3 },
    { type: 'tech', value: 4 }
];

const result5 = combat.resolveCombat();
console.log("Result 5:", result5);

if (!result5.victory) {
    console.error("❌ FAILED: Should pool multiple dice to cover slot");
    process.exit(1);
} else {
    console.log("✅ Passed Dice Pooling");
}

// Test 6: Insufficient Dice (Total Failure)
console.log("\nTest 6: Total Failure");
const encounterCard6 = {
    type: 'combat',
    level: 2,
    title: 'Overpowering Enemy',
    enemy: {
        defense: 20,
        slots: [
            { type: 'str', value: 10, label: 'Armor' },
            { type: 'tac', value: 10, label: 'Evasion' }
        ]
    },
    reward: { type: 'xp', value: 20 }
};

combat.currentEncounter = encounterCard6;
// Weak dice: 1, 1
combat.playerDice = [
    { type: 'str', value: 1 },
    { type: 'tac', value: 1 }
];

const result6 = combat.resolveCombat();
console.log("Result 6:", result6);

if (result6.victory) {
    console.error("❌ FAILED: Should fail with insufficient dice");
    process.exit(1);
}

if (result6.damageTaken !== 1) {
    console.error(`❌ FAILED: Should take 1 damage on failure, got ${result6.damageTaken}`);
    process.exit(1);
}

console.log("✅ Passed Total Failure");

// Test 7: Exact Match (Edge Case)
console.log("\nTest 7: Exact Match");
const encounterCard7 = {
    type: 'combat',
    level: 1,
    title: 'Balanced Enemy',
    enemy: {
        defense: 6,
        slots: [
            { type: 'str', value: 3, label: 'Armor' },
            { type: 'tac', value: 3, label: 'Evasion' }
        ]
    },
    reward: { type: 'xp', value: 10 }
};

combat.currentEncounter = encounterCard7;
combat.playerDice = [
    { type: 'str', value: 3 },
    { type: 'tac', value: 3 }
];

const result7 = combat.resolveCombat();
console.log("Result 7:", result7);

if (!result7.victory) {
    console.error("❌ FAILED: Should succeed with exact match");
    process.exit(1);
} else {
    console.log("✅ Passed Exact Match");
}

console.log("\n✅✅ All advanced combat tests passed!");
process.exit(0);
