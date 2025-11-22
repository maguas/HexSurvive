# Next Implementation Steps

Quick reference for continuing development on high-priority tasks.

---

## 🎯 Task 1: Display Action Costs on Buttons (UI Improvements)

### Implementation Plan

**Goal**: Show resource costs directly on UI buttons and disable when insufficient.

### Files to Modify

#### 1. `prototype/index.html`
Update button markup to include cost display:

```html
<!-- Example: Build Outpost button -->
<button id="btn-build-outpost">
    Build Outpost
    <span class="cost">
        <span class="res-icon">🔩</span>1
        <span class="res-icon">🍏</span>1
        <span class="res-icon">⚡</span>1
    </span>
</button>
```

#### 2. `prototype/scripts/main.js`
Add cost checking and button state updates in `updateUI()`:

```javascript
function updateUI() {
    // ... existing code ...
    
    // Update button states
    updateButtonStates();
}

function updateButtonStates() {
    const res = game.resources;
    
    // Build Outpost (1 scrap, 1 food, 1 fuel)
    const btnOutpost = document.getElementById('btn-build-outpost');
    btnOutpost.disabled = (res.scrap < 1 || res.food < 1 || res.fuel < 1);
    
    // Upgrade Fortress (2 scrap, 3 alloy)
    const btnFortress = document.getElementById('btn-upgrade-fortress');
    btnFortress.disabled = (res.scrap < 2 || res.alloy < 3);
    
    // Movement costs are dynamic, handle in click handler
}
```

#### 3. `prototype/styles.css` (if not exists, create)
Add styling for cost display:

```css
button .cost {
    display: block;
    font-size: 0.8em;
    opacity: 0.8;
    margin-top: 4px;
}

button:disabled .cost {
    color: #ff6b6b;
}

button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
```

### Testing
- Verify buttons disable when resources insufficient
- Verify buttons enable when resources available
- Check visual clarity of cost display

---

## 🎨 Task 2: Enhance Player Color Visibility

### Implementation Plan

**Goal**: Make player colors more visible on outposts and heroes.

### Files to Modify

#### 1. `prototype/scripts/hex_grid.js`
Update rendering to use stronger player colors:

```javascript
drawHex(hex, highlight = false) {
    // ... existing code ...
    
    if (hex.outpost) {
        // Add colored border for owner
        if (hex.ownerId) {
            const player = this.game.players.find(p => p.id === hex.ownerId);
            if (player) {
                ctx.strokeStyle = player.color;
                ctx.lineWidth = 4; // Thicker border
                ctx.stroke();
                
                // Add small colored marker
                this.drawOutpostMarker(x, y, player.color);
            }
        }
    }
}

drawOutpostMarker(x, y, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - this.size * 0.6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}
```

#### 2. Hero Marker Enhancement
```javascript
drawHero(x, y, edgeIndex, player) {
    const ctx = this.ctx;
    const angle = Math.PI / 3 * edgeIndex;
    const edgeX = x + Math.cos(angle) * this.size;
    const edgeY = y + Math.sin(angle) * this.size;
    
    // Draw larger hero marker with player color
    ctx.fillStyle = player.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(edgeX, edgeY, 12, 0, Math.PI * 2); // Larger radius
    ctx.fill();
    ctx.stroke();
    
    // Add player initial
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name[0], edgeX, edgeY);
}
```

### Testing
- Verify outposts clearly show owner
- Verify heroes are easily identifiable
- Test color contrast on different tile types

---

## ⚔️ Task 3: Co-op Combat Assist

### Implementation Plan

**Goal**: Allow adjacent heroes to combine dice pools in combat.

### Files to Create/Modify

#### 1. `prototype/scripts/game_manager.js`
Add method to find adjacent heroes:

```javascript
getAdjacentHeroes(q, r, edgeIndex) {
    const adjacentHeroes = [];
    
    for (const player of this.players) {
        if (player.id === this.activePlayer.id) continue;
        
        const hero = player.hero;
        if (!hero.location) continue;
        
        // Check if hero is within 1-2 edges of combat location
        const distance = this.calculateEdgeDistance(
            hero.location,
            { q, r, edgeIndex }
        );
        
        if (distance <= 2) { // Adjacent enough to assist
            adjacentHeroes.push({
                player: player,
                hero: hero,
                distance: distance
            });
        }
    }
    
    return adjacentHeroes;
}
```

#### 2. `prototype/scripts/combat.js`
Add co-op combat method:

