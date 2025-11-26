export class CombatUI {
    constructor(combatSystem, gameManager) {
        this.combat = combatSystem;
        this.game = gameManager;
        this.modal = document.getElementById('combat-modal');
        this.diceContainer = document.getElementById('player-dice');
        this.resolutionContainer = document.getElementById('combat-resolution');
        
        this.animationInterval = null;
        this.isAnimating = false;
        this.currentRolledDice = null; // Store dice for grit spending
        this.gritSpent = { tac: 0, str: 0, tech: 0 }; // Track grit spent per stat
    }

    show(encounterData) {
        const card = encounterData.encounterCard;
        const enemy = card.enemy;
        const encounterLevel = encounterData.tile.encounterLevel || 1;

        // Initiate combat in system and store tile reference
        this.combat.initiateCombat(card);
        this.combat.currentEncounter.tile = encounterData.tile;

        // 1. Setup UI content
        this.setupHeader(card, encounterLevel);
        this.setupRequirements(enemy);
        this.setupRewards(card.reward);

        // 2. Reset state
        document.getElementById('combat-phase').classList.add('hidden');
        document.getElementById('result-phase').classList.add('hidden');
        document.getElementById('initial-actions').style.display = 'flex';
        this.diceContainer.innerHTML = '';
        this.resolutionContainer.innerHTML = '';
        this.modal.classList.remove('hidden');

        // 3. Bind buttons
        document.getElementById('btn-fight').onclick = () => this.handleFight();
        document.getElementById('btn-retreat').onclick = () => this.handleRetreat();
    }

    setupHeader(card, level) {
        // Level Badge
        const levelBadge = document.getElementById('encounter-level-badge');
        levelBadge.textContent = `Level ${level}`;
        levelBadge.style.background = level === 3 ? '#F44336' : level === 2 ? '#FFC107' : '#4CAF50';

        // Text
        document.querySelector('.encounter-name').textContent = card.title || 'Unknown Enemy';
        document.querySelector('.encounter-description').textContent = card.description || 'A dangerous foe blocks your path...';
    }

    setupRequirements(enemy) {
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
    }

    setupRewards(reward) {
        const gearReward = document.getElementById('gear-reward');
        const resourceRewards = document.getElementById('resource-rewards');
        
        // Gear
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

        // Resources
        const resourceIcons = {
            scrap: '🔩', fuel: '⚡', food: '🍏', alloy: '🔮', intel: '💾'
        };
        
        resourceRewards.innerHTML = '';
        if (reward.resources && Object.keys(reward.resources).length > 0) {
            for (const [res, amt] of Object.entries(reward.resources)) {
                if (amt > 0) {
                    const resItem = document.createElement('div');
                    resItem.className = 'resource-reward-item';
                    resItem.innerHTML = `<span>${resourceIcons[res] || '❓'}</span><span>${amt}</span>`;
                    resourceRewards.appendChild(resItem);
                }
            }
        } else if (!reward.equipment) {
            resourceRewards.innerHTML = '<div style="text-align: center; color: var(--text-dim);">Small stash of resources</div>';
        }
    }

    handleFight() {
        document.getElementById('initial-actions').style.display = 'none';
        document.getElementById('combat-phase').classList.remove('hidden');

        // Reset grit spending
        this.gritSpent = { tac: 0, str: 0, tech: 0 };

        // 1. Roll Logic
        const rolledDice = this.combat.rollHeroDice(this.game.hero);
        this.currentRolledDice = rolledDice;
        
        // 2. Start Animation
        this.playDiceAnimation(rolledDice).then(() => {
            // 3. Show grit spending UI if player has grit tokens
            this.showGritSpendingUI(rolledDice);
        });
    }

    showGritSpendingUI(rolledDice) {
        const player = this.game.activePlayer;
        const availableGrit = player.gritTokens;
        
        // Calculate current totals
        const totals = this.calculateTotals(rolledDice);
        
        // Build grit spending UI
        let gritHTML = '';
        if (availableGrit > 0) {
            gritHTML = `
                <div class="grit-spending">
                    <h4>⚫ Spend Grit Tokens (${availableGrit - this.getTotalGritSpent()} remaining)</h4>
                    <div class="grit-controls">
                        <div class="grit-stat">
                            <span class="grit-label">🎯 Tactics: +${this.gritSpent.tac}</span>
                            <button class="grit-btn" onclick="combatUI.addGrit('tac')">+</button>
                            <button class="grit-btn" onclick="combatUI.removeGrit('tac')">-</button>
                        </div>
                        <div class="grit-stat">
                            <span class="grit-label">💪 Strength: +${this.gritSpent.str}</span>
                            <button class="grit-btn" onclick="combatUI.addGrit('str')">+</button>
                            <button class="grit-btn" onclick="combatUI.removeGrit('str')">-</button>
                        </div>
                        <div class="grit-stat">
                            <span class="grit-label">🔧 Tech: +${this.gritSpent.tech}</span>
                            <button class="grit-btn" onclick="combatUI.addGrit('tech')">+</button>
                            <button class="grit-btn" onclick="combatUI.removeGrit('tech')">-</button>
                        </div>
                    </div>
                    <button class="action-btn primary" onclick="combatUI.confirmGritAndResolve()">Confirm & Resolve</button>
                </div>
            `;
        }
        
        this.resolutionContainer.innerHTML = gritHTML;
        
        // If no grit available, resolve immediately
        if (availableGrit === 0) {
            this.resolveCombat(rolledDice);
        }
    }

    getTotalGritSpent() {
        return this.gritSpent.tac + this.gritSpent.str + this.gritSpent.tech;
    }

    addGrit(stat) {
        const player = this.game.activePlayer;
        const available = player.gritTokens - this.getTotalGritSpent();
        if (available > 0) {
            this.gritSpent[stat]++;
            this.updateGritUI();
        }
    }

    removeGrit(stat) {
        if (this.gritSpent[stat] > 0) {
            this.gritSpent[stat]--;
            this.updateGritUI();
        }
    }

    updateGritUI() {
        const player = this.game.activePlayer;
        const remaining = player.gritTokens - this.getTotalGritSpent();
        
        // Update dice display with grit bonuses
        const totals = this.calculateTotals(this.currentRolledDice);
        totals.tac += this.gritSpent.tac;
        totals.str += this.gritSpent.str;
        totals.tech += this.gritSpent.tech;
        this.renderDice(totals);
        
        // Refresh grit spending UI
        this.showGritSpendingUI(this.currentRolledDice);
    }

    confirmGritAndResolve() {
        // Deduct spent grit from player
        const player = this.game.activePlayer;
        const totalSpent = this.getTotalGritSpent();
        player.gritTokens -= totalSpent;
        
        if (totalSpent > 0) {
            window.log(`⚫ Spent ${totalSpent} Grit Token${totalSpent > 1 ? 's' : ''}`, 'info');
        }
        
        // Resolve combat with grit bonuses applied
        this.resolveCombat(this.currentRolledDice);
    }

    calculateTotals(rolledDice) {
        return {
            tac: rolledDice.filter(d => d.type === 'tac').reduce((a,b) => a + b.value, 0),
            str: rolledDice.filter(d => d.type === 'str').reduce((a,b) => a + b.value, 0),
            tech: rolledDice.filter(d => d.type === 'tech').reduce((a,b) => a + b.value, 0)
        };
    }

    playDiceAnimation(finalDice) {
        return new Promise((resolve) => {
            this.isAnimating = true;
            const duration = 1500; // 1.5 seconds
            const interval = 100;
            const startTime = Date.now();

            // Calculate target totals
            const targets = {
                tac: finalDice.filter(d => d.type === 'tac').reduce((a,b) => a + b.value, 0),
                str: finalDice.filter(d => d.type === 'str').reduce((a,b) => a + b.value, 0),
                tech: finalDice.filter(d => d.type === 'tech').reduce((a,b) => a + b.value, 0)
            };

            this.animationInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                if (elapsed > duration) {
                    clearInterval(this.animationInterval);
                    this.renderDice(targets); // Show final
                    resolve();
                    return;
                }

                // Show random values during animation
                const randoms = {
                    tac: Math.floor(Math.random() * 10) + 1,
                    str: Math.floor(Math.random() * 10) + 1,
                    tech: Math.floor(Math.random() * 10) + 1
                };
                this.renderDice(randoms, true);

            }, interval);
        });
    }

    renderDice(totals, isAnimating = false) {
        // Reuse existing HTML structure
        this.diceContainer.innerHTML = `
            <div class="dice-item tactics ${isAnimating ? 'rolling' : ''}">
                <div class="dice-icon">🎯</div>
                <div class="dice-value">${totals.tac}</div>
                <div class="dice-label">Tactics</div>
            </div>
            <div class="dice-item strength ${isAnimating ? 'rolling' : ''}">
                <div class="dice-icon">💪</div>
                <div class="dice-value">${totals.str}</div>
                <div class="dice-label">Strength</div>
            </div>
            <div class="dice-item tech ${isAnimating ? 'rolling' : ''}">
                <div class="dice-icon">🔧</div>
                <div class="dice-value">${totals.tech}</div>
                <div class="dice-label">Tech</div>
            </div>
        `;
    }

    resolveCombat(rolledDice) {
        // Extract totals and add grit bonuses
        const totals = {
            tactics: rolledDice.filter(d => d.type === 'tac').reduce((a,b) => a + b.value, 0) + this.gritSpent.tac,
            strength: rolledDice.filter(d => d.type === 'str').reduce((a,b) => a + b.value, 0) + this.gritSpent.str,
            tech: rolledDice.filter(d => d.type === 'tech').reduce((a,b) => a + b.value, 0) + this.gritSpent.tech
        };

        // Update dice display with final totals including grit
        this.renderDice({ tac: totals.tactics, str: totals.strength, tech: totals.tech });

        // Check requirements
        const enemy = this.combat.currentEncounter.enemy;
        const requirements = {
            tactics: totals.tactics,
            strength: totals.strength,
            tech: totals.tech,
            tac: totals.tactics,
            str: totals.strength
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
                <div class="resolution-item ${met ? 'success' : 'failure'}" style="opacity: 0; animation: fadeIn 0.5s forwards">
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

        this.resolutionContainer.innerHTML = resolutionHTML.join('');
        
        // Staggered reveal of results? For now just show them. 
        // Or we could animate them one by one.
        
        setTimeout(() => {
            this.showResult(allMet);
        }, 2000); // Wait 2 seconds before showing final result
    }

    showResult(victory) {
        const resultPhase = document.getElementById('result-phase');
        const resultBanner = document.getElementById('result-banner');
        const resultMessage = document.getElementById('result-message');
        
        resultPhase.classList.remove('hidden');
        
        if (victory) {
            resultBanner.className = 'result-banner victory';
            resultBanner.textContent = 'VICTORY';
            resultMessage.textContent = 'Enemy defeated! Rewards claimed.';
            
            // Setup Claim Button
            const actionsDiv = document.querySelector('.result-actions');
            actionsDiv.innerHTML = `<button id="btn-claim-reward" class="action-btn primary">Claim Rewards</button>`;
            document.getElementById('btn-claim-reward').onclick = () => window.claimRewards();
        } else {
            resultBanner.className = 'result-banner defeat';
            resultBanner.textContent = 'DEFEAT';
            resultMessage.textContent = 'You were overpowered. Resources lost.';
            
            const actionsDiv = document.querySelector('.result-actions');
            actionsDiv.innerHTML = `<button id="btn-accept-defeat" class="action-btn danger">Accept Defeat</button>`;
            document.getElementById('btn-accept-defeat').onclick = () => window.acceptDefeat();
        }
    }

    handleRetreat() {
        const result = this.combat.retreat();
        window.log(result.message, 'warning');
        this.close();
        window.updateUI();
    }

    close() {
        this.modal.classList.add('hidden');
        document.getElementById('btn-fight').style.display = '';
        document.getElementById('btn-retreat').style.display = '';
    }
}
