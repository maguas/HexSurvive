# Implementation Plan: Game Simplification Update
**Date**: November 22, 2025
**Status**: Ready for implementation

## Summary of Changes

### Removed Systems
1. ✅ **XP/Leveling System** - Heroes progress through equipment only
2. ✅ **Alien Patrol System** - Simplified gameplay, removed patrol figures and mechanics
3. ✅ **Active Player Token** - UI shows active player clearly
4. ✅ **Wound/Damage Tokens** - Hero defeat = instant respawn at outpost + 2 inactive turns
5. ✅ **Roll 7 Special Effects** - Now just "no production"

### Modified Systems
1. ✅ **Resource Tokens** - Reduced from 155 to 95 (19 per type, Catan-style)
2. ✅ **Hero Progression** - Equipment-based only (no XP tracking)
3. ✅ **Combat Rewards** - Equipment cards (not XP)
4. ✅ **Hero Defeat** - Simpler respawn mechanic

---

## Implementation Steps

### Phase 1: Map & Data Updates

#### 1.1 Tile Encounter Level Visibility

**Goal:** Each tile's unrevealed side indicates encounter level (1/2/3).

**Files:**
- `c:\Github_Maguas\HexSurvive\prototype\scripts\game_manager.js`
- `c:\Github_Maguas\HexSurvive\prototype\scripts\hex_grid.js`
- Tile data JSON (if any)

**Implementation:**
1. Add `encounterLevel` property to tile definitions (values 1-3)
2. Ensure `initMap()` sets encounter levels when generating map
3. Update `hex_grid.js` to draw level badge on unrevealed tiles
4. Update `grid.render()` hover tooltip/log to mention level when tile unrevealed

**UI:**
- Add legend explaining level colors/icons in sidebar or tooltips

**Testing:**
- Verify each tile retains encounter level after reveal (for logging only)
- Confirm hidden tiles show level indicator

---

### Phase 2: Code Cleanup (Remove Features)

#### 1.1 Remove XP System from `game_manager.js`

**Files to modify:**
- `c:\Github_Maguas\HexSurvive\prototype\scripts\game_manager.js`

**Changes needed:**
```javascript
// In createPlayer() function
// REMOVE:
xp: 0,
level: 1,

// Keep only:
hero: {
    location: null,
    stats: {
        tactics: 1,
        strength: 1,
        tech: 1
    },
    health: 3,
    hand: []  // For equipped items
}
```

**Additional removals:**
- Remove any XP-related methods
- Remove level-up logic
- Remove XP gain from combat results

#### 1.2 Remove Alien Patrol System

**Files to modify:**
- `c:\Github_Maguas\HexSurvive\prototype\scripts\game_manager.js`
- `c:\Github_Maguas\HexSurvive\prototype\scripts\main.js`
- `c:\Github_Maguas\HexSurvive\prototype\scripts\hex_grid.js`

**Changes needed in `game_manager.js`:**
```javascript
// In harvest() method
// REMOVE: Alien patrol blocking logic
// REMOVE: if (tile.alienPatrol) continue;

// In roll 7 handling (if exists)
// CHANGE: Remove patrol spawn/move logic
// KEEP: Just return null for "no production"
```

**Changes needed in `hex_grid.js`:**
```javascript
// In render() method
// REMOVE: Drawing alien patrol figures
// REMOVE: Any patrol-related rendering code
```

**Changes needed in `main.js`:**
```javascript
// REMOVE: Any patrol mode or patrol-related UI handlers
// REMOVE: Patrol selection logic
```

#### 1.3 Simplify Roll 7 Handling

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\game_manager.js`

**Changes:**
```javascript
harvest(rollValue) {
    // If roll is 7, just return null (no production)
    if (rollValue === 7) {
        return null;  // Simple - no other effects
    }
    
    // ... rest of harvest logic unchanged
}
```

---

### Phase 3: Update Combat & Elimination System

#### 2.1 Remove XP from Combat Rewards

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\combat.js`

**Changes:**
```javascript
// In resolveCombat() or similar
// REMOVE: XP reward tracking
// KEEP: Only equipment/loot reference

// Example result object:
this.result = {
    victory: true,
    equipment: card.equipment,  // Equipment from left side of encounter card
    resourceReward: card.resourceReward || null  // Optional resource bonus
};
```

