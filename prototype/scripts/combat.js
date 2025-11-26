export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.currentEnemy = null;
        this.playerDice = [];
        this.result = null;
    }

    initiateCombat(encounterCard) {
        this.currentEncounter = encounterCard;
        this.result = null;
        this.playerDice = [];

        return {
            enemy: this.currentEncounter.enemy
        };
    }

    // ... rollHeroDice ...

    resolveCombat() {
        const card = this.currentEncounter;
        const enemyData = card.enemy;

        let remainingDice = [...this.playerDice];
        let coveredSlots = 0;
        let totalSlots = enemyData.slots.length;

        // Sort slots: specific types first
        const sortedSlots = [...enemyData.slots].sort((a, b) => {
            if (a.type !== 'any' && b.type === 'any') return -1;
            if (a.type === 'any' && b.type !== 'any') return 1;
            return b.value - a.value;
        });

        for (const slot of sortedSlots) {
            // Find suitable dice
            let suitableDice = remainingDice.filter(d =>
                slot.type === 'any' || d.type === slot.type
            );

            // Sort dice by value descending to use biggest first (greedy)
            suitableDice.sort((a, b) => b.value - a.value);

            let currentSum = 0;
            let usedIndices = [];

            for (let i = 0; i < suitableDice.length; i++) {
                currentSum += suitableDice[i].value;
                usedIndices.push(remainingDice.indexOf(suitableDice[i]));
                if (currentSum >= slot.value) break;
            }

            if (currentSum >= slot.value) {
                coveredSlots++;
                // Remove used dice
                // Sort indices descending to remove from back without shifting issues
                usedIndices.sort((a, b) => b - a);
                usedIndices.forEach(idx => remainingDice.splice(idx, 1));
            }
        }

        const allCovered = coveredSlots === totalSlots;

        if (allCovered) {
            // Victory
            // XP handling is done in GameManager now via result
            this.result = {
                victory: true,
                damageDealt: 100,
                damageTaken: 0,
                reward: card.reward
            };
        } else {
            // Defeat
            // Damage handling is done in GameManager
            this.result = {
                victory: false,
                damageDealt: coveredSlots,
                damageTaken: 1, // Standard 1 damage on failure
                message: `Covered ${coveredSlots}/${totalSlots} slots. Failed!`
            };
        }

        return this.result;
    }

    rollHeroDice(hero) {
        const dice = [];
        
        // Calculate total stat bonuses (base + gear)
        let tactics = hero.stats.tactics;
        let strength = hero.stats.strength;
        let tech = hero.stats.tech;

        // Add gear bonuses
        if (hero.gear) {
            ['suit', 'weapon'].forEach(slot => {
                const item = hero.gear[slot];
                if (item) {
                    if (item.tactics) tactics += item.tactics;
                    if (item.strength) strength += item.strength;
                    if (item.tech) tech += item.tech;
                }
            });
        }

        // Roll 1 die per stat type, add stat bonus to result
        // Tactics die (Yellow) - 1d6 + tactics bonus
        dice.push({
            type: 'tac',
            value: Math.floor(Math.random() * 6) + 1 + tactics,
            color: '#FFD700'
        });

        // Strength die (Red) - 1d6 + strength bonus
        dice.push({
            type: 'str',
            value: Math.floor(Math.random() * 6) + 1 + strength,
            color: '#F44336'
        });

        // Tech die (Blue) - 1d6 + tech bonus
        dice.push({
            type: 'tech',
            value: Math.floor(Math.random() * 6) + 1 + tech,
            color: '#40C4FF'
        });

        return dice;
    }

    retreat() {
        // Retreating costs resources
        this.game.resources.food = Math.max(0, this.game.resources.food - 1);

        return {
            retreated: true,
            message: "Retreated from combat. Lost 1 Food."
        };
    }

    getDiceHTML(dice) {
        return dice.map(die => {
            const symbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            return `<div class="combat-die" style="background: ${die.color}">
                        <span class="die-value">${symbols[die.value - 1]}</span>
                        <span class="die-number">${die.value}</span>
                    </div>`;
        }).join('');
    }

    getEnemyHTML(enemy) {
        const slotsHTML = enemy.slots.map(slot => {
            let color = '#ccc';
            if (slot.type === 'str') color = '#f44336';
            if (slot.type === 'tac') color = '#ffd700';
            if (slot.type === 'tech') color = '#40c4ff';

            return `<div style="background: ${color}; padding: 5px; margin: 2px; border-radius: 4px; color: black; font-weight: bold;">
                ${slot.label}: ${slot.value} (${slot.type.toUpperCase()})
            </div>`;
        }).join('');

        return `
            <div class="enemy-card">
                <h3>👾 ${enemy.enemyType} Alien</h3>
                <div class="enemy-stats">
                    <div>Level: ${enemy.level}</div>
                    <div>Damage: ${enemy.damage}</div>
                </div>
                <div style="margin: 10px 0;">
                    <h4>Required Slots:</h4>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center;">
                        ${slotsHTML}
                    </div>
                </div>
                <div class="enemy-reward">
                    <small>Reward: ${enemy.reward.xp} XP${enemy.reward.loot ? ' + Loot' : ''}</small>
                </div>
            </div>
        `;
    }
}
