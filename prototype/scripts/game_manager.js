export class GameManager {
    constructor() {
        this.resources = {
            scrap: 3,
            fuel: 2,
            food: 3,
            alloy: 0,
            intel: 1
        };
        
        this.playerHero = {
            name: "Commander",
            level: 1,
            xp: 0,
            xpToNext: 10,
            stats: { tac: 2, str: 2, tech: 2 },
            gear: {
                head: null,
                body: "Flak Jacket",
                weapon: "Rifle",
                tech: null
            },
            health: 10,
            maxHealth: 10
        };
        
        this.map = new Map();
        this.turn = 1;
        this.phase = 'production';
        this.victoryPoints = 0;
        this.threatLevel = 1;
        this.alienPatrolLocation = null;
        this.currentEncounter = null;
    }

    initGame() {
        // Create HQ (center tile)
        this.map.set("0,0", {
            type: 'bunker',
            revealed: true,
            numberToken: null,
            level: 0,
            outpost: true,
            alienPatrol: false
        });

        // Add initial neighbors (fog of war)
        this.addNeighbors(0, 0);
    }

    randomTileType() {
        const types = ['ruins', 'wasteland', 'overgrown', 'crash_site', 'desert', 'bunker'];
        const weights = [25, 20, 20, 15, 15, 5]; // Percentage weights
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < types.length; i++) {
            if (random < weights[i]) return types[i];
            random -= weights[i];
        }
        return 'desert';
    }

    rollDice() {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        return { d1, d2, total: d1 + d2 };
    }

    harvest(rollValue) {
        let gains = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
        
        if (rollValue === 7) {
            return null; // Invasion event
        }

        this.map.forEach((tile) => {
            if (tile.revealed && tile.numberToken === rollValue && tile.outpost && !tile.alienPatrol) {
                const amount = tile.fortress ? 2 : 1;
                
                switch (tile.type) {
                    case 'ruins':
                        gains.scrap += amount;
                        this.resources.scrap += amount;
                        break;
                    case 'wasteland':
                        gains.fuel += amount;
                        this.resources.fuel += amount;
                        break;
                    case 'overgrown':
                        gains.food += amount;
                        this.resources.food += amount;
                        break;
                    case 'crash_site':
                        gains.alloy += amount;
                        this.resources.alloy += amount;
                        break;
                    case 'bunker':
                        gains.intel += amount;
                        this.resources.intel += amount;
                        break;
                }
            }
        });
        
        return gains;
    }

    explore(q, r) {
        const key = `${q},${r}`;
        const tile = this.map.get(key);
        
        if (!tile || tile.revealed) {
            return { success: false, reason: "Tile already explored or doesn't exist" };
        }
        
        if (this.resources.fuel < 1 || this.resources.food < 1) {
            return { success: false, reason: "Not enough resources (need 1 Fuel + 1 Food)" };
        }

        // Check if adjacent to revealed tile
        if (!this.isAdjacentToRevealed(q, r)) {
            return { success: false, reason: "Must explore adjacent to revealed tiles" };
        }

        // Pay costs
        this.resources.fuel--;
        this.resources.food--;

        // Reveal tile
        tile.revealed = true;
        tile.numberToken = this.generateNumberToken();
        
        // Calculate level based on distance from HQ
        const dist = (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
        tile.level = Math.floor(dist);

        // Add new neighbors
        this.addNeighbors(q, r);

        // Generate encounter
        const encounter = this.generateEncounter(tile.level);
        this.currentEncounter = encounter;

        return { success: true, tile, encounter };
    }

    isAdjacentToRevealed(q, r) {
        const directions = [
            [1, 0], [1, -1], [0, -1],
            [-1, 0], [-1, 1], [0, 1]
        ];

        for (const dir of directions) {
            const key = `${q + dir[0]},${r + dir[1]}`;
            const neighbor = this.map.get(key);
            if (neighbor && neighbor.revealed) {
                return true;
            }
        }
        return false;
    }

    generateNumberToken() {
        // Weighted distribution similar to Catan
        const tokens = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
        return tokens[Math.floor(Math.random() * tokens.length)];
    }

    generateEncounter(level) {
        const roll = Math.random();
        
        // Higher levels = more dangerous
        if (roll < 0.3 + level * 0.05) {
            return this.generateCombatEncounter(level);
        } else if (roll < 0.6) {
            return this.generateLootEncounter(level);
        } else {
            return { type: 'safe', message: 'Area clear. No hostiles detected.' };
        }
    }

    generateCombatEncounter(level) {
        const types = ['Scout', 'Soldier', 'Elite', 'Commander'];
        const typeIndex = Math.min(level, types.length - 1);
        const alienType = types[typeIndex];
        
        return {
            type: 'combat',
            enemyType: alienType,
            level: level,
            health: 3 + level * 2,
            armor: level,
            damage: 2 + level,
            reward: {
                xp: 5 + level * 2,
                loot: level > 1 ? this.generateLoot(level) : null
            }
        };
    }

    generateLootEncounter(level) {
        return {
            type: 'loot',
            loot: this.generateLoot(level),
            message: 'Found abandoned supplies!'
        };
    }

    generateLoot(level) {
        const gearTypes = ['head', 'body', 'weapon', 'tech'];
        const slot = gearTypes[Math.floor(Math.random() * gearTypes.length)];
        const names = {
            head: ['Helmet', 'Visor', 'Neural Implant'],
            body: ['Armor Vest', 'Power Suit', 'Shield Gen'],
            weapon: ['Plasma Rifle', 'Laser Gun', 'Rail Gun'],
            tech: ['Scanner', 'Med Kit', 'EMP Device']
        };
        
        return {
            slot: slot,
            name: names[slot][Math.floor(Math.random() * names[slot].length)],
            bonus: level + 1
        };
    }

    buildOutpost(q, r) {
        const key = `${q},${r}`;
        const tile = this.map.get(key);
        
        if (!tile || !tile.revealed) {
            return { success: false, reason: "Cannot build on unrevealed tile" };
        }
        
        if (tile.outpost) {
            return { success: false, reason: "Outpost already exists here" };
        }
        
        if (this.resources.scrap < 1 || this.resources.food < 1 || this.resources.fuel < 1) {
            return { success: false, reason: "Not enough resources (need 1 Scrap, 1 Food, 1 Fuel)" };
        }

        // Pay costs
        this.resources.scrap--;
        this.resources.food--;
        this.resources.fuel--;

        tile.outpost = true;
        this.victoryPoints++;

        return { success: true };
    }

    trainHero() {
        if (this.resources.food < 1 || this.resources.intel < 1) {
            return { success: false, reason: "Not enough resources (need 1 Food, 1 Intel)" };
        }

        this.resources.food--;
        this.resources.intel--;

        const xpGain = 5;
        this.playerHero.xp += xpGain;

        if (this.playerHero.xp >= this.playerHero.xpToNext) {
            this.levelUpHero();
            return { success: true, levelUp: true };
        }

        return { success: true, xpGain, levelUp: false };
    }

    levelUpHero() {
        this.playerHero.level++;
        this.playerHero.xp = 0;
        this.playerHero.xpToNext = Math.floor(this.playerHero.xpToNext * 1.5);
        
        // Increase random stat
        const stats = ['tac', 'str', 'tech'];
        const statToIncrease = stats[Math.floor(Math.random() * stats.length)];
        this.playerHero.stats[statToIncrease]++;
        
        this.playerHero.maxHealth += 2;
        this.playerHero.health = this.playerHero.maxHealth;
    }

    handleInvasion() {
        this.threatLevel++;
        
        // Discard half resources if > 7
        let discarded = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
        const totalResources = Object.values(this.resources).reduce((a, b) => a + b, 0);
        
        if (totalResources > 7) {
            for (let key in this.resources) {
                const half = Math.floor(this.resources[key] / 2);
                discarded[key] = half;
                this.resources[key] -= half;
            }
        }

        return { discarded, threatLevel: this.threatLevel };
    }

    addNeighbors(q, r) {
        const directions = [
            [1, 0], [1, -1], [0, -1],
            [-1, 0], [-1, 1], [0, 1]
        ];
        
        directions.forEach(dir => {
            const nQ = q + dir[0];
            const nR = r + dir[1];
            const key = `${nQ},${nR}`;
            
            if (!this.map.has(key)) {
                this.map.set(key, {
                    type: this.randomTileType(),
                    revealed: false,
                    numberToken: null,
                    level: null,
                    outpost: false,
                    fortress: false,
                    alienPatrol: false
                });
            }
        });
    }

    endTurn() {
        this.turn++;
        this.phase = 'production';
    }
}
