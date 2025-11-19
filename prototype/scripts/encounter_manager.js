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
                    enemy: { defense: 4, slots: [{ type: 'tech', value: 1 }] },
                    reward: { type: 'xp', value: 1 }
                },
                {
                    id: 'l1_wolf',
                    type: 'combat',
                    level: 1,
                    title: 'Mutated Wolf',
                    description: 'Aggressive wildlife.',
                    enemy: { defense: 5, slots: [{ type: 'str', value: 1 }] },
                    reward: { type: 'xp', value: 1 }
                },
                {
                    id: 'l1_stash',
                    type: 'stash',
                    level: 1,
                    title: 'Supply Cache',
                    description: 'Hidden supplies left by survivors.',
                    enemy: null,
                    reward: { type: 'loot', item: { slot: 'body', name: 'Leather Armor', bonus: 1 } }
                },
                {
                    id: 'l1_rads',
                    type: 'hazard',
                    level: 1,
                    title: 'Radiation Pocket',
                    description: 'Geiger counter is clicking...',
                    enemy: { defense: 4, slots: [{ type: 'tac', value: 1 }] }, // Skill check
                    reward: { type: 'xp', value: 1 }
                }
            ],
            2: [
                {
                    id: 'l2_soldier',
                    type: 'combat',
                    level: 2,
                    title: 'Alien Soldier',
                    description: 'Armed and dangerous.',
                    enemy: { defense: 8, slots: [{ type: 'str', value: 1 }, { type: 'tac', value: 1 }] },
                    reward: { type: 'loot', item: { slot: 'weapon', name: 'Plasma Rifle', bonus: 2 } }
                },
                {
                    id: 'l2_nest',
                    type: 'hazard',
                    level: 2,
                    title: 'Xeno-Nest',
                    description: 'A pulsating growth blocking the path.',
                    enemy: { defense: 10, slots: [{ type: 'str', value: 2 }, { type: 'tech', value: 1 }] },
                    reward: { type: 'xp', value: 2 }
                }
            ],
            3: [
                {
                    id: 'l3_boss',
                    type: 'combat',
                    level: 3,
                    title: 'Hive Queen',
                    description: 'The source of the infestation.',
                    enemy: { defense: 15, slots: [{ type: 'str', value: 2 }, { type: 'tac', value: 2 }, { type: 'tech', value: 2 }] },
                    reward: { type: 'xp', value: 5 } // Game winner?
                }
            ]
        };
    }

    drawCard(threatLevel) {
        const deck = this.decks[threatLevel];
        if (!deck || deck.length === 0) {
            // Fallback or reshuffle
            return this.decks[1][0];
        }
        const index = Math.floor(Math.random() * deck.length);
        return deck[index];
    }
}