```javascript
initiateCombatCoop(encounterCard, assistingHeroes) {
    this.currentEncounter = encounterCard;
    this.result = null;
    this.assistingHeroes = assistingHeroes;
    
    // Roll dice for all participants
    const primaryDice = this.rollHeroDice(this.game.hero);
    const assistDice = [];
    
    for (const { hero } of assistingHeroes) {
        assistDice.push(...this.rollHeroDice(hero));
    }
    
    this.playerDice = [...primaryDice, ...assistDice];
    
    return {
        enemy: this.currentEncounter.enemy,
        playerDice: this.playerDice,
        primaryDice: primaryDice,
        assistDice: assistDice,
        assisting: assistingHeroes.length
    };
}

distributeRewards(result) {
    if (!result.victory) return;
    
    const participants = 1 + (this.assistingHeroes?.length || 0);
    
    // Split XP
    if (result.reward.type === 'xp') {
        const xpPerHero = Math.floor(result.reward.value / participants);
        this.game.gainXp(xpPerHero);
        
        for (const { player } of this.assistingHeroes || []) {
            // Apply XP to assisting players
            player.hero.xp += xpPerHero;
        }
    }
    
    // Roll for loot if present
    if (result.reward.type === 'loot') {
        // Implement loot roll-off (d6 per participant)
        return this.rollForLoot(result.reward.item);
    }
}
```

#### 3. `prototype/scripts/main.js`
Update encounter UI to show co-op option:

```javascript
function showEncounterModal(card, location) {
    // ... existing code ...
    
    // Check for adjacent heroes
    const adjacentHeroes = game.getAdjacentHeroes(
        location.q, location.r, location.edgeIndex
    );
    
    if (adjacentHeroes.length > 0) {
        const coopInfo = document.createElement('div');
        coopInfo.className = 'coop-info';
        coopInfo.innerHTML = `
            <h4>🤝 Allies Available</h4>
            <p>${adjacentHeroes.map(a => a.player.name).join(', ')} can assist!</p>
            <button id="btn-request-assist">Request Assistance</button>
        `;
        combatInfo.appendChild(coopInfo);
        
        document.getElementById('btn-request-assist').onclick = () => {
            initiateCoopCombat(card, adjacentHeroes);
        };
    }
}
```

### Testing
Create `test/test_combat_coop.js`:

```javascript
// Test cases:
// 1. Detection of adjacent heroes
// 2. Combined dice pool
// 3. XP split
// 4. Loot roll-off
// 5. Failure affects both heroes
```

---

## 🎲 Task 4: Smarter Dice Assignment (Combat Polish v2)

### Research & Implementation

#### Current Algorithm Analysis
```javascript
// combat.js - resolveCombat()
// Current: Greedy approach
// Sorts slots by specificity
// Assigns highest dice to each slot
// Works 90% of the time
```

#### Potential Improvements

**Option A: Backtracking (Complete search)**
```javascript
findOptimalAssignment(slots, dice) {
    // Try all possible assignments
    // Return best one that covers most slots
    // Complexity: O(n!)
    // Use only for small dice pools (< 8 dice)
}
```

**Option B: Dynamic Programming**
```javascript
// Treat as knapsack problem
// Each slot is an item with value (importance)
// Each die is a resource
// Find combination that maximizes slots covered
```

**Option C: Improved Greedy**
```javascript
// Phase 1: Handle specific slots first
// Phase 2: Reserve "any" dice for "any" slots
// Phase 3: Reassign if needed
```

### Implementation Steps
1. Create test cases where current algorithm fails
2. Implement improved algorithm
3. Compare results
4. Benchmark performance
5. Add toggle for "smart mode" vs "fast mode"

### Test File
Create `test/test_dice_optimization.js` with edge cases:
- Scenario where "any" slot could use specific dice better
- Scenario with multiple valid solutions
- Scenario requiring backtracking

---

## 🔧 Quick Commands

### Run Specific Tests
```bash
# Test co-op combat (after implementation)
node test/test_combat_coop.js

# Test dice optimization (after implementation)
node test/test_dice_optimization.js

# Run all tests
node test/run_all_tests.js
```

### Start Dev Server
```bash
# If using Python
python -m http.server 8000

# If using Node
npx http-server prototype -p 8000
```

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/ui-cost-display

# Commit tests first
git add test/
git commit -m "test: Add UI cost display tests"

# Commit implementation
git add prototype/
git commit -m "feat: Display action costs on buttons"

# Merge when complete
git checkout main
git merge feature/ui-cost-display
```

---

## 📊 Priority Order (Recommended)

1. **Display Action Costs** (1-2 hours) - Quick win, big UX improvement
2. **Enhance Player Colors** (1-2 hours) - Visual clarity
3. **Co-op Combat Assist** (3-4 hours) - Core feature from GDD
4. **Smarter Dice Assignment** (2-3 hours) - Polish, not critical

---

## 🐛 Known Issues to Address

From test results, these work correctly but might need polish:
- ⚠️ Barren tiles show as producing in logs (cosmetic)
- ⚠️ Number token generation is fully random (could be weighted)
- ⚠️ No validation for max 9 XP cubes (cap mentioned in GDD)

---

## 📝 Notes

- All core mechanics verified and working
- Test coverage is comprehensive (27/27 passing)
- Focus on UX and co-op features for next iteration
- Consider playtesting after completing next 2-3 tasks

**Good luck with the next iteration!** 🚀
