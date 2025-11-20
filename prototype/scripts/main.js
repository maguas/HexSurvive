import { HexGrid } from './hex_grid.js';
import { GameManager } from './game_manager.js';
import { CombatSystem } from './combat.js';

// Initialize game systems
const game = new GameManager();
const grid = new HexGrid('hex-grid-canvas', 900, 650);
const combat = new CombatSystem(game);

// Global state
let selectedHex = null;
let hoveredTile = null;
let hoveredEdge = null;
let patrolMode = false;
let setupOutpostTile = null; // Track where outpost was placed

function init() {
    // game.initGame();
    console.log("Initializing game...");
    console.log("Map size:", game.map.size);
    updateUI();
    grid.render(game.map);
    console.log("Render called.");

    // Event Listeners
    document.getElementById('btn-roll-dice').addEventListener('click', handleRollDice);
    // document.getElementById('btn-explore').addEventListener('click', toggleExploreMode);
    document.getElementById('btn-build-outpost').addEventListener('click', handleBuildOutpost);
    document.getElementById('btn-upgrade-fortress').addEventListener('click', handleUpgradeFortress);
    // document.getElementById('btn-train').addEventListener('click', handleTrainHero);
    document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);

    // Canvas interaction
    const canvas = document.getElementById('hex-grid-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);

    // Combat modal buttons
    document.getElementById('btn-fight').addEventListener('click', handleFight);
    document.getElementById('btn-retreat').addEventListener('click', handleRetreat);

    log("🎮 SETUP: Click on any tile to place your initial Outpost.");
}

function updateUI() {
    // Resources
    document.getElementById('res-scrap').textContent = game.resources.scrap;
    document.getElementById('res-fuel').textContent = game.resources.fuel;
    document.getElementById('res-food').textContent = game.resources.food;
    document.getElementById('res-alloy').textContent = game.resources.alloy;
    document.getElementById('res-intel').textContent = game.resources.intel;

    // Victory Points
    document.getElementById('vp-count').textContent = game.victoryPoints;

    // Turn and Phase
    document.getElementById('turn-counter').textContent = game.turn;

    // Display setup phase more clearly
    let phaseText = game.phase;
    if (game.phase === 'setup') {
        phaseText = setupOutpostTile ? 'Setup: Place Hero' : 'Setup: Place Outpost';
    }
    document.getElementById('phase-display').textContent = phaseText;

    // Threat Level
    document.getElementById('threat-value').textContent = `${game.threatLevel} (Track: ${game.threatTrack}/5)`;

    // Hero
    const hero = game.hero;
    document.getElementById('hero-level').textContent = hero.level;
    document.getElementById('hero-xp').textContent = hero.xp;
    // document.getElementById('hero-xp-next').textContent = hero.xpToNext; // Removed in new rules
    document.getElementById('stat-tac').textContent = hero.stats.tactics;
    document.getElementById('stat-str').textContent = hero.stats.strength;
    document.getElementById('stat-tech').textContent = hero.stats.tech;

    // Gear / Hand
    const gearList = hero.hand.map(item => `${item.name} (+${item.bonus} ${item.slot})`).join(', ');
    document.getElementById('gear-body').textContent = gearList || 'None';
    document.getElementById('gear-head').textContent = '-'; // Placeholder
    document.getElementById('gear-weapon').textContent = '-'; // Placeholder
    document.getElementById('gear-tech').textContent = '-'; // Placeholder;

    // Check win condition
    if (game.victoryPoints >= 10) {
        log("🎉 VICTORY! You reached 10 Victory Points!", 'success');
        document.getElementById('btn-roll-dice').disabled = true;
    }
}

function handleRollDice() {
    if (game.phase !== 'production') {
        log("❌ Can only roll dice during production phase", 'warning');
        return;
    }

    if (game.phase === 'setup') {
        log("❌ Complete setup first", 'warning');
        return;
    }

    const roll = game.rollDice();
    log(`🎲 Rolled: ${roll.d1} + ${roll.d2} = ${roll.total}`);

    if (roll.total === 7) {
        const invasionResult = game.handleInvasion();
        log(`⚠️ INVASION! Threat Level: ${invasionResult.threatLevel}`, 'danger');

        if (invasionResult.discarded) {
            const total = Object.values(invasionResult.discarded).reduce((a, b) => a + b, 0);
            if (total > 0) {
                log(`💀 Discarded ${total} resources!`, 'danger');
            }
        }

        if (invasionResult.needsPatrolMove) {
            patrolMode = true;
            document.body.style.cursor = 'crosshair';
            log("👁️ Click a revealed tile to move the Alien Patrol", 'warning');
        }
    } else {
        const gains = game.harvest(roll.total);
        if (gains) {
            let msg = '📦 Gained: ';
            const items = [];
            for (const [res, amt] of Object.entries(gains)) {
                if (amt > 0) items.push(`${amt} ${res}`);
            }
            if (items.length > 0) {
                log(msg + items.join(', '), 'success');
            }
        }
    }

    game.phase = 'action';
    updateUI();
    grid.render(game.map, selectedHex, game.hero.location);
}

