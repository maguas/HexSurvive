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
let buildMode = null; // 'outpost' or 'fortress' or null
let setupOutpostTile = null; // Track where outpost was placed

function init() {
    // game.initGame();
    console.log("Initializing game...");
    console.log("Map size:", game.map.size);
    updateUI();
    grid.render(game.map, null, game.players);
    console.log("Render called.");

    // Event Listeners
    document.getElementById('btn-roll-dice').addEventListener('click', handleRollDice);
    // document.getElementById('btn-explore').addEventListener('click', toggleExploreMode);
    document.getElementById('btn-build-outpost').addEventListener('click', handleBuildOutpost);
    document.getElementById('btn-upgrade-fortress').addEventListener('click', handleUpgradeFortress);
    document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);

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
                grid.render(game.map, null, game.players);
            }
        }
    });

    // Combat modal buttons
    document.getElementById('btn-fight').addEventListener('click', handleFight);
    document.getElementById('btn-retreat').addEventListener('click', handleRetreat);

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

    hero.hand.forEach(item => {
        if (item.tactics) totalStats.tactics += item.tactics;
        if (item.strength) totalStats.strength += item.strength;
        if (item.tech) totalStats.tech += item.tech;
    });

    // Update stats display
    document.getElementById('stat-tac').textContent = totalStats.tactics;
    document.getElementById('stat-str').textContent = totalStats.strength;
    document.getElementById('stat-tech').textContent = totalStats.tech;

    // Reset Gear Slots
    ['head', 'body', 'weapon', 'tech'].forEach(slot => {
        const el = document.getElementById(`gear-${slot}`);
        if (el) el.textContent = '-';
    });

    // Update Gear Display
    hero.hand.forEach(item => {
        if (item.slot) {
            const el = document.getElementById(`gear-${item.slot}`);
            if (el) {
                const stats = [];
                if (item.tactics) stats.push(`+${item.tactics} Tac`);
                if (item.strength) stats.push(`+${item.strength} Str`);
                if (item.tech) stats.push(`+${item.tech} Tech`);
                el.textContent = `${item.name} (${stats.join(', ')})`;
            }
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
    const res = game.resources;
    
    // Build Outpost (1 scrap, 1 food, 1 fuel)
    const btnOutpost = document.getElementById('btn-build-outpost');
    if (btnOutpost) {
        btnOutpost.disabled = (res.scrap < 1 || res.food < 1 || res.fuel < 1) || game.phase !== 'action';
    }
    
    // Upgrade Fortress (2 scrap, 3 alloy)
    const btnFortress = document.getElementById('btn-upgrade-fortress');
    if (btnFortress) {
        btnFortress.disabled = (res.scrap < 2 || res.alloy < 3) || game.phase !== 'action';
    }
    
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
                    log(`📦 ${player.name} gained: ${items.join(', ')}`, 'success');
                }
            });
        }
    }

    game.phase = 'action';
    updateUI();
    grid.render(game.map, selectedHex, game.players);
}

function handleEndTurn() {
    const result = game.endTurn();

    // Passive resource income at start of turn (per player)
    game.players.forEach(player => {
        let fuelGained = 0;
        let foodGained = 0;

        game.map.forEach((tile) => {
            if (tile.outpost && tile.ownerId === player.id) {
                if (tile.fortress) {
                    fuelGained += 2;
                    foodGained += 2;
                } else {
                    fuelGained += 1;
                    foodGained += 1;
                }
            }
        });

        player.resources.fuel += fuelGained;
        player.resources.food += foodGained;

        if (fuelGained > 0 || foodGained > 0) {
            log(`⚡ ${player.name}: +${fuelGained} Fuel, +${foodGained} Food (from outposts)`, 'success');
        }
    });

    log(`--- Turn ${game.turn} ---`);

    // Display food consumption
    if (result.distance > 0) {
        if (result.foodConsumed > 0) {
            log(`🍏 Consumed ${result.foodConsumed} Food (${result.distance} tiles from outpost)`, 'warning');
        }

        if (result.heroReturned) {
            log(`⚠️ Not enough food! Hero returned to nearest outpost`, 'danger');
            grid.render(game.map, selectedHex, game.players);
        }
    }

    updateUI();
}

