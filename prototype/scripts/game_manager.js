import { EncounterManager } from './encounter_manager.js';

export class GameManager {
    constructor() {
        this.encounterManager = new EncounterManager();
        this.resources = {
            scrap: 0,
            fuel: 0,
            food: 0,
            alloy: 0,
            intel: 0
        };
        // ...
        this.threatLevel = 1;
        this.threatTrack = 0; // 0-5
        this.maxThreatTrack = 5;
        // ...
        this.hero = {
            location: null, // {q, r, edgeIndex}
            stats: {
                tactics: 1,
                strength: 1,
                tech: 1
            },
            health: 3,
            xp: 0,
            level: 1,
            hand: [] // Cards tucked
        };
        this.map = new Map();
        this.turn = 1;
        this.phase = 'production'; // production, action
        this.victoryPoints = 0;
        this.threatLevel = 1;
        this.alienPatrolLocation = null;
        this.currentEncounter = null;

        // Initialize map with HQ
        this.initMap();
    }

    initMap() {
        const radius = 3;
        const tileTypes = [
            'ruins', 'ruins', 'ruins', 'ruins', 'ruins',
            'wasteland', 'wasteland', 'wasteland', 'wasteland',
            'overgrown', 'overgrown', 'overgrown', 'overgrown',
            'crash_site', 'crash_site', 'crash_site',
            'bunker', 'bunker', 'bunker',
            'barren', 'barren'
        ];

        // Shuffle types
        for (let i = tileTypes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]];
        }

        let typeIndex = 0;

        for (let q = -radius; q <= radius; q++) {
            const r1 = Math.max(-radius, -q - radius);
            const r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                const type = tileTypes[typeIndex % tileTypes.length];
                typeIndex++;

                this.map.set(`${q},${r}`, {
                    type: type,
                    revealed: false, // All start hidden
                    q: q,
                    r: r,
                    numberToken: null,
                    outpost: false,
                    level: Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) // Distance from center
                });
            }
        }

        this.phase = 'setup'; // Start in setup phase
    }

    handleInitialPlacement(q, r, edgeIndex) {
        if (this.phase !== 'setup') return { success: false, reason: "Not in setup phase" };

        const key = `${q},${r}`;
        const tile = this.map.get(key);
        if (!tile) return { success: false, reason: "Invalid tile" };

        // Place Outpost
        tile.outpost = true;
        tile.revealed = true;
        this.victoryPoints++; // +1 VP for Outpost

        // Place Hero
        this.hero.location = { q, r, edgeIndex };

        // Reveal adjacent via edge
        this.revealAdjacentTiles(q, r, edgeIndex);

        // End setup
        this.phase = 'production';
        return { success: true };
    }

    getNeighbor(q, r, direction) {
        const neighbors = [
            { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
            { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
        ];
        const d = neighbors[direction];
        return { q: q + d.q, r: r + d.r };
    }

    // Normalize edge to canonical form (optional, but useful for equality checks)
    // For now, we'll just handle equivalence in logic

    isValidMove(targetQ, targetR, targetEdge) {
        if (!this.hero.location) return true; // Initial placement

        const { q, r, edgeIndex } = this.hero.location;

        // Check if target is the same edge (on same or neighbor tile)
        if (q === targetQ && r === targetR && edgeIndex === targetEdge) return false;

        // Check if target is the shared edge on neighbor (physically same location)
        const neighbor = this.getNeighbor(q, r, edgeIndex);
        const sharedEdge = (edgeIndex + 3) % 6;
        if (targetQ === neighbor.q && targetR === neighbor.r && targetEdge === sharedEdge) return false;

        // Check connectivity
        // We are at edgeIndex of (q,r).
        // Vertices are at (edgeIndex) and (edgeIndex + 1).

        // Connected edges at Vertex 1 (edgeIndex + 1):
        // 1. Next edge on same tile: (edgeIndex + 1) % 6
        // 2. Edge on neighbor at (edgeIndex):
        //    Neighbor(edgeIndex) shares edgeIndex. 
        //    Its next edge from that vertex is... 
        //    Wait, let's use the simple logic:
        //    From (q,r,i), valid moves are:
        //    - (q,r, i+1)
        //    - (q,r, i-1)
        //    - Neighbor(i) -> (i+3+1)
        //    - Neighbor(i) -> (i+3-1)
        //    - Neighbor(i+1) -> (i+1+3-1) ?? This is getting complex.

        // SIMPLIFIED LOGIC:
        // Just allow move to any edge on the same tile or adjacent tile that shares a vertex.
        // But for now, let's just trust the user clicks on a valid edge and validate distance?
        // No, we need strict validation.

        // Let's list all 4 connected edges physically.
        const connected = [];

        // 1. Same tile neighbors
        connected.push({ q, r, edge: (edgeIndex + 1) % 6 });
        connected.push({ q, r, edge: (edgeIndex + 5) % 6 });

        // 2. Neighbor via current edge (Neighbor A)
        const nA = this.getNeighbor(q, r, edgeIndex);
        const nA_shared = (edgeIndex + 3) % 6;
        connected.push({ q: nA.q, r: nA.r, edge: (nA_shared + 1) % 6 });
        connected.push({ q: nA.q, r: nA.r, edge: (nA_shared + 5) % 6 });

        // 3. Neighbors via vertices?
        // Actually, the graph is:
        // Edge E connects to Vertex V1, V2.
        // Vertex V1 connects to Edge E, E_next, E_neighbor_next.

        // Let's just check if the target is in the list of 4 connected edges
        // OR if it is equivalent to one of them.

        for (const c of connected) {
            if (c.q === targetQ && c.r === targetR && c.edge === targetEdge) return true;

            // Check equivalence (if c is shared with target)
            const cN = this.getNeighbor(c.q, c.r, c.edge);
            const cShared = (c.edge + 3) % 6;
            if (cN.q === targetQ && cN.r === targetR && cShared === targetEdge) return true;
        }

        return false;
    }

    revealAdjacentTiles(q, r, edgeIndex) {
        const newlyRevealed = [];

        // Check current tile
        const key1 = `${q},${r}`;
        if (this.map.has(key1)) {
            const tile = this.map.get(key1);
            if (!tile.revealed) {
                tile.revealed = true;
                newlyRevealed.push(tile);
            }
        }

        // Check neighbor tile
        const n = this.getNeighbor(q, r, edgeIndex);
        const key2 = `${n.q},${n.r}`;
        if (this.map.has(key2)) {
            const tile = this.map.get(key2);
            if (!tile.revealed) {
                tile.revealed = true;
                newlyRevealed.push(tile);
            }
        }

        return newlyRevealed;
    }

    moveHero(q, r, edgeIndex) {
        if (this.resources.fuel < 1) {
            return { success: false, reason: "Not enough Fuel" };
        }

        if (!this.isValidMove(q, r, edgeIndex)) {
            return { success: false, reason: "Invalid move: Must be adjacent edge" };
        }

        this.resources.fuel -= 1;
        this.hero.location = { q, r, edgeIndex };

        // Reveal adjacent tiles and check for encounters
        const newTiles = this.revealAdjacentTiles(q, r, edgeIndex);
        const encounters = [];

        for (const tile of newTiles) {
            // Draw encounter
            const card = this.encounterManager.drawCard(this.threatLevel);
            encounters.push({
                tile: tile,
                card: card
            });
            // For now, just handle the first one to avoid UI stack overflow?
            // Or return all.
        }

        return { success: true, encounters: encounters };
    }

    increaseThreat() {
        this.threatTrack++;
        if (this.threatTrack >= this.maxThreatTrack) {
            this.threatTrack = 0;
            this.threatLevel++;
            if (this.threatLevel > 3) {
                // Game Over condition check handled in UI or specific method
                return { gameOver: true };
            }
        }
        return { gameOver: false, level: this.threatLevel, track: this.threatTrack };
    }

    handleEncounterFailure() {
        this.hero.health -= 1;
        // Check death
        if (this.hero.health <= 0) {
            // Respawn logic
            this.respawnHero();
        }
        return this.increaseThreat();
    }

    gainXp(amount) {
        this.hero.xp += amount;
        // Level up every 3 XP
        const newLevel = Math.floor(this.hero.xp / 3) + 1;
        if (newLevel > this.hero.level) {
            this.hero.level = newLevel;
            // Level up bonus? GDD says "+1 Combat Die".
            // We can represent this as a stat increase or just track level.
            // Let's increase a random stat or just keep level.
            // For now, just level up.
            return { levelUp: true, level: newLevel };
        }
        return { levelUp: false };
    }

    addLoot(item) {
        this.hero.hand.push(item);
        // Update stats based on item bonus
        if (item.slot === 'weapon') {
            this.hero.stats.strength += item.bonus || 0;
        } else if (item.slot === 'tech') {
            this.hero.stats.tech += item.bonus || 0;
        } else if (item.slot === 'body') {
            // Maybe defense or health?
            this.hero.health += item.bonus || 0; // Heal? Or Max Health?
        }
    }

    respawnHero() {
        // Logic to move hero to nearest outpost and set inactive
        // For prototype, just reset health and move to HQ
        this.hero.health = 3;
        this.hero.location = { q: 0, r: 0, edgeIndex: 0 };
        // Inactive logic to be added
    }

    moveAlienPatrol(q, r) {
        const key = `${q},${r}`;
        const tile = this.map.get(key);

        if (!tile || !tile.revealed) {
            return { success: false, reason: "Can only move patrol to revealed tiles" };
        }

        // Remove from old location
        if (this.alienPatrolLocation) {
            const oldKey = this.alienPatrolLocation;
            const oldTile = this.map.get(oldKey);
            if (oldTile) oldTile.alienPatrol = false;
        }

        // Set new location
        tile.alienPatrol = true;
        this.alienPatrolLocation = key;

        return { success: true };
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

        const slots = [];
        // Base slot: Needs total damage
        slots.push({ type: 'any', value: 3 + level, label: 'Health' });

        // Armor slot (requires Strength)
        if (level > 0) {
            slots.push({ type: 'str', value: 2 + level, label: 'Armor' });
        }

        // Evasion slot (requires Tactics)
        if (level > 2) {
            slots.push({ type: 'tac', value: 3 + level, label: 'Evasion' });
        }

        return {
            type: 'combat',
            enemyType: alienType,
            level: level,
            health: 3 + level * 2, // Keep for legacy display or remove
            armor: level,
            damage: 2 + level,
            slots: slots,
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

    upgradeToFortress(q, r) {
        const key = `${q},${r}`;
        const tile = this.map.get(key);

        if (!tile || !tile.outpost) {
            return { success: false, reason: "Must have an Outpost to upgrade" };
        }

        if (tile.fortress) {
            return { success: false, reason: "Already a Fortress" };
        }

        // Cost: 2 Scrap, 3 Alloy
        if (this.resources.scrap < 2 || this.resources.alloy < 3) {
            return { success: false, reason: "Not enough resources (need 2 Scrap, 3 Alloy)" };
        }

        // Pay costs
        this.resources.scrap -= 2;
        this.resources.alloy -= 3;

        tile.fortress = true;
        this.victoryPoints++; // +1 VP (Total 2 for Fortress vs 1 for Outpost)

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

        return { discarded, threatLevel: this.threatLevel, needsPatrolMove: true };
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
