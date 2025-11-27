import { HexGrid } from './hex_grid.js';
import { GameManager } from './game_manager.js';
import { CombatSystem } from './combat.js';
import { IsometricView } from './isometric_view.js';
import { CombatUI } from './combat_ui.js';
import { ACTION_COSTS, getCostDisplayData, canAfford } from './action_costs.js';

// Calculate responsive canvas size based on available board area
function getCanvasSize() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate sidebar widths based on media queries
    let leftSidebar, rightSidebar;
    if (viewportWidth <= 900) {
        leftSidebar = 180;
        rightSidebar = 200;
    } else if (viewportWidth <= 1024) {
        leftSidebar = 200;
        rightSidebar = 220;
    } else if (viewportWidth <= 1200) {
        leftSidebar = 220;
        rightSidebar = 240;
    } else {
        leftSidebar = 280;
        rightSidebar = 300;
    }
    
    // Available space for canvas (subtract sidebars and padding)
    const availableWidth = viewportWidth - leftSidebar - rightSidebar - 30;
    const availableHeight = viewportHeight - 50;
    
    // For a hex grid with radius 3 (7 hexes diameter):
    // Width needs: ~7 * hexSize * sqrt(3) ≈ 12.1 * hexSize
    // Height needs: ~7 * hexSize * 1.5 + hexSize ≈ 11.5 * hexSize (with isometric scaling)
    const hexSizeByWidth = Math.floor(availableWidth / 12.5);
    const hexSizeByHeight = Math.floor(availableHeight / 10);
    const hexSize = Math.max(30, Math.min(hexSizeByWidth, hexSizeByHeight, 60)); // Min 30, max 60
    
    // Canvas size to fit the hex grid with padding
    const width = Math.floor(hexSize * 12.5);
    const height = Math.floor(hexSize * 10);
    
    return { width, height, hexSize };
}

const canvasSize = getCanvasSize();

// Initialize game systems
const game = new GameManager();
const grid = new HexGrid('hex-grid-canvas', canvasSize.width, canvasSize.height, canvasSize.hexSize);
const isoView = new IsometricView('hex-grid-canvas', grid);
const combat = new CombatSystem(game);
const combatUI = new CombatUI(combat, game);

// Global state
let selectedHex = null;
let hoveredTile = null;
let hoveredEdge = null;
let buildMode = null; // 'outpost' or 'fortress' or null
let moveMode = false; // Track if move mode is active
let setupOutpostTile = null; // Track where outpost was placed

const ACTION_BUTTON_CONFIG = [
    { id: 'btn-move', costKey: 'moveHero', requiredPhase: 'action', condition: () => !game.activePlayer.extractedThisTurn },
    { id: 'btn-extract', costKey: 'extract', requiredPhase: 'action', condition: () => !game.activePlayer.movedThisTurn && !game.activePlayer.extractedThisTurn },
    { id: 'btn-build-outpost', costKey: 'buildOutpost', requiredPhase: 'action' },
    { id: 'btn-upgrade-fortress', costKey: 'upgradeFortress', requiredPhase: 'action' }
];

function renderActionButtonCosts() {
    ACTION_BUTTON_CONFIG.forEach(({ id, costKey }) => {
        const button = document.getElementById(id);
        if (!button) return;

        const costContainer = button.querySelector('.btn-cost');
        if (!costContainer) return;

        const key = costContainer.dataset.costKey || costKey;
        const cost = ACTION_COSTS[key];
        if (!cost) {
            costContainer.textContent = '';
            return;
        }

        const parts = getCostDisplayData(cost)
            .map(entry => `<span class="cost-item">${entry.icon}${entry.amount}</span>`)
            .join('');
        costContainer.innerHTML = parts;
    });
}

