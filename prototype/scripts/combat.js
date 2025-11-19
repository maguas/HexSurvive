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
        // Simplified One Deck Dungeon style combat
        // Player needs to "cover" enemy stats with dice
        
        const enemy = this.currentEnemy;
        const totalDiceValue = this.playerDice.reduce((sum, die) => sum + die.value, 0);
        
        // Enemy resistance
        const enemyDefense = enemy.armor * 3 + enemy.health;
        
        // Calculate damage dealt
        const damageToEnemy = Math.max(0, totalDiceValue - enemy.armor);
        const damageToHero = Math.max(0, enemy.damage - Math.floor(totalDiceValue / 5));
        
        // Determine outcome
        if (damageToEnemy >= enemy.health) {
            // Victory
            this.game.playerHero.xp += enemy.reward.xp;
            
            // Check level up
            if (this.game.playerHero.xp >= this.game.playerHero.xpToNext) {
                this.game.levelUpHero();
            }
            
            this.result = {
                victory: true,
                damageDealt: damageToEnemy,
                damageTaken: 0,
                xpGained: enemy.reward.xp,
                loot: enemy.reward.loot
            };
        } else {
            // Defeat or partial damage
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
                    damageDealt: damageToEnemy,
                    damageTaken: damageToHero,
                    message: "Couldn't defeat the enemy. Took damage!"
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
        return `
            <div class="enemy-card">
                <h3>👾 ${enemy.enemyType} Alien</h3>
                <div class="enemy-stats">
                    <div>Level: ${enemy.level}</div>
                    <div>Health: ${enemy.health}</div>
                    <div>Armor: ${enemy.armor}</div>
                    <div>Damage: ${enemy.damage}</div>
                </div>
                <div class="enemy-reward">
                    <small>Reward: ${enemy.reward.xp} XP${enemy.reward.loot ? ' + Loot' : ''}</small>
                </div>
            </div>
        `;
    }
}
