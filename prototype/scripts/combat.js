export class CombatSystem {
    constructor(game) {
        this.game = game;
        this.currentEnemy = null;
        this.playerDice = [];
        this.result = null;
    }

    initiateCombat(encounter) {
        this.currentEnemy = encounter;
        this.result = null;

        // Roll hero dice based on stats
        const hero = this.game.playerHero;
        this.playerDice = this.rollHeroDice(hero);

        return {
            enemy: this.currentEnemy,
            playerDice: this.playerDice
        };
    }

    rollHeroDice(hero) {
        const dice = [];

        // Roll Tactics dice (Yellow)
        for (let i = 0; i < hero.stats.tac; i++) {
            dice.push({
                type: 'tac',
                value: Math.floor(Math.random() * 6) + 1,
                color: '#ffd700'
            });
        }

        // Roll Strength dice (Red)
        for (let i = 0; i < hero.stats.str; i++) {
            dice.push({
                type: 'str',
                value: Math.floor(Math.random() * 6) + 1,
                color: '#f44336'
            });
        }

        // Roll Tech dice (Blue)
        for (let i = 0; i < hero.stats.tech; i++) {
            dice.push({
                type: 'tech',
                value: Math.floor(Math.random() * 6) + 1,
                color: '#40c4ff'
            });
        }

        return dice;
    }

    resolveCombat() {
        const enemy = this.currentEnemy;
        let remainingDice = [...this.playerDice];
        let coveredSlots = 0;
        let totalSlots = enemy.slots.length;

        // Sort slots: specific types first
        const sortedSlots = [...enemy.slots].sort((a, b) => {
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
        const damageToHero = allCovered ? 0 : enemy.damage; // Take full damage if not fully covered? Or partial?
        // Let's say: Take damage for each uncovered slot? 
        // GDD says: "Lose: Hero takes damage".
        // Let's keep it simple: If not all covered, take damage.

        if (allCovered) {
            // Victory
            this.game.playerHero.xp += enemy.reward.xp;

            if (this.game.playerHero.xp >= this.game.playerHero.xpToNext) {
                this.game.levelUpHero();
            }

            this.result = {
                victory: true,
                damageDealt: 100, // Abstract
                damageTaken: 0,
                xpGained: enemy.reward.xp,
                loot: enemy.reward.loot
            };
        } else {
            // Defeat
            this.game.playerHero.health -= damageToHero;

            if (this.game.playerHero.health <= 0) {
                this.game.playerHero.health = 0;
                this.result = {
                    victory: false,
                    defeated: true,
                    message: "Your hero was defeated! Lose 1 VP."
                };
                this.game.victoryPoints = Math.max(0, this.game.victoryPoints - 1);
                this.game.playerHero.health = this.game.playerHero.maxHealth;
            } else {
                this.result = {
                    victory: false,
                    damageDealt: coveredSlots,
                    damageTaken: damageToHero,
                    message: `Covered ${coveredSlots}/${totalSlots} slots. Took ${damageToHero} damage!`
                };
            }
        }

        return this.result;
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