#### 2.2 Implement Hero Defeat Mechanic

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\game_manager.js`

**New method to add:**
```javascript
defeatHero(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    
    // Find nearest owned outpost
    const nearestOutpost = this.findNearestOutpost(player);
    
    if (nearestOutpost) {
        // Respawn at nearest outpost edge (pick any edge)
        player.hero.location = {
            q: nearestOutpost.q,
            r: nearestOutpost.r,
            edgeIndex: 0  // Default edge
        };
    }
    
    // Mark as inactive for 2 turns
    player.hero.inactiveTurns = 2;
    
    // Increase threat
    this.threatTrack++;
    if (this.threatTrack >= 5) {
        this.threatLevel++;
        this.threatTrack = 0;
    }
}

// Helper method
findNearestOutpost(player) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const [key, tile] of this.map) {
        if (tile.outpost && tile.ownerId === player.id) {
            const distance = this.calculateDistance(
                player.hero.location.q,
                player.hero.location.r,
                tile.q,
                tile.r
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearest = tile;
            }
        }
    }
    
    return nearest;
}

// Add to endTurn()
endTurn() {
    // Decrement inactive turns for current player
    if (this.activePlayer.hero.inactiveTurns > 0) {
        this.activePlayer.hero.inactiveTurns--;
    }
    
    // ... existing endTurn logic
}
```

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\main.js`

**Changes in combat defeat handling:**
```javascript
// In combat modal defeat result handling
function handleCombatDefeat(result) {
    log(`💀 Defeated! Hero returns to outpost and is inactive for 2 turns`, 'danger');
    
    game.defeatHero(game.activePlayer.id);
    
    log(`⚠️ Threat increased to ${game.threatTrack}/5 (Level ${game.threatLevel})`, 'warning');
    
    updateUI();
    grid.render(game.map, null, game.players);
    closeCombatModal();
}
```

#### 3.3 Implement Player Elimination After 3 Deaths

**Files:**
- `game_manager.js`
- `main.js`

**Steps:**
1. Add `deathCount` to player object (initialize 0)
2. In `defeatHero()`, increment `deathCount`
3. If `deathCount >= 3`, mark player as eliminated:
   - Remove their hero from board (e.g., `hero.location = null`)
   - Disable their turn (skip in `endTurn()` by advancing until hitting non-eliminated player)
   - Remove their outposts? (decision: keep as abandoned but producible?) Document behaviour
4. Update UI to show elimination status (log + player panel)
5. If only one player remains, declare victory

**Testing:**
- Add unit test to simulate 3 defeats and ensure elimination
- Verify turns skip eliminated player

---

### Phase 4: Equipment System Integration (Future)

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\main.js`

**Changes:**
```javascript
// At the start of action phase handling
function handleCanvasClick(event) {
    // ... existing code
    
    if (game.phase === 'action' && !buildMode) {
        // Check if hero is inactive
        if (game.activePlayer.hero.inactiveTurns > 0) {
            log(`❌ Your hero is inactive for ${game.activePlayer.hero.inactiveTurns} more turn(s)`, 'warning');
            return;
        }
        
        // ... rest of action phase code
    }
}

// In updateUI()
function updateUI() {
    // ... existing code
    
    // Disable action buttons if hero inactive
    const isInactive = game.activePlayer.hero.inactiveTurns > 0;
    
    if (isInactive) {
        // Disable all action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
        
        // Show inactive message
        const statusMsg = document.getElementById('phase-display') || document.querySelector('.game-info');
        if (statusMsg) {
            statusMsg.innerHTML += `<br><span style="color: #ff6b6b;">Hero Inactive: ${game.activePlayer.hero.inactiveTurns} turn(s) remaining</span>`;
        }
    } else {
        // Enable buttons normally
        // ... existing enable/disable logic
    }
}
```

---

### Phase 3: Equipment System Integration (Future)

**Status:** Partially implemented (cards exist but not applied to stats)

**Future work needed:**
```javascript
// In combat dice rolling
function rollCombatDice(player) {
    // Base roll: 3 dice
    const dice = [
        { type: 'tactics', value: rollD6() },
        { type: 'strength', value: rollD6() },
        { type: 'tech', value: rollD6() }
    ];
    
    // Apply equipment modifiers (FUTURE IMPLEMENTATION)
    // for (const equipment of player.hero.hand) {
    //     if (equipment.bonus) {
    //         const matchingDie = dice.find(d => d.type === equipment.bonus.type);
    //         if (matchingDie) matchingDie.value += equipment.bonus.amount;
    //     }
    // }
    
    return dice;
}
```

---

### Phase 5: UI Updates

#### 4.1 Update Player Board Display

**File:** `c:\Github_Maguas\HexSurvive\prototype\index.html`

**Changes:**
```html
<!-- Update resource display section -->
<div class="resources">
    <div class="resource">
        <span class="icon">🔩</span>
        <span id="scrap-count">0</span>
    </div>
    <!-- ... other resources (keep same) -->
