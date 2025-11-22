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
    // document.getElementById('btn-train').addEventListener('click', handleTrainHero);
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
            if (patrolMode) {
                patrolMode = false;
                document.body.style.cursor = 'default';
                log("❌ Patrol mode cancelled", 'warning');
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

        if (invasionResult.needsPatrolMove) {
            patrolMode = true;
            document.body.style.cursor = 'crosshair';
            log("👁️ Click a revealed tile to move the Alien Patrol", 'warning');
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

    // PATROL MODE: Highlight tiles only
    if (patrolMode) {
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
            grid.render(game.map, selectedHex, game.players);
        } else {
            log(`❌ ${result.reason}`, 'warning');
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
                        log(`⚠️ Encounter: ${encounter.card.title}`, 'warning');
                        showEncounterModal(encounter.card);
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

    // Display Enemy with Enhanced Slot Display
    const slotsHTML = card.enemy.slots.map(slot => {
        let color = '#888';
        let icon = '⚪';
        if (slot.type === 'str') { color = '#f44336'; icon = '🔴'; }
        if (slot.type === 'tac') { color = '#ffd700'; icon = '🟡'; }
        if (slot.type === 'tech') { color = '#40c4ff'; icon = '🔵'; }
        if (slot.type === 'any') { color = '#888'; icon = '⚪'; }
        
        return `
            <div class="enemy-slot" style="background: ${color}33; border: 2px solid ${color};">
                <div class="slot-icon">${icon}</div>
                <div class="slot-label">${slot.label}</div>
                <div class="slot-value">${slot.value}</div>
            </div>
        `;
    }).join('');

    combatInfo.innerHTML = `
        <div class="enemy-card">
            <h3>👾 ${card.title}</h3>
            <div class="enemy-level">Level ${card.level}</div>
            <p class="enemy-desc">${card.description}</p>
            <div class="enemy-slots-title">⚠️ Required Slots:</div>
            <div class="enemy-slots-container">
                ${slotsHTML}
            </div>
            <div class="enemy-reward">
                🎁 Reward: ${card.reward.type === 'xp' ? `${card.reward.value} XP` : card.reward.item?.name || 'Unknown'}
            </div>
        </div>
    `;

    // Display Player Dice with Rolling Animation
    combatDiceArea.innerHTML = `
        <h4>🎲 Your Dice Roll:</h4>
        <div class="dice-container rolling">
            ${combat.getDiceHTML(combatData.playerDice)}
        </div>
        <div class="combat-hint">Click "Fight!" to resolve combat</div>
    `;

    // Remove rolling animation after short delay
    setTimeout(() => {
        const container = combatDiceArea.querySelector('.dice-container');
        if (container) container.classList.remove('rolling');
    }, 500);

    // Setup buttons
    document.getElementById('btn-fight').onclick = () => resolveEncounterAnimated();
    document.getElementById('btn-retreat').onclick = () => handleRetreat();

    modal.classList.remove('hidden');
}

function resolveEncounterAnimated() {
    const combatDiceArea = document.getElementById('combat-dice-area');
    const modal = document.getElementById('combat-modal');
    
    // Hide fight button
    document.getElementById('btn-fight').style.display = 'none';
    document.getElementById('btn-retreat').style.display = 'none';
    
    // Show resolution message
    combatDiceArea.innerHTML = '<div class="combat-resolving">⚔️ Resolving Combat...</div>';
    
    setTimeout(() => {
        const result = combat.resolveCombat();
        
        // Display Result Banner
        const bannerClass = result.victory ? 'victory-banner' : 'defeat-banner';
        const bannerText = result.victory ? '🎉 VICTORY! 🎉' : '💀 DEFEAT 💀';
        const bannerColor = result.victory ? '#4caf50' : '#f44336';
        
        combatDiceArea.innerHTML = `
            <div class="${bannerClass}" style="
                font-size: 2rem;
                font-weight: bold;
                color: ${bannerColor};
                text-align: center;
                padding: 20px;
                border: 3px solid ${bannerColor};
                border-radius: 10px;
                background: ${bannerColor}22;
                animation: pulse 0.5s;
                margin: 20px 0;
            ">
                ${bannerText}
            </div>
            <div class="combat-result-details">
                ${result.victory ? 
                    `<p>✅ All enemy slots covered!</p>` : 
                    `<p>❌ ${result.message}</p><p>Hero takes 1 damage!</p>`
                }
            </div>
        `;
        
        // Log result
        if (result.victory) {
            log(`✅ Victory! All slots covered!`, 'success');
        } else {
            log(`❌ Defeat! ${result.message}`, 'danger');
            const threatResult = game.handleEncounterFailure();
            if (threatResult.gameOver) {
                alert("GAME OVER! The Alien Threat has overwhelmed you.");
                location.reload();
                return;
            }
            log(`Threat increased to Level ${threatResult.level} (Track: ${threatResult.track}/5)`, 'danger');
        }
        
        // Show loot/reward UI after delay
        setTimeout(() => {
            if (result.victory && result.reward) {
                showRewardUI(result.reward);
            } else {
                // Close modal after defeat
                setTimeout(() => {
                    closeCombatModal();
                    updateUI();
                }, 2000);
            }
        }, 1500);
        
    }, 1000);
}

function showRewardUI(reward) {
    const combatDiceArea = document.getElementById('combat-dice-area');
    
    if (reward.type === 'xp') {
        combatDiceArea.innerHTML += `
            <div class="reward-display">
                <h3>🎁 Reward</h3>
                <div class="reward-item">
                    <div class="xp-cube">✨ ${reward.value} XP</div>
                </div>
                <button id="btn-claim-reward" class="action-btn primary">Claim Reward</button>
            </div>
        `;
        
        document.getElementById('btn-claim-reward').onclick = () => {
            applyReward(reward);
            closeCombatModal();
            updateUI();
        };
    } else if (reward.type === 'loot' && reward.item) {
        combatDiceArea.innerHTML += `
            <div class="reward-display">
                <h3>🎁 Loot Found!</h3>
                <div class="loot-item">
                    <div class="item-name">${reward.item.name}</div>
                    <div class="item-bonus">+${reward.item.bonus} ${reward.item.slot}</div>
                </div>
                <button id="btn-claim-reward" class="action-btn primary">Take Item</button>
            </div>
        `;
        
        document.getElementById('btn-claim-reward').onclick = () => {
            applyReward(reward);
            closeCombatModal();
            updateUI();
        };
    }
}

function resolveEncounter() {
    resolveEncounterAnimated();
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