function init() {
    console.log("Initializing game...");
    console.log("Map size:", game.map.size);
    updateUI();
    isoView.render(game.map, null, game.players);
    renderActionButtonCosts();
    console.log("Render called.");

    // Event Listeners
    document.getElementById('btn-roll-dice').addEventListener('click', handleRollDice);
    document.getElementById('btn-move').addEventListener('click', handleMove);
    document.getElementById('btn-build-outpost').addEventListener('click', handleBuildOutpost);
    document.getElementById('btn-upgrade-fortress').addEventListener('click', handleUpgradeFortress);
    document.getElementById('btn-extract').addEventListener('click', handleExtract);
    document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);
    
    // Trade modal
    document.getElementById('btn-trade').addEventListener('click', openTradeModal);
    document.getElementById('btn-confirm-trade').addEventListener('click', confirmTrade);
    document.getElementById('btn-cancel-trade').addEventListener('click', closeTradeModal);
    document.getElementById('trade-give').addEventListener('change', updateTradeAvailable);

    // Canvas interaction
    const canvas = document.getElementById('hex-grid-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (buildMode) {
                buildMode = null;
                document.body.style.cursor = 'default';
                log("❌ Build mode cancelled", 'warning');
                isoView.render(game.map, null, game.players);
            }
        }
    });

    log(`🎮 MULTIPLAYER SETUP: ${game.activePlayer.name}, click on any tile to place your outpost.`);
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

    // Grit Tokens
    document.getElementById('grit-count').textContent = game.activePlayer.gritTokens;

    // Turn and Phase
    document.getElementById('turn-counter').textContent = game.turn;

    // Display setup phase more clearly
    let phaseText = game.phase;
    if (game.phase === 'setup') {
        const step = game.setupStep;
        const playerName = game.activePlayer.name;
        if (step === 0) phaseText = `${playerName}: Place Outpost`;
        else if (step === 1) phaseText = `${playerName}: Place Hero`;
        else if (step === 2) phaseText = `${playerName}: Place Outpost`;
        else if (step === 3) phaseText = `${playerName}: Place Hero`;
    } else {
        phaseText = `${game.activePlayer.name} - ${game.phase}`;
    }
    const phaseDisplay = document.getElementById('phase-display');
    if (phaseDisplay) {
        phaseDisplay.textContent = phaseText;
        phaseDisplay.style.color = game.activePlayer.color;
    }

    // Threat Level
    document.getElementById('threat-value').textContent = `${game.threatLevel} (Track: ${game.threatTrack}/5)`;

    // Hero
    const hero = game.hero;
    const player = game.activePlayer;
    
    // Update hero name with player color
    document.getElementById('hero-name').textContent = player.name;
    document.getElementById('hero-name').style.color = player.color;
    
    // Update inactive status
    const inactiveStatus = document.getElementById('hero-inactive-status');
    const inactiveTurns = hero.inactiveTurns || 0;
    if (inactiveTurns > 0) {
        inactiveStatus.classList.remove('hidden');
        document.getElementById('inactive-turns').textContent = inactiveTurns;
    } else {
        inactiveStatus.classList.add('hidden');
    }
    
    // Update elimination status
    const eliminatedStatus = document.getElementById('hero-eliminated-status');
    if (player.eliminated) {
        eliminatedStatus.classList.remove('hidden');
    } else {
        eliminatedStatus.classList.add('hidden');
    }
    
    // Update death count
    document.getElementById('death-count').textContent = hero.deathCount || 0;
    
    // Calculate total stats from base + gear
    const totalStats = {
        tactics: hero.stats.tactics,
        strength: hero.stats.strength,
        tech: hero.stats.tech
    };

    // Add gear bonuses
    ['suit', 'weapon'].forEach(slot => {
        const item = hero.gear[slot];
        if (item) {
            if (item.tactics) totalStats.tactics += item.tactics;
            if (item.strength) totalStats.strength += item.strength;
            if (item.tech) totalStats.tech += item.tech;
        }
    });

    // Update stats display
    document.getElementById('stat-tac').textContent = totalStats.tactics;
    document.getElementById('stat-str').textContent = totalStats.strength;
    document.getElementById('stat-tech').textContent = totalStats.tech;

    // Update Gear Display
    ['suit', 'weapon'].forEach(slot => {
        const el = document.getElementById(`gear-${slot}`);
        if (!el) return;
        
        const item = hero.gear[slot];
        if (item) {
            const stats = [];
            if (item.tactics) stats.push(`+${item.tactics} Tac`);
            if (item.strength) stats.push(`+${item.strength} Str`);
            if (item.tech) stats.push(`+${item.tech} Tech`);
            el.textContent = `${item.name} (${stats.join(', ')})`;
        } else {
            el.textContent = '-';
        }
    });

    // Check win condition
    if (game.victoryPoints >= 10) {
        log("🎉 VICTORY! You reached 10 Victory Points!", 'success');
        document.getElementById('btn-roll-dice').disabled = true;
    }

    // Update button states based on resources
    updateButtonStates();
}