</div>

<!-- REMOVE XP display -->
<!-- DELETE: <div class="xp-tracker">XP: <span id="xp-count">0</span></div> -->
<!-- DELETE: <div class="level">Level: <span id="level-count">1</span></div> -->

<!-- ADD Inactive status display -->
<div class="hero-status">
    <div id="inactive-status" style="display: none; color: #ff6b6b;">
        Inactive: <span id="inactive-turns">0</span> turn(s)
    </div>
</div>
```

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\main.js`

**Update `updateUI()` function:**
```javascript
function updateUI() {
    // ... existing resource updates
    
    // REMOVE XP/Level updates
    // DELETE: document.getElementById('xp-count').textContent = game.activePlayer.xp || 0;
    // DELETE: document.getElementById('level-count').textContent = game.activePlayer.level || 1;
    
    // ADD inactive status display
    const inactiveStatus = document.getElementById('inactive-status');
    const inactiveTurns = game.activePlayer.hero.inactiveTurns || 0;
    
    if (inactiveTurns > 0) {
        inactiveStatus.style.display = 'block';
        document.getElementById('inactive-turns').textContent = inactiveTurns;
    } else {
        inactiveStatus.style.display = 'none';
    }
}
```

#### 4.2 Update Combat Modal

**File:** `c:\Github_Maguas\HexSurvive\prototype\scripts\main.js`

**Changes in reward display:**
```javascript
function showRewardUI(reward) {
    const rewardSection = document.getElementById('reward-section');
    
    // REMOVE XP display
    // DELETE: `<div>XP Gained: ${reward.xp || 0}</div>`
    
    // UPDATE to show equipment info
    rewardSection.innerHTML = `
        <h3>Victory!</h3>
        <div class="equipment-reward">
            <p>Equipment Gained:</p>
            <div class="equipment-card-preview">
                ${reward.equipment ? `
                    <div><strong>${reward.equipment.name}</strong></div>
                    <div>Slot: ${reward.equipment.slot}</div>
                    <div>Bonus: +${reward.equipment.bonus.amount} ${reward.equipment.bonus.type}</div>
                ` : 'No equipment'}
            </div>
        </div>
        ${reward.resourceReward ? `<div>Bonus Resources: ${reward.resourceReward}</div>` : ''}
        <button onclick="claimReward()">Claim Reward</button>
    `;
}
```

---

### Phase 6: Testing Updates

#### 5.1 Update Test Files

**Files to modify:**
- `c:\Github_Maguas\HexSurvive\test\test_rules.js`
- `c:\Github_Maguas\HexSurvive\test\test_combat.js`
- `c:\Github_Maguas\HexSurvive\test\test_combat_advanced.js`

**Changes needed:**
1. Remove XP assertions
2. Update combat result expectations (no XP in results)
3. Add tests for inactive hero mechanics
4. Remove patrol-related tests

**Example test update:**
```javascript
// BEFORE:
if (result.xp !== 10) throw new Error("Should gain 10 XP");

// AFTER:
if (!result.equipment) throw new Error("Should receive equipment");
if (result.equipment.slot !== 'weapon') throw new Error("Equipment slot mismatch");
```

#### 5.2 New Test: Hero Defeat Mechanic

**File:** `c:\Github_Maguas\HexSurvive\test\test_hero_defeat.js` (NEW FILE)