function handleEndTurn() {
    const result = game.endTurn();

    // Passive resource income at start of turn
    let fuelGained = 0;
    let foodGained = 0;

    game.map.forEach((tile) => {
        if (tile.outpost) {
            if (tile.fortress) {
                fuelGained += 2;
                foodGained += 2;
            } else {
                fuelGained += 1;
                foodGained += 1;
            }
        }
    });

    game.resources.fuel += fuelGained;
    game.resources.food += foodGained;

    log(`--- Turn ${game.turn} ---`);
    log(`⚡ +${fuelGained} Fuel, 🍏 +${foodGained} Food (from outposts)`, 'success');

    // Display food consumption
    if (result.distance > 0) {
        if (result.foodConsumed > 0) {
            log(`🍏 Consumed ${result.foodConsumed} Food (${result.distance} tiles from outpost)`, 'warning');
        }

        if (result.heroReturned) {
            log(`⚠️ Not enough food! Hero returned to nearest outpost`, 'danger');
            grid.render(game.map, selectedHex, game.hero.location);
        }
    }

    updateUI();
}

function handleFight() {
    // Combat handling is done via resolveEncounter
}

function handleRetreat() {
    const result = combat.retreat();
    log(result.message, 'warning');
    closeCombatModal();
    updateUI();
}

function handleCanvasMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const heroLoc = game.hero && game.hero.location ? game.hero.location : null;

    // SETUP PHASE: Highlight tiles or edges based on step
    if (game.phase === 'setup') {
        if (!setupOutpostTile) {
            // Phase 1: Placing outpost - highlight tiles
            const hex = grid.pixelToHex(mouseX, mouseY);
            hoveredTile = hex;
            hoveredEdge = null;
            grid.render(game.map, hoveredTile, heroLoc, null);
        } else {
            // Phase 2: Placing hero - highlight edges around outpost tile only
            const edgeData = grid.getClosestEdge(mouseX, mouseY);

            if (edgeData.q === setupOutpostTile.q && edgeData.r === setupOutpostTile.r) {
                hoveredEdge = edgeData;
                hoveredTile = null;
                grid.render(game.map, null, heroLoc, hoveredEdge);
            } else {
                hoveredEdge = null;
                grid.render(game.map, null, heroLoc, null);
            }
        }
        return;
    }

    // PATROL MODE: Highlight tiles only
    if (patrolMode) {
        const hex = grid.pixelToHex(mouseX, mouseY);
        const tile = game.map.get(`${hex.q},${hex.r}`);

        if (tile && tile.revealed) {
            hoveredTile = hex;
            grid.render(game.map, hoveredTile, heroLoc, null);
        } else {
            grid.render(game.map, null, heroLoc, null);
        }
        return;
    }

    // ACTION PHASE: Highlight edges for movement
    if (game.phase === 'action') {
        const edgeData = grid.getClosestEdge(mouseX, mouseY);
        hoveredEdge = edgeData;
        hoveredTile = null;
        grid.render(game.map, selectedHex, heroLoc, hoveredEdge);
        return;
    }

    // PRODUCTION PHASE: No highlights
    if (game.phase === 'production') {
        grid.render(game.map, selectedHex, heroLoc, null);
        return;
    }
}

