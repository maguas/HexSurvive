export class EncounterManager {
    constructor() {
        this.decks = {
            1: [
                {
                    id: 'l1_scout',
                    type: 'combat',
                    level: 1,
                    title: 'Alien Scout',
                    description: 'A small drone monitoring the area.',
                    enemy: { slots: [{ type: 'tech', value: 2 }] },
                    reward: { resources: { intel: 1, scrap: 1 } }
                },
                {
                    id: 'l1_wolf',
                    type: 'combat',
                    level: 1,
                    title: 'Mutated Wolf',
                    description: 'Aggressive wildlife.',
                    enemy: { slots: [{ type: 'str', value: 2 }] },
                    reward: { resources: { food: 1 } }
                },
                {
                    id: 'l1_raider',
                    type: 'combat',
                    level: 1,
                    title: 'Wasteland Raider',
                    description: 'A desperate survivor turned bandit.',
                    enemy: { slots: [{ type: 'tac', value: 2 }] },
                    reward: { equipment: { name: 'Rusty Pistol', slot: 'weapon', tactics: 1 } }
                },
                {
                    id: 'l1_transport',
                    type: 'combat', // Converted from stash to combat
                    level: 1,
                    title: 'Alien Transport',
                    description: 'A lightly guarded supply transport.',
                    enemy: { slots: [{ type: 'tac', value: 2 }] },
                    reward: { resources: { scrap: 1, food: 1 } }
                }
            ],
            2: [
                {
                    id: 'l2_soldier',
                    type: 'combat',
                    level: 2,
                    title: 'Alien Soldier',
                    description: 'Armed and dangerous.',
                    enemy: { slots: [{ type: 'str', value: 3 }, { type: 'tac', value: 2 }] },
                    reward: { equipment: { name: 'Plasma Rifle', slot: 'weapon', tactics: 2 } }
                },
                {
                    id: 'l2_nest',
                    type: 'combat',
                    level: 2,
                    title: 'Xeno-Nest',
                    description: 'A pulsating growth blocking the path.',
                    enemy: { slots: [{ type: 'str', value: 3 }, { type: 'tech', value: 2 }] },
                    reward: { resources: { alloy: 1, fuel: 1 } }
                },
                {
                    id: 'l2_sentinel',
                    type: 'combat',
                    level: 2,
                    title: 'Ancient Sentinel',
                    description: 'Old world security bot.',
                    enemy: { slots: [{ type: 'tech', value: 3 }, { type: 'str', value: 2 }] },
                    reward: { equipment: { name: 'Combat Armor', slot: 'body', strength: 1, tech: 1 } }
                }
            ],
            3: [
                {
                    id: 'l3_boss',
                    type: 'combat',
                    level: 3,
                    title: 'Hive Queen',
                    description: 'The source of the infestation.',
                    enemy: { slots: [{ type: 'str', value: 4 }, { type: 'tac', value: 4 }, { type: 'tech', value: 4 }] },
                    reward: { 
                        resources: { alloy: 3, intel: 3 }, 
                        equipment: { name: 'Exosuit Prototype', slot: 'body', strength: 3, tech: 2 } 
                    }
                },
                {
                    id: 'l3_colossus',
                    type: 'combat',
                    level: 3,
                    title: 'Bio-Colossus',
                    description: 'A mountain of mutated muscle.',
                    enemy: { slots: [{ type: 'str', value: 8 }, { type: 'tac', value: 4 }] },
                    reward: {
                        resources: { food: 3, fuel: 2 },
                        equipment: { name: 'Heavy Cannon', slot: 'weapon', strength: 4 }
                    }
                }
            ]
        };
    }

    drawCard(threatLevel) {
        const deck = this.decks[threatLevel];
        if (!deck || deck.length === 0) {
            // Fallback to level 1 if deck empty
            const level1 = this.decks[1];
            return level1[Math.floor(Math.random() * level1.length)];
        }
        const index = Math.floor(Math.random() * deck.length);
        return deck[index];
    }
}
