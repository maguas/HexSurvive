import { EncounterManager } from './encounter_manager.js';
import { ACTION_COSTS, formatCostString, canAfford, applyCost } from './action_costs.js';

export class GameManager {
    constructor() {
        this.encounterManager = new EncounterManager();

        // Multiplayer Setup
        this.players = [
            this.createPlayer(1, "Commander Red", "#f44336"),
            this.createPlayer(2, "Commander Blue", "#2196f3")
        ];
        this.activePlayerIndex = 0;

        // ...
        this.threatLevel = 1;
        this.threatTrack = 0; // 0-5
        this.maxThreatTrack = 5;
        // ...

        this.map = new Map();
        this.turn = 1;
        this.phase = 'setup';
        this.setupStep = 0; // 0=P1 Outpost, 1=P1 Hero, 2=P2 Outpost, 3=P2 Hero
        this.currentEncounter = null;

        // Initialize map with HQ
        this.initMap();
    }

    createPlayer(id, name, color) {
        return {
            id,
            name,
            color,
            resources: {
                scrap: 0,
                fuel: 0,
                food: 0,
                alloy: 0,
                intel: 0
            },
            hero: {
                location: null,
                stats: {
                    tactics: 0,
                    strength: 0,
                    tech: 0
                },
                health: 3,
                inactiveTurns: 0,  // Tracks turns hero is inactive after defeat
                deathCount: 0,      // Tracks total defeats (eliminate at 3)
                gear: {             // Equipped items by slot
                    suit: null,
                    weapon: null
                }
            },
            victoryPoints: 0,
            gritTokens: 0,           // Earned on defeat (2 per defeat), spend to boost dice
            eliminated: false,       // Player eliminated after 3 defeats
            encountersResolved: 0,   // Track encounters per turn
            extractedThisTurn: false, // Track extraction action (cannot move after extracting)
            movedThisTurn: false      // Track movement action (cannot extract after moving)
        };
    }

    get activePlayer() {
        return this.players[this.activePlayerIndex];
    }

    get resources() {
        return this.activePlayer.resources;
    }

    get hero() {
        return this.activePlayer.hero;
    }

    get victoryPoints() {
        return this.activePlayer.victoryPoints;
    }