function handleFight() {
    // Hide initial actions
    document.getElementById('initial-actions').style.display = 'none';
    
    // Show combat phase
    const combatPhase = document.getElementById('combat-phase');
    combatPhase.classList.remove('hidden');
    
    // Roll dice using combat system (handles gear bonuses)
    const rolledDice = combat.rollHeroDice(game.hero);
    
    const tacticsDice = rolledDice.filter(d => d.type === 'tac').map(d => d.value);
    const strengthDice = rolledDice.filter(d => d.type === 'str').map(d => d.value);
    const techDice = rolledDice.filter(d => d.type === 'tech').map(d => d.value);
    
    // Calculate totals
    const tacticsTotal = tacticsDice.reduce((a, b) => a + b, 0);
    const strengthTotal = strengthDice.reduce((a, b) => a + b, 0);
    const techTotal = techDice.reduce((a, b) => a + b, 0);
    
    // Display dice
    const playerDice = document.getElementById('player-dice');
    playerDice.innerHTML = `
        <div class="dice-item tactics">
            <div class="dice-icon">🎯</div>
            <div class="dice-value">${tacticsTotal}</div>
            <div class="dice-label">Tactics</div>
        </div>
        <div class="dice-item strength">
            <div class="dice-icon">💪</div>
            <div class="dice-value">${strengthTotal}</div>
            <div class="dice-label">Strength</div>
        </div>
        <div class="dice-item tech">
            <div class="dice-icon">🔧</div>
            <div class="dice-value">${techTotal}</div>
            <div class="dice-label">Tech</div>
        </div>
    `;
    
    // Check requirements
    const enemy = combat.currentEncounter.enemy;
    const requirements = {
        tactics: tacticsTotal,
        strength: strengthTotal,
        tech: techTotal,
        tac: tacticsTotal,
        str: strengthTotal
    };
    
    let allMet = true;
    const resolutionHTML = [];
    
    const statConfig = {
        tac: { label: 'Tactics', icon: '🎯' },
        str: { label: 'Strength', icon: '💪' },
        tech: { label: 'Tech', icon: '🔧' },
        tactics: { label: 'Tactics', icon: '🎯' },
        strength: { label: 'Strength', icon: '💪' }
    };
    
    enemy.slots.forEach(slot => {
        const playerValue = requirements[slot.type];
        const met = playerValue >= slot.value;
        if (!met) allMet = false;
        
        const config = statConfig[slot.type] || { label: slot.type, icon: '❓' };
        
        resolutionHTML.push(`
            <div class="resolution-item ${met ? 'success' : 'failure'}">
                <div class="resolution-requirement">
                    <span>${config.icon}</span>
                    <span>${config.label.toUpperCase()}: ${slot.value}+ required</span>
                </div>
                <div class="resolution-result">
                    ${playerValue} ${met ? '✅' : '❌'}
                </div>
            </div>
        `);
    });
    
    document.getElementById('combat-resolution').innerHTML = resolutionHTML.join('');
    
    // Show result after delay
    setTimeout(() => {
        showCombatResult(allMet);
    }, 2000);
}

function handleRetreat() {
    // Halve resources
    const player = game.activePlayer;
    for (const res in player.resources) {
        player.resources[res] = Math.floor(player.resources[res] / 2);
    }
    
    log('🏃 Retreated from combat! Resources halved.', 'warning');
    closeCombatModal();
    updateUI();
    grid.render(game.map, null, game.players);
}

function showCombatResult(victory) {
    // Hide combat phase
    document.getElementById('combat-phase').classList.add('hidden');
    
    // Show result phase
    const resultPhase = document.getElementById('result-phase');
    resultPhase.classList.remove('hidden');
    
    const resultBanner = document.getElementById('result-banner');
    const resultActions = document.getElementById('result-actions');
    
    if (victory) {
        // VICTORY
        resultBanner.className = 'result-banner victory';
        resultBanner.textContent = '🎉 VICTORY! 🎉';
        
        const reward = combat.currentEncounter.reward;
        
        resultActions.innerHTML = `
            <p style="text-align: center; margin-bottom: 15px;">You defeated the enemy! Claim your rewards:</p>
            <button class="action-btn primary" onclick="claimRewards()">✅ Claim Rewards</button>
        `;
        
        log('✅ Victory! All requirements met!', 'success');
    } else {
        // DEFEAT
        resultBanner.className = 'result-banner defeat';
        resultBanner.textContent = '💀 DEFEAT 💀';
        
        resultActions.innerHTML = `
            <p style="text-align: center; margin-bottom: 15px;">You were defeated! Choose which resources to discard:</p>
            <div id="discard-options" style="margin-bottom: 15px;"></div>
            <button class="action-btn danger" onclick="acceptDefeat()">Accept Defeat</button>
        `;
        
        // Show resource discard options
        const discardOptions = document.getElementById('discard-options');
        const player = game.activePlayer;
        const resourceIcons = {
            scrap: '🔩',
            fuel: '⚡',
            food: '🍏',
            alloy: '🔮',
            intel: '💾'
        };
        
        let html = '<div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">';
        for (const [res, amt] of Object.entries(player.resources)) {
            if (amt > 0) {
                const toDiscard = Math.floor(amt / 2);
                html += `
                    <div style="padding: 8px; background: rgba(244,67,54,0.1); border-radius: 6px; text-align: center;">
                        <div>${resourceIcons[res]} ${res}</div>
                        <div style="color: var(--accent-red); font-weight: bold;">${amt} → ${amt - toDiscard}</div>
                    </div>
                `;
            }
        }
        html += '</div>';
        discardOptions.innerHTML = html;
        
        log('❌ Defeat! Requirements not met.', 'danger');
    }
}

