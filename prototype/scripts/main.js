import { HexGrid } from './hex_grid.js';
import { GameManager } from './game_manager.js';
import { CombatSystem } from './combat.js';

// Initialize game systems
const game = new GameManager();
const grid = new HexGrid('hex-grid-canvas', 900, 650);
const combat = new CombatSystem(game);

let selectedHex = null;
let exploreMode = false;

function init() {
    game.initGame();
    updateUI();
    grid.render(game.map);
    
    // Event Listeners
    document.getElementById('btn-roll-dice').addEventListener('click', handleRollDice);
    document.getElementById('btn-explore').addEventListener('click', toggleExploreMode);
    document.getElementById('btn-build-outpost').addEventListener('click', handleBuildOutpost);
    document.getElementById('btn-train').addEventListener('click', handleTrainHero);
    document.getElementById('btn-end-turn').addEventListener('click', handleEndTurn);
    
    // Canvas interaction
    const canvas = document.getElementById('hex-grid-canvas');
    canvas.addEventListener('click', handleCanvasClick);
    
    // Combat modal buttons
    document.getElementById('btn-fight').addEventListener('click', handleFight);
    document.getElementById('btn-retreat').addEventListener('click', handleRetreat);
    
    log("🎮 Game Started! Roll dice to begin production phase.");
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
    const hero = game.playerHero;
    document.getElementById('hero-level').textContent = hero.level;
    document.getElementById('hero-xp').textContent = hero.xp;
    document.getElementById('hero-xp-next').textContent = hero.xpToNext;
    document.getElementById('stat-tac').textContent = hero.stats.tac;
    document.getElementById('stat-str').textContent = hero.stats.str;
    document.getElementById('stat-tech').textContent = hero.stats.tech;
    document.getElementById('gear-head').textContent = hero.gear.head || '-';
    document.getElementById('gear-body').textContent = hero.gear.body || '-';
    document.getElementById('gear-weapon').textContent = hero.gear.weapon || '-';
    document.getElementById('gear-tech').textContent = hero.gear.tech || '-';

    // Check win condition
    if (game.victoryPoints >= 10) {
        log("🎉 VICTORY! You reached 10 Victory Points!", 'success');
        document.getElementById('btn-roll-dice').disabled = true;
    }
}

function handleRollDice() {
    game.phase = 'action';
    const roll = game.rollDice();
    
    // Show dice animation
    showDiceRoll(roll);

    setTimeout(() => {
        if (roll.total === 7) {
            // Invasion event
            const invasion = game.handleInvasion();
            log(`🚨 INVASION! Threat Level increased to ${invasion.threatLevel}`, 'danger');
            
            let discardMsg = "Discarded: ";
            let hasDiscard = false;
            for (const [res, amount] of Object.entries(invasion.discarded)) {
                if (amount > 0) {
                    discardMsg += `${amount} ${res}, `;
                    hasDiscard = true;
                }
            }
            if (hasDiscard) log(discardMsg.slice(0, -2), 'warning');
        } else {
            // Production
            const gains = game.harvest(roll.total);
            if (gains) {
                let msg = "📦 Harvested: ";
                let hasGains = false;
                for (const [res, amount] of Object.entries(gains)) {
                    if (amount > 0) {
                        msg += `${amount} ${res}, `;
                        hasGains = true;
                    }
                }
                if (hasGains) log(msg.slice(0, -2), 'success');
                else log(`No production on ${roll.total}`);
            }
        }
        updateUI();
    }, 2000);
}

function showDiceRoll(roll) {
    const diceDisplay = document.getElementById('dice-result');
    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    const rollTotal = document.getElementById('roll-total');
    
    const symbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    die1.textContent = symbols[roll.d1 - 1];
    die2.textContent = symbols[roll.d2 - 1];
    rollTotal.textContent = `Roll: ${roll.total}`;
    
    diceDisplay.classList.remove('hidden');
    
    setTimeout(() => {
        diceDisplay.classList.add('hidden');
    }, 2000);
}

function toggleExploreMode() {
    exploreMode = !exploreMode;
    const btn = document.getElementById('btn-explore');
    
    if (exploreMode) {
        btn.style.background = 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
        btn.style.color = 'white';
        log("🔍 Explore mode activated. Click on fog tiles to explore.", 'warning');
    } else {
        btn.style.background = '';
        btn.style.color = '';
        selectedHex = null;
        grid.render(game.map);
    }
}

function handleCanvasClick(event) {
    const rect = event.target.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const hex = grid.pixelToHex(mouseX, mouseY);
    const key = `${hex.q},${hex.r}`;
    const tile = game.map.get(key);

    if (!tile) return;

    if (exploreMode && !tile.revealed) {
        // Explore this tile
        const result = game.explore(hex.q, hex.r);
        
        if (result.success) {
            log(`🔍 Explored Lvl ${result.tile.level} ${result.tile.type}! Token: ${result.tile.numberToken}`, 'success');
            
            if (result.encounter.type === 'combat') {
                log(`⚔️ ENCOUNTER: ${result.encounter.enemyType} Alien (Lvl ${result.encounter.level})!`, 'danger');
                showCombatModal(result.encounter);
            } else if (result.encounter.type === 'loot') {
                log(`💎 ${result.encounter.message}`, 'success');
                if (result.encounter.loot) {
                    applyLoot(result.encounter.loot);
                }
            } else {
                log(`✅ ${result.encounter.message}`);
            }
            
            exploreMode = false;
            document.getElementById('btn-explore').style.background = '';
            grid.render(game.map);
            updateUI();
        } else {
            log(`❌ ${result.reason}`, 'warning');
        }
    } else {
        // Select tile for building
        selectedHex = hex;
        grid.render(game.map, selectedHex);
        log(`Selected tile: ${key} (${tile.type})`);
    }
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