function updateButtonStates() {
    ACTION_BUTTON_CONFIG.forEach(({ id, costKey, requiredPhase, condition }) => {
        const button = document.getElementById(id);
        if (!button) return;

        const phaseAllowed = !requiredPhase || game.phase === requiredPhase;
        const cost = ACTION_COSTS[costKey];
        const affordable = canAfford(game.resources, cost);
        const conditionMet = condition ? condition() : true;

        button.disabled = !(phaseAllowed && affordable && conditionMet);
    });
    
    // Roll Dice - only in production phase
    const btnRoll = document.getElementById('btn-roll-dice');
    if (btnRoll) {
        btnRoll.disabled = game.phase !== 'production';
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

    // Passive income at start of turn (before dice roll)
    const passiveIncome = game.gatherPassiveIncome();
    if (passiveIncome.fuel > 0 || passiveIncome.food > 0) {
        const items = [];
        if (passiveIncome.fuel > 0) items.push(`${passiveIncome.fuel} fuel`);
        if (passiveIncome.food > 0) items.push(`${passiveIncome.food} food`);
        log(`🏠 ${game.activePlayer.name} gained: ${items.join(', ')} (outpost passive)`, 'success');
    }

    const roll = game.rollDice();
    log(`🎲 Rolled: ${roll.d1} + ${roll.d2} = ${roll.total}`);

    if (roll.total === 7) {
        const invasionResult = game.handleInvasion();
        log(`⚠️ INVASION! Threat Level: ${invasionResult.threatLevel}`, 'danger');

        if (invasionResult.discardedByPlayer) {
            for (const [playerId, discarded] of Object.entries(invasionResult.discardedByPlayer)) {
                const total = Object.values(discarded).reduce((a, b) => a + b, 0);
                if (total > 0) {
                    const player = game.players.find(p => p.id == playerId);
                    log(`💀 ${player ? player.name : 'Player'} discarded ${total} resources!`, 'danger');
                }
            }
        }

    } else {
        const playerGains = game.harvest(roll.total);
        if (playerGains) {
            // Display gains for each player
            game.players.forEach(player => {
                const gains = playerGains[player.id];
                const items = [];
                for (const [res, amt] of Object.entries(gains)) {
                    if (amt > 0) items.push(`${amt} ${res}`);
                }
                if (items.length > 0) {
                    log(`📦 ${player.name} gained: ${items.join(', ')} (dice roll: ${roll.total})`, 'success');
                }
            });
        }
    }

    game.phase = 'action';
    updateUI();
    isoView.render(game.map, selectedHex, game.players);
}

function handleEndTurn() {
    // Reset modes
    moveMode = false;
    buildMode = null;
    document.body.style.cursor = 'default';
    
    const result = game.endTurn();
    
    log(`--- Turn ${game.turn} ---`);
    log(`👉 Next Player: ${result.nextPlayer}`);

    // Display food consumption
    if (result.distance > 0) {
        if (result.foodConsumed > 0) {
            log(`🍏 Consumed ${result.foodConsumed} Food`, 'warning');
        }

        if (result.heroReturned) {
            log(`⚠️ Not enough food! Hero returned to nearest outpost`, 'danger');
            isoView.render(game.map, selectedHex, game.players);
        }
    }

    updateUI();
}

function handleCanvasMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const flat = isoView.isoToFlat(mouseX, mouseY);

    // SETUP PHASE
    if (game.phase === 'setup') {
        const step = game.setupStep;

        if (step === 0 || step === 2) {
            const hex = grid.pixelToHex(flat.x, flat.y);
            hoveredTile = hex;
            isoView.render(game.map, hoveredTile, game.players, null);
        } else if (step === 1 || step === 3) {
            const edgeData = grid.getClosestEdge(flat.x, flat.y);
            isoView.render(game.map, null, game.players, edgeData);
        }
        return;
    }

    // BUILD MODE
    if (buildMode) {
        const hex = grid.pixelToHex(flat.x, flat.y);
        const tile = game.map.get(`${hex.q},${hex.r}`);
        if (tile && tile.revealed) {
            isoView.render(game.map, hex, game.players, null);
        } else {
            isoView.render(game.map, null, game.players, null);
        }
        return;
    }

    // MOVE MODE - show edge highlights
    if (moveMode) {
        const edgeData = grid.getClosestEdge(flat.x, flat.y);
        isoView.render(game.map, selectedHex, game.players, edgeData);
        return;
    }

    // ACTION PHASE (no special mode)
    if (game.phase === 'action') {
        isoView.render(game.map, selectedHex, game.players, null);
        return;
    }

    // PRODUCTION PHASE
    if (game.phase === 'production') {
        isoView.render(game.map, selectedHex, game.players, null);
        return;
    }
}