```javascript
import GameManager from '../prototype/scripts/game_manager.js';

console.log("🧪 Testing Hero Defeat Mechanic...\n");

const game = new GameManager();

// Setup: Give player an outpost
game.map.set("0,0", {
    q: 0, r: 0, type: 'ruins', revealed: true, numberToken: 6,
    outpost: true, ownerId: 1, fortress: false
});

// Place hero away from outpost
game.activePlayer.hero.location = { q: 2, r: 2, edgeIndex: 0 };

console.log("Test 1: Hero Defeat and Respawn");
game.defeatHero(game.activePlayer.id);

if (game.activePlayer.hero.location.q !== 0 || game.activePlayer.hero.location.r !== 0) {
    throw new Error("Hero should respawn at outpost (0,0)");
}
if (game.activePlayer.hero.inactiveTurns !== 2) {
    throw new Error("Hero should be inactive for 2 turns");
}
console.log("✅ Hero respawned at outpost and marked inactive for 2 turns");

console.log("\nTest 2: Inactive Turn Decrement");
game.endTurn();
if (game.players[1].hero.inactiveTurns !== 2) {
    throw new Error("Other player's inactive turns should not change");
}
game.endTurn(); // Back to player 1
if (game.activePlayer.hero.inactiveTurns !== 1) {
    throw new Error("Inactive turns should decrement to 1");
}
console.log("✅ Inactive turns decrement correctly");

console.log("\n✅ All hero defeat tests passed!");
```

---

## Execution Checklist

### Step-by-Step Implementation Order

1. ☐ **Backup current code** (create git branch or copy folder)

2. ☐ **Phase 1.1**: Remove XP system from `game_manager.js`
   - Remove `xp` and `level` from player creation
   - Remove XP-related methods
   - Test: Run existing tests

3. ☐ **Phase 1.2**: Remove Alien Patrol system
   - Remove from `game_manager.js` (harvest logic)
   - Remove from `hex_grid.js` (rendering)
   - Remove from `main.js` (UI handlers)
   - Test: Verify game loads and runs

4. ☐ **Phase 1.3**: Simplify roll 7 handling
   - Update `harvest()` to just return null on roll 7
   - Test: Roll dice and verify 7 = no production

5. ☐ **Phase 2.1**: Update combat rewards
   - Remove XP from combat results in `combat.js`
   - Update reward structure
   - Test: Fight an encounter, check result object

6. ☐ **Phase 2.2**: Implement hero defeat mechanic
   - Add `defeatHero()` method
   - Add `findNearestOutpost()` helper
   - Update `endTurn()` to decrement inactive turns
   - Test: Manually trigger defeat, verify respawn

7. ☐ **Phase 2.3**: Block actions for inactive heroes
   - Update click handlers in `main.js`
   - Update UI to show inactive status
   - Test: Defeat hero, try to move (should be blocked)

8. ☐ **Phase 4.1**: Update HTML/UI
   - Remove XP/Level displays
   - Add inactive status display
   - Test: Verify UI updates correctly

9. ☐ **Phase 4.2**: Update combat modal
   - Change reward display (remove XP, show equipment)
   - Test: Win combat, check reward UI

10. ☐ **Phase 5**: Update all test files
    - Remove XP assertions
    - Add hero defeat tests
    - Test: Run `node test/run_all_tests.js`

11. ☐ **Final Testing**:
    - Play full game in browser
    - Test all phases
    - Verify defeat respawn works
    - Check inactive turns countdown
    - Verify roll 7 has no effect
    - Confirm no errors in console

---

## Estimated Time

- **Phase 1** (Removal): 30-45 minutes
- **Phase 2** (Combat updates): 1-1.5 hours  
- **Phase 4** (UI updates): 30-45 minutes
- **Phase 5** (Testing): 30-45 minutes

**Total**: ~3-4 hours of development time

---

## Risk Assessment

### Low Risk Changes
- ✅ Removing XP display from UI
- ✅ Simplifying roll 7
- ✅ Removing patrol rendering

### Medium Risk Changes
- ⚠️ Updating combat reward structure (test thoroughly)
- ⚠️ Blocking inactive hero actions (edge cases)

### High Risk Changes
- ⚠️⚠️ Hero defeat respawn logic (complex pathfinding, edge cases)
  - **Mitigation**: Test with multiple outpost configurations
  - **Edge case**: What if player has NO outposts? (Return to 0,0 center?)

---

## Post-Implementation Verification

After completing all phases, verify:

1. ✅ Game loads without errors
2. ✅ All test suites pass
3. ✅ Can complete full turn cycle
4. ✅ Roll 7 shows "No production" log
5. ✅ Combat victory shows equipment (no XP)
6. ✅ Combat defeat triggers respawn + 2 inactive turns
7. ✅ Inactive hero cannot perform actions
8. ✅ Inactive turns count down properly
9. ✅ No console errors
10. ✅ UI shows inactive status when appropriate

---

**Status**: Ready to begin implementation
**Priority**: High
**Difficulty**: Medium
**Dependencies**: None (can start immediately)
