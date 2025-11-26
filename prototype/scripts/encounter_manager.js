export class EncounterManager {
    constructor() {
        // Balance Philosophy:
        // - Hero starts with 0 in each stat (Tac/Str/Tech)
        // - Each stat adds to the dice roll result (1d6 + stat)
        // - Level 1: Intro encounters, 2 slots, values 2-3 (beatable with 1d6 rolls)
        // - Level 2: Challenging, 2 slots, total 8-12 (needs gear to boost stats)
        // - Level 3: Requires cooperation, 3+ slots, total 16+ (nearly impossible solo)
        // 
        // Color coding (consistent everywhere):
        // - Tactics: Yellow (#FFD700)
        // - Strength: Red (#F44336)
        // - Tech: Blue (#40C4FF)
        
        // Gear stat totals: Level 1 = 1, Level 2 = 3, Level 3 = 6
        this.decks = {
            1: [
                // --- LEVEL 1: 2 slots, values 2-3 each, gear sums to 1 ---
                {
                    id: 'l1_scout',
                    type: 'combat',
                    level: 1,
                    title: 'Alien Scout',
                    description: 'A small drone monitoring the area.',
                    enemy: { slots: [{ type: 'tech', value: 2 }, { type: 'tac', value: 2 }] },
                    reward: { resources: { alloy: 2 } }
                },
                {
                    id: 'l1_wolf',
                    type: 'combat',
                    level: 1,
                    title: 'Mutated Wolf',
                    description: 'Aggressive wildlife prowling the wastes.',
                    enemy: { slots: [{ type: 'str', value: 3 }, { type: 'tac', value: 2 }] },
                    reward: { equipment: { name: 'Rusty Pistol', slot: 'weapon', tactics: 1 } }
                },
                {
                    id: 'l1_raider',
                    type: 'combat',
                    level: 1,
                    title: 'Wasteland Raider',
                    description: 'A desperate survivor turned bandit.',
                    enemy: { slots: [{ type: 'tac', value: 2 }, { type: 'str', value: 2 }] },
                    reward: { equipment: { name: 'Leather Vest', slot: 'suit', strength: 1 } }
                },
                {
                    id: 'l1_scavenger',
                    type: 'combat',
                    level: 1,
                    title: 'Scavenger Bot',
                    description: 'A malfunctioning salvage drone.',
                    enemy: { slots: [{ type: 'str', value: 2 }, { type: 'tech', value: 2 }] },
                    reward: { resources: { scrap: 1, alloy: 1 } }
                },
                {
                    id: 'l1_spore',
                    type: 'combat',
                    level: 1,
                    title: 'Spore Cloud',
                    description: 'A drifting mass of toxic alien spores.',
                    enemy: { slots: [{ type: 'tech', value: 3 }, { type: 'str', value: 2 }] },
                    reward: { equipment: { name: 'Gas Mask', slot: 'suit', tech: 1 } }
                },
                {
                    id: 'l1_crawler',
                    type: 'combat',
                    level: 1,
                    title: 'Tunnel Crawler',
                    description: 'A skittering creature from underground.',
                    enemy: { slots: [{ type: 'str', value: 2 }, { type: 'tac', value: 3 }] },
                    reward: { equipment: { name: 'Combat Knife', slot: 'weapon', strength: 1 } }
                },
                {
                    id: 'l1_drone',
                    type: 'combat',
                    level: 1,
                    title: 'Recon Drone',
                    description: 'An automated surveillance unit.',
                    enemy: { slots: [{ type: 'tac', value: 2 }, { type: 'tech', value: 3 }] },
                    reward: { resources: { intel: 2 } }
                },
                {
                    id: 'l1_hound',
                    type: 'combat',
                    level: 1,
                    title: 'Cyber Hound',
                    description: 'A mechanical beast with razor claws.',
                    enemy: { slots: [{ type: 'str', value: 3 }, { type: 'tech', value: 2 }] },
                    reward: { equipment: { name: 'Shock Baton', slot: 'weapon', tech: 1 } }
                }
            ],
            2: [
                // --- LEVEL 2: 2 slots, values 3-5 each, gear sums to 3 ---
                {
                    id: 'l2_soldier',
                    type: 'combat',
                    level: 2,
                    title: 'Alien Soldier',
                    description: 'Armed and dangerous infantry unit.',
                    enemy: { slots: [{ type: 'str', value: 4 }, { type: 'tac', value: 4 }] },
                    reward: { equipment: { name: 'Plasma Rifle', slot: 'weapon', strength: 2, tactics: 1 } }
                },
                {
                    id: 'l2_nest',
                    type: 'combat',
                    level: 2,
                    title: 'Xeno-Nest',
                    description: 'A pulsating growth blocking the path.',
                    enemy: { slots: [{ type: 'str', value: 4 }, { type: 'tech', value: 3 }] },
                    reward: { resources: { alloy: 3, fuel: 2 } }
                },
                {
                    id: 'l2_sentinel',
                    type: 'combat',
                    level: 2,
                    title: 'Ancient Sentinel',
                    description: 'Old world security bot reactivated.',
                    enemy: { slots: [{ type: 'tech', value: 4 }, { type: 'str', value: 4 }] },
                    reward: { equipment: { name: 'Combat Armor', slot: 'suit', strength: 1, tech: 2 } }
                },
                {
                    id: 'l2_ambush',
                    type: 'combat',
                    level: 2,
                    title: 'Raider Ambush',
                    description: 'A coordinated attack by wasteland bandits.',
                    enemy: { slots: [{ type: 'tac', value: 4 }, { type: 'str', value: 3 }] },
                    reward: { resources: { scrap: 3, intel: 2 } }
                },
                {
                    id: 'l2_stalker',
                    type: 'combat',
                    level: 2,
                    title: 'Shadow Stalker',
                    description: 'A cloaked predator that hunts in darkness.',
                    enemy: { slots: [{ type: 'tac', value: 5 }, { type: 'tech', value: 3 }] },
                    reward: { equipment: { name: 'Stealth Cloak', slot: 'suit', tactics: 2, tech: 1 } }
                },
                {
                    id: 'l2_brute',
                    type: 'combat',
                    level: 2,
                    title: 'Mutant Brute',
                    description: 'A hulking mass of muscle and rage.',
                    enemy: { slots: [{ type: 'str', value: 5 }, { type: 'tac', value: 3 }] },
                    reward: { equipment: { name: 'Power Fist', slot: 'weapon', strength: 3 } }
                },
                {
                    id: 'l2_hacker',
                    type: 'combat',
                    level: 2,
                    title: 'Rogue AI Node',
                    description: 'A corrupted network terminal with defense drones.',
                    enemy: { slots: [{ type: 'tech', value: 5 }, { type: 'tac', value: 3 }] },
                    reward: { equipment: { name: 'Neural Interface', slot: 'suit', tech: 3 } }
                },
                {
                    id: 'l2_sniper',
                    type: 'combat',
                    level: 2,
                    title: 'Alien Marksman',
                    description: 'A deadly accurate long-range threat.',
                    enemy: { slots: [{ type: 'tac', value: 5 }, { type: 'str', value: 3 }] },
                    reward: { equipment: { name: 'Precision Rifle', slot: 'weapon', tactics: 2, strength: 1 } }
                }
            ],
            3: [
                // --- LEVEL 3: 3 slots, values 4-8 each, gear sums to 6 ---
                {
                    id: 'l3_queen',
                    type: 'combat',
                    level: 3,
                    title: 'Hive Queen',
                    description: 'The source of the infestation. Requires coordinated assault.',
                    enemy: { slots: [
                        { type: 'str', value: 6 }, 
                        { type: 'tac', value: 6 }, 
                        { type: 'tech', value: 5 }
                    ]},
                    reward: { 
                        resources: { alloy: 3, intel: 2 }, 
                        equipment: { name: 'Exosuit Prototype', slot: 'suit', strength: 3, tech: 3 } 
                    }
                },
                {
                    id: 'l3_colossus',
                    type: 'combat',
                    level: 3,
                    title: 'Bio-Colossus',
                    description: 'A mountain of mutated muscle. Nearly unstoppable alone.',
                    enemy: { slots: [
                        { type: 'str', value: 8 }, 
                        { type: 'tech', value: 5 },
                        { type: 'tac', value: 4 }
                    ]},
                    reward: {
                        resources: { food: 3, fuel: 2 },
                        equipment: { name: 'Heavy Cannon', slot: 'weapon', strength: 4, tactics: 2 }
                    }
                },
                {
                    id: 'l3_warlord',
                    type: 'combat',
                    level: 3,
                    title: 'Alien Warlord',
                    description: 'A tactical genius commanding the invasion force.',
                    enemy: { slots: [
                        { type: 'tac', value: 7 }, 
                        { type: 'str', value: 5 }, 
                        { type: 'tech', value: 5 }
                    ]},
                    reward: { 
                        resources: { intel: 3, alloy: 2 },
                        equipment: { name: 'Command Module', slot: 'suit', tactics: 4, tech: 2 } 
                    }
                },
                {
                    id: 'l3_mech',
                    type: 'combat',
                    level: 3,
                    title: 'War Mech',
                    description: 'A towering combat machine bristling with weapons.',
                    enemy: { slots: [
                        { type: 'str', value: 7 }, 
                        { type: 'tech', value: 6 }, 
                        { type: 'tac', value: 4 }
                    ]},
                    reward: { 
                        resources: { scrap: 4, fuel: 3 },
                        equipment: { name: 'Railgun', slot: 'weapon', tech: 3, strength: 3 } 
                    }
                },
                {
                    id: 'l3_overlord',
                    type: 'combat',
                    level: 3,
                    title: 'Psionic Overlord',
                    description: 'A mind-bending entity that controls lesser creatures.',
                    enemy: { slots: [
                        { type: 'tech', value: 7 }, 
                        { type: 'tac', value: 6 }, 
                        { type: 'str', value: 4 }
                    ]},
                    reward: { 
                        resources: { intel: 4, alloy: 3 },
                        equipment: { name: 'Psi Amplifier', slot: 'suit', tech: 4, tactics: 2 } 
                    }
                },
                {
                    id: 'l3_titan',
                    type: 'combat',
                    level: 3,
                    title: 'Armored Titan',
                    description: 'An ancient war machine awakened from slumber.',
                    enemy: { slots: [
                        { type: 'str', value: 7 }, 
                        { type: 'tac', value: 5 }, 
                        { type: 'tech', value: 5 }
                    ]},
                    reward: { 
                        resources: { alloy: 4, scrap: 3 },
                        equipment: { name: 'Titan Blade', slot: 'weapon', strength: 5, tactics: 1 } 
                    }
                }
            ]
        };
    }

    drawCard(threatLevel) {
        const deck = this.decks[threatLevel];
        if (!deck || deck.length === 0) {
            // Fallback to level 1 if deck empty
            const level1 = this.decks[0];
            return level1[Math.floor(Math.random() * level1.length)];
        }
        const index = Math.floor(Math.random() * deck.length);
        return deck[index];
    }
}