function handleCanvasClick(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const flat = isoView.isoToFlat(mouseX, mouseY);

    console.log("Canvas clicked at:", mouseX, mouseY);
    console.log("Game phase:", game.phase);
    console.log("Setup outpost tile:", setupOutpostTile);

    // SETUP PHASE
    if (game.phase === 'setup') {
        const step = game.setupStep;
        const currentPlayerName = game.activePlayer.name; // Capture before placement (may switch player)
        
        if (step === 0 || step === 2) {
            const hex = grid.pixelToHex(flat.x, flat.y);
            const result = game.handleInitialPlacement(hex.q, hex.r, null);
            if (result.success) {
                log(`🏠 ${currentPlayerName} placed an outpost!`, 'success');
                // Log resources gained from initial placement
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`📦 ${currentPlayerName} gained: ${items.join(', ')} (tile bonus)`, 'success');
                    }
                }
                updateUI();
                isoView.render(game.map, null, game.players);
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        } else if (step === 1 || step === 3) {
            const edgeData = grid.getClosestEdge(flat.x, flat.y);
            const result = game.handleInitialPlacement(edgeData.q, edgeData.r, edgeData.edgeIndex);
            if (result.success) {
                // Log resources gained from newly revealed tiles
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`📦 ${currentPlayerName} gained: ${items.join(', ')} (exploration)`, 'success');
                    }
                }
                updateUI();
                isoView.render(game.map, null, game.players);
                if (result.step === 'setup_complete') {
                    log(`🎉 Setup complete! ${game.activePlayer.name} goes first.`, 'success');
                }
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        }
        return;
    }

    // BUILD MODE
    if (buildMode) {
        const hex = grid.pixelToHex(flat.x, flat.y);
        selectedHex = hex;
        if (buildMode === 'outpost') {
            const result = game.buildOutpost(hex.q, hex.r);
            if (result.success) {
                log(`🏠 Outpost built!`, 'success');
                buildMode = null;
                selectedHex = null;
                document.body.style.cursor = 'default';
                isoView.render(game.map, null, game.players);
                updateUI();
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        } else if (buildMode === 'fortress') {
            const result = game.upgradeToFortress(hex.q, hex.r);
            if (result.success) {
                log(`🏰 Upgraded to Fortress!`, 'success');
                buildMode = null;
                selectedHex = null;
                document.body.style.cursor = 'default';
                isoView.render(game.map, null, game.players);
                updateUI();
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        }
        return;
    }

    // ACTION PHASE - MOVE MODE
    if (game.phase === 'action' && moveMode) {
        const edgeData = grid.getClosestEdge(flat.x, flat.y);
        const mid = grid.getEdgeMidpoint(edgeData.q, edgeData.r, edgeData.edgeIndex);
        const dist = Math.sqrt(Math.pow(flat.x - mid.x, 2) + Math.pow(flat.y - mid.y, 2));

        if (dist < 40) {
            const result = game.moveHero(edgeData.q, edgeData.r, edgeData.edgeIndex);
            if (result.success) {
                if (result.movedToOutpost) log("🏃 Hero moved to outpost edge (FREE)!", 'success');
                else log("🏃 Hero moved! (-2 Fuel)", 'success');
                
                // Log resources gained from newly revealed tiles
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`📦 ${game.activePlayer.name} gained: ${items.join(', ')} (exploration)`, 'success');
                    }
                }
                
                updateUI();
                isoView.render(game.map, selectedHex, game.players);

                if (result.pendingEncounterTiles && result.pendingEncounterTiles.length > 0) {
                    setTimeout(() => {
                        const tile = result.pendingEncounterTiles[0];
                        showEncounterLevelSelection(tile);
                    }, 500);
                }
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        } else {
            log("❌ Click closer to an edge to move", 'warning');
        }
        return;
    }
}