function handleCanvasClick(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    console.log("Canvas clicked at:", mouseX, mouseY);
    console.log("Game phase:", game.phase);
    console.log("Setup outpost tile:", setupOutpostTile);

    // ===== SETUP PHASE =====
    if (game.phase === 'setup') {
        if (!setupOutpostTile) {
            // STEP 1: Place outpost on tile
            const hex = grid.pixelToHex(mouseX, mouseY);
            const key = `${hex.q},${hex.r}`;
            const tile = game.map.get(key);

            if (!tile) {
                log("❌ Invalid tile", 'warning');
                return;
            }

            // Place outpost
            tile.outpost = true;
            tile.revealed = true;
            tile.numberToken = game.generateNumberToken();
            game.victoryPoints++;
            setupOutpostTile = { q: hex.q, r: hex.r };

            log("🏠 Outpost placed! Now click on an edge around the outpost to place your Hero.", 'success');
            updateUI();
            grid.render(game.map, null, null, null);
        } else {
            // STEP 2: Place hero on edge
            const edgeData = grid.getClosestEdge(mouseX, mouseY);

            // Validate edge is on outpost tile
            if (edgeData.q !== setupOutpostTile.q || edgeData.r !== setupOutpostTile.r) {
                log("❌ Hero must be placed on an edge of the outpost tile", 'warning');
                return;
            }

            // Place hero
            game.hero.location = { q: edgeData.q, r: edgeData.r, edgeIndex: edgeData.edgeIndex };

            // Reveal adjacent tiles
            game.revealAdjacentTiles(edgeData.q, edgeData.r, edgeData.edgeIndex);

            // End setup
            game.phase = 'production';
            setupOutpostTile = null;

            log("🦸 Hero placed! Click 'Roll Dice' to begin your turn.", 'success');
            updateUI();
            grid.render(game.map, null, game.hero.location, null);
        }
        return;
    }

    // ===== PATROL MODE (Tile clicks only) =====
    if (patrolMode) {
        const hex = grid.pixelToHex(mouseX, mouseY);
        const key = `${hex.q},${hex.r}`;
        const tile = game.map.get(key);

        if (!tile || !tile.revealed) {
            log("❌ Can only move patrol to revealed tiles", 'warning');
            return;
        }

        const result = game.moveAlienPatrol(hex.q, hex.r);
        if (result.success) {
            log("👽 Alien Patrol moved!", 'success');
            patrolMode = false;
            document.body.style.cursor = 'default';
            updateUI();
            grid.render(game.map, selectedHex, game.hero.location);
        } else {
            log(`❌ ${result.reason}`, 'warning');
        }
        return;
    }

    // ===== ACTION PHASE (Edge clicks for movement only) =====
    if (game.phase === 'action') {
        const edgeData = grid.getClosestEdge(mouseX, mouseY);
        const mid = grid.getEdgeMidpoint(edgeData.q, edgeData.r, edgeData.edgeIndex);
        const dist = Math.sqrt(Math.pow(mouseX - mid.x, 2) + Math.pow(mouseY - mid.y, 2));

        // Threshold for edge click (40px)
        if (dist < 40) {
            // Attempt move
            const result = game.moveHero(edgeData.q, edgeData.r, edgeData.edgeIndex);
            if (result.success) {
                if (result.movedToOutpost) {
                    log("🏃 Hero moved to outpost edge (FREE)!", 'success');
                } else {
                    log("🏃 Hero moved! (-2 Fuel)", 'success');
                }
                updateUI();
                grid.render(game.map, selectedHex, game.hero.location);

                // Handle Encounters
                if (result.encounters && result.encounters.length > 0) {
                    // For prototype, just handle the first one
                    const encounter = result.encounters[0];
                    log(`⚠️ Encounter at ${encounter.tile.type}: ${encounter.card.title}`, 'warning');
                    showEncounterModal(encounter.card);
                }
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
            return;
        } else {
            log("❌ Click closer to an edge to move", 'warning');
        }
        return;
    }

    // ===== PRODUCTION PHASE (No clicks allowed) =====
    if (game.phase === 'production') {
        log("❌ Roll dice first to enter action phase", 'warning');
        return;
    }
}

// ...

function showEncounterModal(card) {
    if (card.type === 'stash') {
        log(`🎁 Found Stash: ${card.title}`, 'success');
        applyReward(card.reward);
        return;
    }

    // Combat or Hazard
    const modal = document.getElementById('combat-modal');
    const combatInfo = document.getElementById('combat-info');
    const combatDiceArea = document.getElementById('combat-dice-area');

    // Initiate Combat
    const combatData = combat.initiateCombat(card);

    // Display Enemy
    combatInfo.innerHTML = `
        <div class="enemy-card">
            <h3>${card.title} (Lvl ${card.level})</h3>
            <p>${card.description}</p>
            <div class="enemy-stats">
                <div>🛡️ Defense: ${card.enemy.defense}</div>
                <div>🎲 Slots: ${card.enemy.slots.map(s => `${s.value} ${s.type}`).join(', ')}</div>
            </div>
            <div class="enemy-reward">
                Reward: ${card.reward.type === 'xp' ? 'XP Cube' : card.reward.item.name}
            </div>
        </div>
    `;

    // Display Player Dice
    combatDiceArea.innerHTML = `
        <h4>Your Dice:</h4>
        <div class="dice-container">
            ${combat.getDiceHTML(combatData.playerDice)}
        </div>
    `;

    // Setup buttons
    document.getElementById('btn-fight').onclick = () => resolveEncounter();
    document.getElementById('btn-retreat').onclick = () => handleRetreat();

    modal.classList.remove('hidden');
}

function resolveEncounter() {
    const result = combat.resolveCombat();

    if (result.victory) {
        log(`✅ Victory!`, 'success');
        applyReward(result.reward);
    } else {
        log(`❌ Defeat! ${result.message}`, 'danger');
        const threatResult = game.handleEncounterFailure();
        if (threatResult.gameOver) {
            alert("GAME OVER! The Alien Threat has overwhelmed you.");
            location.reload();
        }
        log(`Threat increased to Level ${threatResult.level} (Track: ${threatResult.track}/5)`, 'danger');
    }

    closeCombatModal();
    updateUI();
}

function applyReward(reward) {
    if (reward.type === 'xp') {
        const result = game.gainXp(reward.value);
        log(`✨ Gained ${reward.value} XP Cube! (Total: ${game.hero.xp})`, 'success');
        if (result.levelUp) {
            log(`🆙 Level Up! +1 Combat Die`, 'success');
        }
    } else if (reward.type === 'loot') {
        game.addLoot(reward.item);
        log(`🎒 Looted: ${reward.item.name}`, 'success');
    }
    updateUI();
}

function handleBuildOutpost() {
    if (!selectedHex) {
        log("❌ Select a tile first", 'warning');
        return;
    }

    const result = game.buildOutpost(selectedHex.q, selectedHex.r);

    if (result.success) {
        log(`🏠 Outpost built! +1 VP (Total: ${game.victoryPoints})`, 'success');
        grid.render(game.map);
        updateUI();
    } else {
        log(`❌ ${result.reason}`, 'warning');
    }
}

function handleUpgradeFortress() {
    if (!selectedHex) {
        log("❌ Select an Outpost first", 'warning');
        return;
    }

    const result = game.upgradeToFortress(selectedHex.q, selectedHex.r);

    if (result.success) {
        log(`🏰 Upgraded to Fortress! +1 VP (Total: ${game.victoryPoints})`, 'success');
        grid.render(game.map);
        updateUI();
    } else {
        log(`❌ ${result.reason}`, 'warning');
    }
}

function handleTrainHero() {
    const result = game.trainHero();

    if (result.success) {
        if (result.levelUp) {
            log(`🎓 Hero leveled up to Level ${game.playerHero.level}!`, 'success');
        } else {
            log(`📚 Hero trained! +${result.xpGain} XP`, 'success');
        }
        updateUI();
    } else {
        log(`❌ ${result.reason}`, 'warning');
    }
}

function showCombatModal(encounter) {
    const modal = document.getElementById('combat-modal');
    const combatInfo = document.getElementById('combat-info');
    const combatDiceArea = document.getElementById('combat-dice-area');

    // Initialize combat
    const combatData = combat.initiateCombat(encounter);

    // Show enemy info
    combatInfo.innerHTML = combat.getEnemyHTML(encounter);

    // Show player dice
    combatDiceArea.innerHTML = `
        <h4>Your Dice:</h4>
        <div class="dice-container">
            ${combat.getDiceHTML(combatData.playerDice)}
        </div>
        <div style="margin-top: 10px;">
            <small>Total: ${combatData.playerDice.reduce((sum, d) => sum + d.value, 0)}</small>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeCombatModal() {
    document.getElementById('combat-modal').classList.add('hidden');
}

function log(msg, type = '') {
    const logEl = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `> ${msg}`;
    logEl.prepend(entry);

    // Keep only last 50 entries
    while (logEl.children.length > 50) {
        logEl.removeChild(logEl.lastChild);
    }
}

// Add CSS for combat dice
const style = document.createElement('style');
style.textContent = `
    .dice-container {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
    }
    .combat-die {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .die-value {
        font-size: 1.5rem;
    }
    .die-number {
        font-size: 0.8rem;
    }
    .enemy-card {
        text-align: center;
        padding: 15px;
        background: rgba(244, 67, 54, 0.1);
        border: 2px solid #f44336;
        border-radius: 8px;
    }
    .enemy-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 10px 0;
    }
    .enemy-reward {
        margin-top: 10px;
        color: #ffd700;
    }
`;
document.head.appendChild(style);

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
