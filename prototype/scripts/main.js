import { HexGrid } from './hex_grid.js';
import { GameManager } from './game_manager.js';
import { CombatSystem } from './combat.js';

// Initialize game systems
const game = new GameManager();
const grid = new HexGrid('hex-grid-canvas', 900, 650);
const combat = new CombatSystem(game);

let selectedHex = null;
let exploreMode = false;
let patrolMode = false;

function init() {
    game.initGame();
    updateUI();
    grid.render(game.map);

    // Event Listeners
    document.getElementById('btn-roll-dice').addEventListener('click', handleRollDice);
    document.getElementById('btn-explore').addEventListener('click', toggleExploreMode);
    document.getElementById('btn-build-outpost').addEventListener('click', handleBuildOutpost);
    document.getElementById('btn-upgrade-fortress').addEventListener('click', handleUpgradeFortress);
    document.getElementById('btn-train').addEventListener('click', handleTrainHero);
    document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);

    // Canvas interaction
    const canvas = document.getElementById('hex-grid-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);

    // Combat modal buttons
    document.getElementById('btn-fight').addEventListener('click', handleFight);
    document.getElementById('btn-retreat').addEventListener('click', handleRetreat);

    log("🎮 Game Started! Place your Initial Outpost & Hero (Click an Edge).");
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
    document.getElementById('phase-display').textContent = game.phase;

    // Threat Level
    document.getElementById('threat-value').textContent = game.threatLevel;

    // Hero
    const hero = game.hero;
    document.getElementById('hero-level').textContent = hero.level;
    document.getElementById('hero-xp').textContent = hero.xp;
    // document.getElementById('hero-xp-next').textContent = hero.xpToNext; // Removed in new rules
    document.getElementById('stat-tac').textContent = hero.stats.tactics;
    document.getElementById('stat-str').textContent = hero.stats.strength;
    document.getElementById('stat-tech').textContent = hero.stats.tech;

    // Gear display update needed based on new rules (Cards tucked)
    // For now, just show stats

    // Check win condition
    if (game.victoryPoints >= 10) {
        log("🎉 VICTORY! You reached 10 Victory Points!", 'success');
        document.getElementById('btn-roll-dice').disabled = true;
    }
}

// ... handleRollDice ...

function handleCanvasMouseMove(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const edgeData = grid.getClosestEdge(mouseX, mouseY);

    // Only highlight if close to the edge (optional threshold)
    // For now, just highlight closest edge
    grid.render(game.map, selectedHex, game.hero.location, edgeData);
}

function handleCanvasClick(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Check if clicking on an edge for movement or setup
    const edgeData = grid.getClosestEdge(mouseX, mouseY);
    const mid = grid.getEdgeMidpoint(edgeData.q, edgeData.r, edgeData.edgeIndex);
    const dist = Math.sqrt(Math.pow(mouseX - mid.x, 2) + Math.pow(mouseY - mid.y, 2));

    // Threshold for edge click vs tile click (e.g., 15px from edge center)
    if (dist < 20) {
        if (game.phase === 'setup') {
            const result = game.handleInitialPlacement(edgeData.q, edgeData.r, edgeData.edgeIndex);
            if (result.success) {
                log("🏠 Initial Outpost & Hero placed!", 'success');
                log("🎲 Roll dice to start your turn.", 'info');
                updateUI();
                grid.render(game.map, null, game.hero.location);
            } else {
                log(`❌ ${result.reason}`, 'warning');
            }
            return;
        }

        // Attempt move
        const result = game.moveHero(edgeData.q, edgeData.r, edgeData.edgeIndex);
        if (result.success) {
            log("🏃 Hero moved!", 'success');
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
    }

    // ...

    function showEncounterModal(card) {
        // Reuse combat modal structure or create new one
        // For now, let's assume it's a combat/hazard that uses the combat system
        // Or a stash that gives loot immediately

        if (card.type === 'stash') {
            log(`🎁 Found Stash: ${card.title}`, 'success');
            applyReward(card.reward);
            return;
        }

        // Combat or Hazard
        const modal = document.getElementById('combat-modal');
        const combatInfo = document.getElementById('combat-info');
        const combatDiceArea = document.getElementById('combat-dice-area');

        // Mock combat data for display
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

        // Setup buttons for resolution (Mocking the combat flow for now)
        combatDiceArea.innerHTML = `
        <button id="btn-resolve-encounter" class="btn btn-primary">Roll Dice & Resolve</button>
    `;

        document.getElementById('btn-resolve-encounter').onclick = () => resolveEncounter(card);

        modal.classList.remove('hidden');
    }

    function resolveEncounter(card) {
        // Simple resolution for prototype
        // In real game, use CombatSystem
        const hero = game.hero;
        const roll = Math.floor(Math.random() * 6) + 1 + hero.stats.strength; // Mock roll

        log(`🎲 Rolled ${roll} vs Defense ${card.enemy.defense}`);

        if (roll >= card.enemy.defense) {
            log(`✅ Victory!`, 'success');
            applyReward(card.reward);
        } else {
            log(`❌ Defeat!`, 'danger');
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

    // Otherwise, tile click
    const hex = grid.pixelToHex(mouseX, mouseY);
    const key = `${hex.q},${hex.r}`;
    const tile = game.map.get(key);

    if (!tile) return;

    if (game.phase === 'setup') {
        log("⚠️ Click on an EDGE to place your Outpost and Hero.", 'warning');
        return;
    }

    if (patrolMode) {
        const result = game.moveAlienPatrol(hex.q, hex.r);
        if (result.success) {
            log("👽 Alien Patrol moved!", 'success');
            patrolMode = false;
            document.getElementById('game-container').style.cursor = 'default';
            grid.render(game.map, selectedHex, game.hero.location);
        } else {
            log(`❌ ${result.reason}`, 'warning');
        }
        return;
    }

    // Select tile for building
    selectedHex = hex;
    grid.render(game.map, selectedHex, game.hero.location);
    log(`Selected tile: ${key} (${tile.type})`);
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

function handleEndTurn() {
    game.endTurn();
    log(`⏭️ Turn ${game.turn} started`, 'success');
    updateUI();
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

function handleFight() {
    const result = combat.resolveCombat();

    if (result.victory) {
        log(`⚔️ Victory! Defeated enemy. +${result.xpGained} XP`, 'success');
        if (result.loot) {
            applyLoot(result.loot);
        }
    } else if (result.defeated) {
        log(`💀 ${result.message}`, 'danger');
    } else {
        log(`⚠️ ${result.message} (Took ${result.damageTaken} damage)`, 'warning');
    }

    closeCombatModal();
    updateUI();
}

function handleRetreat() {
    const result = combat.retreat();
    log(`🏃 ${result.message}`, 'warning');
    closeCombatModal();
    updateUI();
}

function closeCombatModal() {
    document.getElementById('combat-modal').classList.add('hidden');
}

function applyLoot(loot) {
    game.playerHero.gear[loot.slot] = loot.name;
    game.playerHero.stats[loot.slot === 'weapon' ? 'str' : 'tech']++;
    log(`💎 Equipped: ${loot.name} (+${loot.bonus} bonus)`, 'success');
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

// Start the game
init();