    set victoryPoints(val) {
        this.activePlayer.victoryPoints = val;
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

                const distanceFromCenter = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
                
                this.map.set(`${q},${r}`, {
                    type: type,
                    revealed: false, // All start hidden
                    q: q,
                    r: r,
                    numberToken: null,
                    outpost: false,
                    level: distanceFromCenter // Distance from center
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

        // Setup Steps:
        // 0: P1 Outpost
        // 1: P1 Hero
        // 2: P2 Outpost
        // 3: P2 Hero

        if (this.setupStep === 0 || this.setupStep === 2) {
            // Place Outpost
            if (tile.outpost) return { success: false, reason: "Tile already has an outpost" };

            tile.outpost = true;
            tile.ownerId = this.activePlayer.id; // Track ownership
            tile.revealed = true;

            // Generate number token if not barren and not already set
            if (tile.type !== 'barren' && !tile.numberToken) {
                tile.numberToken = this.generateNumberToken();
            }

            // Grant 1 resource of the tile type to the active player
            const resourceType = this.getTileResourceType(tile.type);
            const resourcesGained = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
            if (resourceType) {
                console.log(`💰 ${this.activePlayer.name} placed outpost on ${tile.type} - gaining 1 ${resourceType}`);
                this.activePlayer.resources[resourceType] += 1;
                resourcesGained[resourceType] = 1;
            }

            this.activePlayer.victoryPoints++;

            this.setupStep++;
            return { success: true, step: 'outpost_placed', resourcesGained: resourcesGained };
        }
        else if (this.setupStep === 1 || this.setupStep === 3) {
            // Place Hero
            this.activePlayer.hero.location = { q, r, edgeIndex };
            const revealResult = this.revealAdjacentTiles(q, r, edgeIndex);

            this.setupStep++;

            if (this.setupStep === 2) {
                // Switch to Player 2
                this.activePlayerIndex = 1;
                return { success: true, step: 'switch_player', resourcesGained: revealResult.resourcesGained };
            }

            if (this.setupStep === 4) {
                // End setup
                this.activePlayerIndex = 0; // Back to P1
                this.phase = 'production';
                return { success: true, step: 'setup_complete', resourcesGained: revealResult.resourcesGained };
            }

            return { success: true, step: 'hero_placed', resourcesGained: revealResult.resourcesGained };
        }

        return { success: false };
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
        const resourcesGained = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };

        // Check current tile
        const key1 = `${q},${r}`;
        if (this.map.has(key1)) {
            const tile = this.map.get(key1);
            
            // If not yet revealed, reveal it and give token + resource
            if (!tile.revealed) {
                tile.revealed = true;
                if (tile.type !== 'barren') {
                    tile.numberToken = this.generateNumberToken();
                }
                console.log(`📍 Revealed tile at (${q}, ${r}): ${tile.type} with token ${tile.numberToken}`);
                newlyRevealed.push(tile);
                
                // Grant 1 resource from newly revealed tile
                const resourceType = this.getTileResourceType(tile.type);
                if (resourceType) {
                    this.activePlayer.resources[resourceType] += 1;
                    resourcesGained[resourceType] += 1;
                }
            }
        }

        // Check neighbor tile
        const n = this.getNeighbor(q, r, edgeIndex);
        const key2 = `${n.q},${n.r}`;
        if (this.map.has(key2)) {
            const tile = this.map.get(key2);
            
            // If not yet revealed, reveal it and give token + resource
            // LIMIT: Only 1 reveal per move
            if (!tile.revealed) {
                if (newlyRevealed.length === 0) {
                    tile.revealed = true;
                    if (tile.type !== 'barren') {
                        tile.numberToken = this.generateNumberToken();
                    }
                    console.log(`📍 Revealed neighbor at (${n.q}, ${n.r}): ${tile.type} with token ${tile.numberToken}`);
                    newlyRevealed.push(tile);
                    
                    // Grant 1 resource from newly revealed tile
                    const resourceType = this.getTileResourceType(tile.type);
                    if (resourceType) {
                        this.activePlayer.resources[resourceType] += 1;
                        resourcesGained[resourceType] += 1;
                    }
                } else {
                    console.log("⚠️ Skipped revealing neighbor due to 1-reveal limit");
                }
            }
        }

        console.log(`🔍 Total newly revealed tiles: ${newlyRevealed.length}`);
        return { newlyRevealed, resourcesGained };
    }

    moveHero(q, r, edgeIndex) {
        // Check if hero extracted this turn (cannot move after extracting)
        if (this.activePlayer.extractedThisTurn) {
            return { success: false, reason: "Cannot move after extracting this turn." };
        }
        
        // Check encounter limit
        if (this.activePlayer.encountersResolved > 0) {
            return { success: false, reason: "Cannot move after resolving an encounter this turn." };
        }

        // Check if destination edge is on an outpost tile (either side of the edge)
        const tile1 = this.map.get(`${q},${r}`);
        const neighbor = this.getNeighbor(q, r, edgeIndex);
        const tile2 = this.map.get(`${neighbor.q},${neighbor.r}`);

        const movingToOutpost = (tile1 && tile1.outpost) || (tile2 && tile2.outpost);
        const moveCost = ACTION_COSTS.moveHero;

        // Moving to outpost edges is FREE, otherwise costs resources
        if (!movingToOutpost && !canAfford(this.resources, moveCost)) {
            return {
                success: false,
                reason: `Not enough resources (need ${formatCostString(moveCost)} or move to an outpost edge for free)`
            };
        }

        if (!this.isValidMove(q, r, edgeIndex)) {
            return { success: false, reason: "Invalid move: Must be adjacent edge" };
        }

        // Only consume resources if NOT moving to an outpost
        if (!movingToOutpost) {
            applyCost(this.resources, moveCost);
        }

        this.hero.location = { q, r, edgeIndex };
        this.activePlayer.movedThisTurn = true;

        // Reveal adjacent tiles
        const revealResult = this.revealAdjacentTiles(q, r, edgeIndex);
        const newTiles = revealResult.newlyRevealed;

        // Return pending tiles that need encounter level selection (limit 1 per turn)
        const pendingEncounterTiles = [];
        for (const tile of newTiles) {
            if (this.activePlayer.encountersResolved >= 1) {
                console.log("⚠️ Encounter limit reached for this turn (1/1)");
                continue;
            }
            pendingEncounterTiles.push(tile);
            this.activePlayer.encountersResolved++;
        }

        return { 
            success: true, 
            pendingEncounterTiles: pendingEncounterTiles,
            movedToOutpost: movingToOutpost,
            resourcesGained: revealResult.resourcesGained
        };
    }

    drawEncounterForTile(tile, chosenLevel) {
        // Player chooses encounter level (1, 2, or 3)
        const level = Math.max(1, Math.min(3, chosenLevel));
        tile.encounterLevel = level; // Store chosen level on tile for VP calculation
        const card = this.encounterManager.drawCard(level);
        return {
            tile: tile,
            card: card,
            level: level
        };
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

    equipGear(item) {
        if (!item || !item.slot) return;
        
        const slot = item.slot;
        if (slot !== 'suit' && slot !== 'weapon') return;
        
        // Replace existing gear in that slot
        this.hero.gear[slot] = item;
    }

    respawnHero() {
        // Logic to move hero to nearest outpost and set inactive
        // For prototype, just reset health and move to HQ
    }

    defeatHero(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;
        
        // Increment death count
        player.hero.deathCount++;
        
        // Check for elimination (3 deaths)
        if (player.hero.deathCount >= 3) {
            player.eliminated = true;
            player.hero.location = null; // Remove from board
            console.log(`💀 ${player.name} has been eliminated after 3 defeats!`);
            
            // Check if only one player remains
            const remainingPlayers = this.players.filter(p => !p.eliminated);
            if (remainingPlayers.length === 1) {
                console.log(`🏆 ${remainingPlayers[0].name} wins by elimination!`);
                return { eliminated: true, winner: remainingPlayers[0] };
            }
            
            return { eliminated: true, winner: null };
        }
        
        // Find nearest owned outpost
        /*const nearestOutpost = this.findNearestOutpost(player);
        
        if (nearestOutpost) {
            // Respawn at nearest outpost edge (pick any edge)
            player.hero.location = {
                q: nearestOutpost.q,
                r: nearestOutpost.r,
                edgeIndex: 0  // Default edge
            };
        } else {
            // No outposts - respawn at center
            player.hero.location = {
                q: 0,
                r: 0,
                edgeIndex: 0
            };
        }*/
        
        // Mark as inactive for 2 turns
        player.hero.inactiveTurns = 2;
        
        // Increase threat
        this.threatTrack++;
        if (this.threatTrack >= 5) {
            this.threatLevel++;
            this.threatTrack = 0;
        }
        
        return { eliminated: false, deathCount: player.hero.deathCount };
    }

    findNearestOutpost(player) {
        let nearest = null;
        let minDistance = Infinity;
        
        if (!player.hero.location) return null;
        
        for (const [key, tile] of this.map) {
            if (tile.outpost && tile.ownerId === player.id) {
                const distance = this.calculateDistance(
                    player.hero.location.q,
                    player.hero.location.r,
                    tile.q,
                    tile.r
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = tile;
                }
            }
        }
        
        return nearest;
    }

    calculateDistance(q1, r1, q2, r2) {
        // Hex distance formula
        return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs((q1 + r1) - (q2 + r2))) / 2;
    }

    rollDice() {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        return { d1, d2, total: d1 + d2 };
    }

    harvest(rollValue) {
        if (rollValue === 7) {
            return null; // Invasion event
        }

        console.log(`🎲 Harvest roll: ${rollValue}`);

        // Track gains per player
        const playerGains = {};
        this.players.forEach(player => {
            playerGains[player.id] = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
        });

        // For each player, get their hero-adjacent tiles
        const playerAdjacentTiles = {};
        this.players.forEach(player => {
            playerAdjacentTiles[player.id] = [];
            if (player.hero.location) {
                const heroQ = player.hero.location.q;
                const heroR = player.hero.location.r;
                const heroEdge = player.hero.location.edgeIndex;

                // Add the tile the hero's edge is on
                playerAdjacentTiles[player.id].push({ q: heroQ, r: heroR });

                // Add the neighbor tile across the edge
                const neighbor = this.getNeighbor(heroQ, heroR, heroEdge);
                playerAdjacentTiles[player.id].push({ q: neighbor.q, r: neighbor.r });
            }
        });

        // Check ALL tiles on the map
        this.map.forEach((tile) => {
            if (tile.revealed && tile.numberToken === rollValue) {
                
                // Check each player for production
                this.players.forEach(player => {
                    const isHeroAdjacent = playerAdjacentTiles[player.id].some(
                        ht => ht.q === tile.q && ht.r === tile.r
                    );
                    const hasOutpost = tile.outpost && tile.ownerId === player.id;

                    // Produce if either: hero is adjacent OR player owns the outpost
                    if (isHeroAdjacent || hasOutpost) {
                        const amount = tile.fortress ? 2 : 1;
                        const resourceType = this.getTileResourceType(tile.type);
                        
                        if (resourceType) {
                            playerGains[player.id][resourceType] += amount;
                            player.resources[resourceType] += amount;
                        }
                    }
                });
            }
        });

        return playerGains;
    }

    getTileResourceType(tileType) {
        const mapping = {
            'ruins': 'scrap',
            'wasteland': 'fuel',
            'overgrown': 'food',
            'crash_site': 'alloy',
            'bunker': 'intel'
        };
        return mapping[tileType] || null;
    }

    explore(q, r) {
        const key = `${q},${r}`;
        const tile = this.map.get(key);

        if (!tile || tile.revealed) {
            return { success: false, reason: "Tile already explored or doesn't exist" };
        }

        const exploreCost = ACTION_COSTS.explore;
        if (!canAfford(this.resources, exploreCost)) {
            return { success: false, reason: `Not enough resources (need ${formatCostString(exploreCost)})` };
        }

        // Check if adjacent to revealed tile
        if (!this.isAdjacentToRevealed(q, r)) {
            return { success: false, reason: "Must explore adjacent to revealed tiles" };
        }

        // Pay costs
        applyCost(this.resources, exploreCost);

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
        const gearTypes = ['suit', 'weapon'];
        const slot = gearTypes[Math.floor(Math.random() * gearTypes.length)];
        const names = {
            suit: ['Scout Armor', 'Power Suit', 'Exo-Skeleton', 'Hazmat Gear'],
            weapon: ['Plasma Rifle', 'Omni-Tool', 'Laser Cutter', 'Rail Gun']
        };

        const item = {
            slot: slot,
            name: names[slot][Math.floor(Math.random() * names[slot].length)]
        };
        
        const bonus = level + 1;
        
        // Simple stat distribution
        if (slot === 'suit') {
            // Suits focus on Strength (Defense) and Tech (Utility)
            if (Math.random() > 0.5) item.strength = bonus;
            else item.tech = bonus;
            
            if (level > 1) item.tactics = 1;
        } else {
            // Weapons focus on Tactics (Aim) and Strength (Force)
            if (Math.random() > 0.5) item.tactics = bonus;
            else item.strength = bonus;
            
            if (level > 1) item.tech = 1;
        }

        return item;
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

        const buildCost = ACTION_COSTS.buildOutpost;
        if (!canAfford(this.resources, buildCost)) {
            return { success: false, reason: `Not enough resources (need ${formatCostString(buildCost)})` };
        }

        // Pay costs
        applyCost(this.resources, buildCost);

        tile.outpost = true;
        tile.ownerId = this.activePlayer.id; // Assign owner
        this.activePlayer.victoryPoints++;

        return { success: true };
    }

    extractResources() {
        // Check if already extracted this turn
        if (this.activePlayer.extractedThisTurn) {
            return { success: false, reason: "Already extracted this turn." };
        }

        // Check if hero moved this turn (cannot extract after moving)
        if (this.activePlayer.movedThisTurn) {
            return { success: false, reason: "Cannot extract after moving this turn." };
        }

        const cost = ACTION_COSTS.extract;
        if (!canAfford(this.resources, cost)) {
            return { success: false, reason: `Not enough resources (need ${formatCostString(cost)})` };
        }

        const heroLoc = this.hero.location;
        if (!heroLoc) {
            return { success: false, reason: "Hero location invalid" };
        }

        // Pay costs
        applyCost(this.resources, cost);

        // Gather from adjacent tiles (Tile 1 and Neighbor)
        const gains = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
        const tilesToCheck = [];
        
        // Tile 1 (Current q,r)
        tilesToCheck.push({ q: heroLoc.q, r: heroLoc.r });
        
        // Tile 2 (Neighbor across edge)
        const neighbor = this.getNeighbor(heroLoc.q, heroLoc.r, heroLoc.edgeIndex);
        tilesToCheck.push({ q: neighbor.q, r: neighbor.r });

        tilesToCheck.forEach(pos => {
            const tile = this.map.get(`${pos.q},${pos.r}`);
            if (tile && tile.revealed) {
                const res = this.getTileResourceType(tile.type);
                if (res) {
                    this.resources[res]+=2;
                    gains[res]+=2;
                }
            }
        });

        this.activePlayer.extractedThisTurn = true;
        return { success: true, gains };
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

        const upgradeCost = ACTION_COSTS.upgradeFortress;
        if (!canAfford(this.resources, upgradeCost)) {
            return { success: false, reason: `Not enough resources (need ${formatCostString(upgradeCost)})` };
        }

        // Pay costs
        applyCost(this.resources, upgradeCost);

        tile.fortress = true;
        this.victoryPoints++; // +1 VP (Total 2 for Fortress vs 1 for Outpost)

        return { success: true };
    }

    handleInvasion() {
        this.threatLevel++;

        // Discard half resources if > 7 for ALL players
        const discardedByPlayer = {};

        this.players.forEach(player => {
            let discarded = { scrap: 0, fuel: 0, food: 0, alloy: 0, intel: 0 };
            const totalResources = Object.values(player.resources).reduce((a, b) => a + b, 0);

            if (totalResources > 7) {
                for (let key in player.resources) {
                    const half = Math.floor(player.resources[key] / 2);
                    discarded[key] = half;
                    player.resources[key] -= half;
                }
            }
            discardedByPlayer[player.id] = discarded;
        });

        return { discardedByPlayer, threatLevel: this.threatLevel };
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
                    fortress: false
                });
            }
        });
    }

    getDistanceToNearestOutpost() {
        if (!this.hero.location) return 0;

        let minDistance = Infinity;

        this.map.forEach((tile) => {
            if (tile.outpost) {
                // Calculate hex distance from hero to this outpost
                const heroQ = this.hero.location.q;
                const heroR = this.hero.location.r;
                const distance = (Math.abs(heroQ - tile.q) + Math.abs(heroR - tile.r) + Math.abs((heroQ + heroR) - (tile.q + tile.r))) / 2;

                if (distance < minDistance) {
                    minDistance = distance;
                }
            }
        });

        return minDistance === Infinity ? 0 : Math.floor(minDistance);
    }

    getNearestOutpost() {
        if (!this.hero.location) return null;

        let nearestOutpost = null;
        let minDistance = Infinity;

        this.map.forEach((tile) => {
            if (tile.outpost) {
                const heroQ = this.hero.location.q;
                const heroR = this.hero.location.r;
                const distance = (Math.abs(heroQ - tile.q) + Math.abs(heroR - tile.r) + Math.abs((heroQ + heroR) - (tile.q + tile.r))) / 2;

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestOutpost = { q: tile.q, r: tile.r };
                }
            }
        });

        return nearestOutpost;
    }

    endTurn() {
        // Decrement inactive turns for current player
        if (this.activePlayer.hero.inactiveTurns > 0) {
            this.activePlayer.hero.inactiveTurns--;
        }
        
        // Calculate food consumption based on distance to nearest outpost
        const distance = this.getDistanceToNearestOutpost();
        const foodNeeded = distance;

        let heroReturned = false;
        if (foodNeeded > 0) {
            if (this.resources.food >= foodNeeded) {
                // Consume food
                this.resources.food -= foodNeeded;
            } else {
                // Not enough food - hero returns to nearest outpost
                const nearestOutpost = this.getNearestOutpost();
                if (nearestOutpost) {
                    this.hero.location = { q: nearestOutpost.q, r: nearestOutpost.r, edgeIndex: 0 };
                    heroReturned = true;
                }
            }
        }

        // Switch Player - skip eliminated players
        let attempts = 0;
        do {
            this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
            attempts++;
            
            // If back to Player 1, increment turn counter
            if (this.activePlayerIndex === 0) {
                this.turn++;
            }
            
            // Safety check to avoid infinite loop
            if (attempts > this.players.length) break;
        } while (this.activePlayer.eliminated);

        // Reset flags for the new player
        this.activePlayer.encountersResolved = 0;
        this.activePlayer.extractedThisTurn = false;
        this.activePlayer.movedThisTurn = false;

        this.phase = 'production';

        return {
            foodConsumed: foodNeeded <= this.resources.food ? foodNeeded : 0,
            foodNeeded: foodNeeded,
            heroReturned: heroReturned,
            distance: distance,
            nextPlayer: this.activePlayer.name
        };
    }

    // Passive income: 1 fuel + 1 food per outpost (2 each for fortress) at start of turn
    gatherPassiveIncome() {
        let fuelGain = 0;
        let foodGain = 0;
        
        this.map.forEach(tile => {
            if (tile.outpost && tile.ownerId === this.activePlayer.id) {
                if (tile.fortress) {
                    fuelGain += 2;
                    foodGain += 2;
                } else {
                    fuelGain += 1;
                    foodGain += 1;
                }
            }
        });
        
        this.resources.fuel += fuelGain;
        this.resources.food += foodGain;
        
        return { fuel: fuelGain, food: foodGain };
    }
}