window.claimRewards = function() {
    const reward = combat.currentEncounter.reward;
    const player = game.activePlayer;
    
    // Add equipment to hero
    if (reward.equipment) {
        player.hero.hand.push(reward.equipment);
        log(`🎁 Gained equipment: ${reward.equipment.name}`, 'success');
    }
    
    // Add resources
    if (reward.resources) {
        for (const [res, amt] of Object.entries(reward.resources)) {
            player.resources[res] += amt;
        }
        log(`💎 Gained resources!`, 'success');
    }
    
    closeCombatModal();
    updateUI();
    grid.render(game.map, null, game.players);
};

window.acceptDefeat = function() {
    const player = game.activePlayer;
    
    // Halve resources
    for (const res in player.resources) {
        player.resources[res] = Math.floor(player.resources[res] / 2);
    }
    
    // Call defeatHero
    const defeatResult = game.defeatHero(player.id);
    
    if (defeatResult.eliminated) {
        if (defeatResult.winner) {
            log(`💀 ${player.name} eliminated! ${defeatResult.winner.name} wins!`, 'danger');
            alert(`${defeatResult.winner.name} wins by elimination!`);
            location.reload();
            return;
        } else {
            log(`💀 ${player.name} eliminated after 3 defeats!`, 'danger');
        }
    } else {
        log(`💀 Hero defeated! Respawning at nearest outpost (Inactive for 2 turns)`, 'danger');
        log(`☠️ Death count: ${defeatResult.deathCount}/3`, 'warning');
    }
    
    closeCombatModal();
    updateUI();
    grid.render(game.map, null, game.players);
};

function handleCanvasMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const heroLoc = game.hero && game.hero.location ? game.hero.location : null;

    // SETUP PHASE: Highlight tiles or edges based on step
    if (game.phase === 'setup') {
        const step = game.setupStep;

        if (step === 0 || step === 2) {
            // Placing outpost - highlight tiles
            const hex = grid.pixelToHex(mouseX, mouseY);
            hoveredTile = hex;
            hoveredEdge = null;
            grid.render(game.map, hoveredTile, game.players, null);
        } else if (step === 1 || step === 3) {
            // Placing hero - highlight edges
            const edgeData = grid.getClosestEdge(mouseX, mouseY);
            hoveredEdge = edgeData;
            hoveredTile = null;
            grid.render(game.map, null, game.players, hoveredEdge);
        }
        return;
    }

    // BUILD MODE: Highlight tiles only
    if (buildMode) {
        const hex = grid.pixelToHex(mouseX, mouseY);
        const tile = game.map.get(`${hex.q},${hex.r}`);

        if (tile && tile.revealed) {
            hoveredTile = hex;
            grid.render(game.map, hoveredTile, game.players, null);
        } else {
            grid.render(game.map, null, game.players, null);
        }
        return;
    }

    // ACTION PHASE: Highlight edges for movement
    if (game.phase === 'action') {
        const edgeData = grid.getClosestEdge(mouseX, mouseY);
        hoveredEdge = edgeData;
        hoveredTile = null;
        grid.render(game.map, selectedHex, game.players, hoveredEdge);
        return;
    }

    // PRODUCTION PHASE: No highlights
    if (game.phase === 'production') {
        grid.render(game.map, selectedHex, game.players, null);
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
        const step = game.setupStep;

        if (step === 0 || step === 2) {
            // Place Outpost
            const hex = grid.pixelToHex(mouseX, mouseY);
            const result = game.handleInitialPlacement(hex.q, hex.r, null);

            if (result.success) {
                log(`🏠 ${game.activePlayer.name} placed an outpost!`, 'success');
                
                // Log exploration rewards
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`💎 ${game.activePlayer.name} gained: ${items.join(', ')}`, 'success');
                    }
                }
                
                updateUI();
                grid.render(game.map, null, game.players);
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        }
        else if (step === 1 || step === 3) {
            // Place Hero
            const edgeData = grid.getClosestEdge(mouseX, mouseY);
            const result = game.handleInitialPlacement(edgeData.q, edgeData.r, edgeData.edgeIndex);

            if (result.success) {
                const placingPlayer = game.players[result.step === 'switch_player' ? 0 : game.activePlayerIndex];
                
                if (result.step === 'switch_player') {
                    log(`🦸 ${game.players[0].name}'s hero placed!`, 'success');
                } else if (result.step === 'setup_complete') {
                    log(`🦸 ${game.players[1].name}'s hero placed!`, 'success');
                } else {
                    log(`🦸 ${game.activePlayer.name}'s hero placed!`, 'success');
                }
                
                // Log exploration rewards for the placing player
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`💎 ${placingPlayer.name} gained: ${items.join(', ')}`, 'success');
                    }
                }
                
                // Show post-switch messages
                if (result.step === 'switch_player') {
                    log(`➡️ Switching to ${game.activePlayer.name}...`, 'warning');
                } else if (result.step === 'setup_complete') {
                    log(`🎉 Setup complete! ${game.activePlayer.name} goes first. Click 'Roll Dice'!`, 'success');
                }
                
                updateUI();
                grid.render(game.map, null, game.players);
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        }
        return;
    }


    // ===== BUILD MODE (Tile clicks only) =====
    if (buildMode) {
        const hex = grid.pixelToHex(mouseX, mouseY);
        selectedHex = hex;

        if (buildMode === 'outpost') {
            const result = game.buildOutpost(hex.q, hex.r);
            if (result.success) {
                log(`🏠 Outpost built! +1 VP (Total: ${game.victoryPoints})`, 'success');
                buildMode = null;
                document.body.style.cursor = 'default';
                grid.render(game.map, null, game.players);
                updateUI();
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        } else if (buildMode === 'fortress') {
            const result = game.upgradeToFortress(hex.q, hex.r);
            if (result.success) {
                log(`🏰 Upgraded to Fortress! +1 VP (Total: ${game.victoryPoints})`, 'success');
                buildMode = null;
                document.body.style.cursor = 'default';
                grid.render(game.map, null, game.players);
                updateUI();
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
        }
        return;
    }

    // ===== ACTION PHASE (Edge clicks for movement only) =====
    if (game.phase === 'action' && !buildMode) {
        // Check if hero is inactive or player is eliminated
        if (game.activePlayer.hero.inactiveTurns > 0) {
            log(`❌ Your hero is inactive for ${game.activePlayer.hero.inactiveTurns} more turn(s)`, 'warning');
            return;
        }
        
        if (game.activePlayer.eliminated) {
            log(`❌ You have been eliminated from the game`, 'danger');
            return;
        }
        
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
                
                // Log newly revealed tiles
                if (result.encounters && result.encounters.length > 0) {
                    result.encounters.forEach((enc, idx) => {
                        const tile = enc.tile;
                        log(`🗺️ Revealed: ${tile.type} (${tile.q}, ${tile.r}) with token ${tile.numberToken}`, 'success');
                    });
                }
                
                // Log exploration rewards
                if (result.resourcesGained) {
                    const items = [];
                    for (const [res, amt] of Object.entries(result.resourcesGained)) {
                        if (amt > 0) items.push(`${amt} ${res}`);
                    }
                    if (items.length > 0) {
                        log(`💎 Exploration reward: ${items.join(', ')}`, 'success');
                    }
                }
                
                updateUI();
                grid.render(game.map, selectedHex, game.players);

                // Handle Encounters with slight delay to show tile reveal
                if (result.encounters && result.encounters.length > 0) {
                    setTimeout(() => {
                        const encounter = result.encounters[0];
                        const card = encounter.card;
                        
                        // Handle combat encounters (All encounters are now combat/interactive)
                        const encounterData = {
                            tile: encounter.tile,
                            encounterCard: card
                        };
                        log(`⚠️ Encounter: ${card.enemy?.name || card.title || 'Enemy'}`, 'warning');
                        showCombatModal(encounterData);
                    }, 500);
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

function handleBuildOutpost() {
    if (game.phase !== 'action') {
        log("❌ Can only build during action phase", 'warning');
        return;
    }

    buildMode = 'outpost';
    document.body.style.cursor = 'crosshair';
    log("🏠 Build Outpost mode: Click a revealed tile adjacent to your hero", 'warning');
}

function handleUpgradeFortress() {
    if (game.phase !== 'action') {
        log("❌ Can only upgrade during action phase", 'warning');
        return;
    }

    buildMode = 'fortress';
    document.body.style.cursor = 'crosshair';
    log("🏰 Upgrade Fortress mode: Click an existing outpost to upgrade", 'warning');
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