// Encounter level selection
let pendingEncounterTile = null;

function showEncounterLevelSelection(tile) {
    pendingEncounterTile = tile;
    const modal = document.getElementById('level-select-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

window.selectEncounterLevel = function(level) {
    if (!pendingEncounterTile) return;
    
    const encounter = game.drawEncounterForTile(pendingEncounterTile, level);
    const modal = document.getElementById('level-select-modal');
    if (modal) modal.classList.add('hidden');
    
    log(`⚠️ Level ${level} Encounter: ${encounter.card.title}`, 'warning');
    combatUI.show({
        tile: encounter.tile,
        encounterCard: encounter.card
    });
    
    pendingEncounterTile = null;
};

// Global functions
window.claimRewards = function() {
    const reward = combat.currentEncounter.reward;
    const player = game.activePlayer;
    const encounterLevel = combat.currentEncounter.tile?.encounterLevel || 1;
    
    // Award victory points equal to encounter level
    player.victoryPoints += encounterLevel;
    log(`🏆 +${encounterLevel} Victory Point${encounterLevel > 1 ? 's' : ''} (Level ${encounterLevel} encounter)`, 'success');
    
    if (reward.equipment) {
        game.equipGear(reward.equipment);
        log(`🎁 Equipped: ${reward.equipment.name} (${reward.equipment.slot})`, 'success');
    }
    if (reward.resources) {
        const items = [];
        for (const [res, amt] of Object.entries(reward.resources)) {
            player.resources[res] += amt;
            if (amt > 0) items.push(`${amt} ${res}`);
        }
        log(`💎 ${player.name} gained: ${items.join(', ')} (combat reward)`, 'success');
    }
    
    combatUI.close();
    updateUI();
    isoView.render(game.map, null, game.players);
};

window.acceptDefeat = function() {
    const player = game.activePlayer;
    for (const res in player.resources) {
        player.resources[res] = Math.floor(player.resources[res] / 2);
    }
    
    // Award 2 grit tokens on defeat
    player.gritTokens += 2;
    log(`⚫ +2 Grit Tokens (defeat bonus)`, 'info');
    
    const defeatResult = game.defeatHero(player.id);
    if (defeatResult.eliminated) {
        log(`💀 ${player.name} eliminated!`, 'danger');
        if (defeatResult.winner) {
             alert(`${defeatResult.winner.name} wins by elimination!`);
             location.reload();
        }
    } else {
        log(`💀 Hero defeated!`, 'danger');
    }
    
    combatUI.close();
    updateUI();
    isoView.render(game.map, null, game.players);
};

window.log = log;
window.updateUI = updateUI;
window.combatUI = combatUI; // Expose for grit spending UI

// ...

function handleMove() {
    if (game.phase !== 'action') {
        log("❌ Can only move during action phase", 'warning');
        return;
    }

    if (game.activePlayer.extractedThisTurn) {
        log("❌ Cannot move after extracting this turn", 'warning');
        return;
    }

    moveMode = !moveMode; // Toggle move mode
    buildMode = null; // Cancel build mode if active
    
    if (moveMode) {
        document.body.style.cursor = 'crosshair';
        log("🏃 Move mode: Click an adjacent edge to move your hero", 'warning');
    } else {
        document.body.style.cursor = 'default';
        log("Move mode cancelled", 'info');
    }
    isoView.render(game.map, selectedHex, game.players, null);
}

function handleBuildOutpost() {
    if (game.phase !== 'action') {
        log("❌ Can only build during action phase", 'warning');
        return;
    }

    moveMode = false; // Cancel move mode if active
    buildMode = 'outpost';
    document.body.style.cursor = 'crosshair';
    log("🏠 Build Outpost mode: Click a revealed tile adjacent to your hero", 'warning');
}

function handleUpgradeFortress() {
    if (game.phase !== 'action') {
        log("❌ Can only upgrade during action phase", 'warning');
        return;
    }

    moveMode = false; // Cancel move mode if active
    buildMode = 'fortress';
    document.body.style.cursor = 'crosshair';
    log("🏰 Upgrade Fortress mode: Click an existing outpost to upgrade", 'warning');
}

function handleExtract() {
    const result = game.extractResources();
    if (result.success) {
        const items = [];
        for (const [res, amt] of Object.entries(result.gains)) {
            if (amt > 0) items.push(`${amt} ${res}`);
        }
        log(`⛏️ Extracted resources: ${items.join(', ')}`, 'success');
        updateUI();
    } else {
        log(`❌ ${result.reason}`, 'warning');
    }
}

function showCombatModal(encounter) {
    const modal = document.getElementById('combat-modal');
    
    // Get encounter data
    const card = encounter.encounterCard;
    const enemy = card.enemy;
    const reward = card.reward;
    
    // Initialize combat with the card
    combat.initiateCombat(card);
    
    // Set encounter level badge
    const levelBadge = document.getElementById('encounter-level-badge');
    const encounterLevel = encounter.tile.encounterLevel || 1;
    levelBadge.textContent = `Level ${encounterLevel}`;
    levelBadge.style.background = encounterLevel === 3 ? '#F44336' : encounterLevel === 2 ? '#FFC107' : '#4CAF50';
    
    // Set encounter name and description
    document.querySelector('.encounter-name').textContent = card.title || 'Unknown Enemy';
    document.querySelector('.encounter-description').textContent = card.description || 'A dangerous foe blocks your path...';
    
    // Build requirements list
    const requirementsList = document.getElementById('requirements-list');
    requirementsList.innerHTML = '';
    
    const statConfig = {
        tac: { label: 'Tactics', icon: '🎯', class: 'tactics' },
        str: { label: 'Strength', icon: '💪', class: 'strength' },
        tech: { label: 'Tech', icon: '🔧', class: 'tech' },
        tactics: { label: 'Tactics', icon: '🎯', class: 'tactics' },
        strength: { label: 'Strength', icon: '💪', class: 'strength' }
    };
    
    enemy.slots.forEach(slot => {
        const config = statConfig[slot.type] || { label: slot.type, icon: '❓', class: '' };
        const reqItem = document.createElement('div');
        reqItem.className = `requirement-item ${config.class}`;
        reqItem.innerHTML = `
            <div class="requirement-icon">${config.icon}</div>
            <div class="requirement-value">${slot.value}+</div>
            <div class="requirement-label">${config.label}</div>
        `;
        requirementsList.appendChild(reqItem);
    });
    
    // Build rewards section
    const gearReward = document.getElementById('gear-reward');
    const resourceRewards = document.getElementById('resource-rewards');
    
    // Display Equipment Reward
    if (reward.equipment) {
        const eq = reward.equipment;
        const gearStats = [];
        if (eq.tactics) gearStats.push(`<span class="gear-stat tactics">🎯 +${eq.tactics} Tactics</span>`);
        if (eq.strength) gearStats.push(`<span class="gear-stat strength">💪 +${eq.strength} Strength</span>`);
        if (eq.tech) gearStats.push(`<span class="gear-stat tech">🔧 +${eq.tech} Tech</span>`);
        
        gearReward.innerHTML = `
            <div class="gear-name">${eq.name || 'Equipment'}</div>
            <div class="gear-stats">${gearStats.join('')}</div>
        `;
        gearReward.style.display = 'block';
    } else {
        gearReward.style.display = 'none';
    }
    
    // Resource rewards
    const resourceIcons = {
        scrap: '🔩',
        fuel: '⚡',
        food: '🍏',
        alloy: '🔮',
        intel: '💾'
    };
    
    resourceRewards.innerHTML = '';
    if (reward.resources) {
        for (const [res, amt] of Object.entries(reward.resources)) {
            if (amt > 0) {
                const resItem = document.createElement('div');
                resItem.className = 'resource-reward-item';
                resItem.innerHTML = `<span>${resourceIcons[res] || '❓'}</span><span>${amt}</span>`;
                resourceRewards.appendChild(resItem);
            }
        }
    }
    
    // Handle empty rewards
    if (!reward.equipment && (!reward.resources || Object.keys(reward.resources).length === 0)) {
        resourceRewards.innerHTML = '<div style="text-align: center; color: var(--text-dim);">Small stash of resources</div>';
    }
    
    // Reset phases
    document.getElementById('combat-phase').classList.add('hidden');
    document.getElementById('result-phase').classList.add('hidden');
    document.getElementById('initial-actions').style.display = 'flex';
    
    modal.classList.remove('hidden');
}

function closeCombatModal() {
    const modal = document.getElementById('combat-modal');
    modal.classList.add('hidden');
    
    // Reset button visibility
    document.getElementById('btn-fight').style.display = '';
    document.getElementById('btn-retreat').style.display = '';
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
    .player-dice {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-bottom: 20px;
    }
    .dice-item {
        width: 70px;
        height: 70px;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        position: relative;
        transition: transform 0.2s;
        background: #333;
    }
    .dice-item.rolling {
        animation: roll 0.3s infinite linear;
    }
    .dice-item.tactics { background: linear-gradient(135deg, #FFD700, #FFA000); }
    .dice-item.strength { background: linear-gradient(135deg, #F44336, #C62828); }
    .dice-item.tech { background: linear-gradient(135deg, #40C4FF, #0288D1); }
    
    .dice-icon { font-size: 1.4em; margin-bottom: 2px; }
    .dice-value { font-size: 1.6em; line-height: 1; }
    .dice-label { font-size: 0.6em; text-transform: uppercase; opacity: 0.9; margin-top: 2px; }

    /* Result Styles */
    .result-banner {
        font-size: 2.5em;
        font-weight: 800;
        text-align: center;
        padding: 25px;
        border-radius: 12px;
        margin-bottom: 20px;
        text-transform: uppercase;
        letter-spacing: 3px;
        animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .result-banner.victory {
        background: linear-gradient(135deg, #43a047, #66bb6a);
        color: white;
        box-shadow: 0 0 25px rgba(76, 175, 80, 0.6);
        border: 2px solid #81c784;
    }
    .result-banner.defeat {
        background: linear-gradient(135deg, #d32f2f, #ef5350);
        color: white;
        box-shadow: 0 0 25px rgba(244, 67, 54, 0.6);
        border: 2px solid #e57373;
    }
    .result-message {
        text-align: center;
        font-size: 1.3em;
        color: #f0f0f0;
        margin-bottom: 30px;
        line-height: 1.6;
        font-weight: 300;
    }
    
    @keyframes roll {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(5deg); }
        75% { transform: rotate(-5deg); }
        100% { transform: rotate(0deg); }
    }
    @keyframes popIn {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    
    .enemy-card {
        text-align: center;
        padding: 15px;
        background: rgba(244, 67, 54, 0.1);
        border: 2px solid #f44336;
        border-radius: 8px;
    }
`;
document.head.appendChild(style);

// Trade Modal Functions
function openTradeModal() {
    document.getElementById('trade-modal').classList.remove('hidden');
    updateTradeAvailable();
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
}

function updateTradeAvailable() {
    const giveType = document.getElementById('trade-give').value;
    const available = game.resources[giveType];
    document.getElementById('trade-give-available').textContent = `(${available} available)`;
}

function confirmTrade() {
    const giveType = document.getElementById('trade-give').value;
    const receiveType = document.getElementById('trade-receive').value;
    
    if (giveType === receiveType) {
        log("❌ Cannot trade same resource type", 'warning');
        return;
    }
    
    if (game.resources[giveType] < 4) {
        log(`❌ Need at least 4 ${giveType} to trade`, 'warning');
        return;
    }
    
    // Execute trade: -4 give, +1 receive
    game.resources[giveType] -= 4;
    game.resources[receiveType] += 1;
    
    log(`🔄 Traded 4 ${giveType} for 1 ${receiveType}`, 'success');
    
    closeTradeModal();
    updateUI();
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
