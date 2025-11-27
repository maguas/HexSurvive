# Xeno-Hex: Current Game Features
**Live Status Document - Updated: November 27, 2025**

This document tracks all currently implemented features in the game. It reflects the actual codebase state, not design goals.

---

## Core Systems

### Multiplayer System
- **2 Players**: Commander Red (#f44336) and Commander Blue (#2196f3)
- **Turn-based gameplay** with active player tracking
- **Player switching** at end of turn
- Each player has independent resources, hero, and victory points

- ### Map & Hex Grid
 - **Edge-based hero positioning**: Heroes stand on edges between tiles, not on tile centers
 - **Fog of war**: All tiles start unrevealed (dark)
 - **Encounter level preview**: Tile backs display threat level (1/2/3) so players can plan outpost placement/exploration risk
 - **Tile types**:
   - **Ruins** → Scrap (🔩)
   - **Wasteland** → Fuel (⚡)
   - **Overgrown** → Food (🍏)
   - **Crash Site** → Alloy (🔮)
   - **Bunker** → Intel (💾)
   - **Barren** → No production (❓)
 - **Number tokens**: 2-12 assigned on reveal for production
 - **Hex grid rendering**: Canvas-based with hover highlights and selection

---

## Setup Phase

### Initial Placement (4-Step Process)
1. **Player 1: Place Outpost** - Click any tile center
   - Tile revealed, number token assigned
   - Player gains 1 resource of tile type
   - +1 Victory Point
2. **Player 1: Place Hero** - Click any edge adjacent to outpost
   - Reveals adjacent tiles
   - Player gains 1 resource per revealed tile
3. **Player 2: Place Outpost** - Same as step 1
4. **Player 2: Place Hero** - Same as step 2

### Starting Resources
- **0 resources** per player initially
- **Plus tile bonus**: 1 resource of tile type when placing outpost
- **Plus exploration rewards** from hero placement (1 resource per revealed tile)

---

## Turn Structure

### Phase 1: Production
- **Passive Income First**: Before dice roll, active player gains per owned outpost:
  - +1 Fuel, +1 Food (standard outpost)
  - +2 Fuel, +2 Food (fortress)
- **Active Player rolls 2d6**
- **Result 2-6, 8-12**: 
  - All tiles with matching number tokens produce resources
  - **Multi-player resource generation**: Each player gains resources from:
    - Tiles adjacent to their hero location
    - Tiles with their owned outposts
  - Resources logged per player in game log
- **Fortress tiles**: Produce 2x resources instead of 1x

### Phase 2: Action
Players can perform actions:
- **Move Hero** (costs 2 Fuel per edge)
- **Build Outpost** (costs resources)
- **Upgrade to Fortress** (costs resources)
- Other actions planned but not implemented

### Phase 3: End Turn
- **Food Consumption**: Based on distance from nearest outpost
  - Hero must consume food equal to hex distance from nearest outpost
  - If insufficient food, hero returns to nearest outpost
- **Switch to next player**
- **Turn counter** increments when cycling back to Player 1
- **Reset per-turn flags**: encountersResolved, extractedThisTurn, movedThisTurn

---

## Hero System

### Hero Positioning
- **Edge-based**: Heroes occupy edges between two hexes
- **Visual representation**: Color-coded circles with player initial (R/B)
- **Both heroes always visible** on the map simultaneously
- **Location tracking**: Stored as `{q, r, edgeIndex}`

### Hero Movement
- **Cost**: 2 Fuel per move
- **Free movement**: Moving to an edge adjacent to any outpost is free
- **Movement validation**: Must move to adjacent edge (shares vertex)
- **Adjacent tile production**: Produces from both tiles touching the hero's edge
- **Movement restrictions**:
  - Cannot move after extracting resources this turn
  - Cannot move after resolving an encounter this turn
- **Exploration mechanics**:
  - Reveals unrevealed adjacent tiles (limit: 1 tile per move and turn)
  - Assigns number tokens to newly revealed tiles
  - **Exploration Rewards**: Gain 1 resource per newly revealed tile
  - Triggers encounter level selection for newly revealed tiles
  - 500ms delay before encounter modal appears
  - **Encounter limit**: 1 encounter per turn

### Hero Stats
- Health: 3
- Base Stats: Tactics 0, Strength 0, Tech 0 (start with no bonuses)
- Stats increase only through equipped items (from defeated encounters)
- **Gear Slots**: Suit and Weapon (2 equipment slots)

---

## Resource System

### Resource Types
1. **Scrap** (Grey) - From Ruins
2. **Fuel** (Orange) - From Wasteland  
3. **Food** (Green) - From Overgrown
4. **Alloy** (Purple) - From Crash Site
5. **Intel** (Blue) - From Bunker

### Resource Acquisition
- **Production Roll**: When dice matches tile's number token
- **Exploration Rewards**: 
  - When placing outpost: +1 resource of that tile type
  - When placing/moving hero: +1 resource per newly revealed tile
- **Passive Income**: +1 fuel, +1 food per owned outpost at turn start (before dice roll)
- **Fortress Bonus**: 2x production and 2x passive income
- **Extract Action**: Gain 2 resources per adjacent tile (costs 1 Fuel + 1 Food)
- **Combat Rewards**: Resource rewards from defeated encounters

### Resource Tracking
- **Per-player resources**: Each player has independent resource pools
- **UI Display**: Shows active player's resources only
- **Game log**: Shows which player gained what resources

---

## Building System

### Outpost
- **Cost**: Resources (specific costs in UI but may vary)
- **Placement**: On revealed tiles adjacent to hero location
- **Ownership**: Tracked by `ownerId` property
- **Benefits**:
  - +1 Victory Point
  - Enables production from that tile
  - Provides passive income (+1 fuel, +1 food per turn)
  - Free hero movement to outpost edges
- **Build Mode**: Click "Build Outpost" → Tile selection mode → Click tile

### Fortress
- **Cost**: Resources (specific costs in UI)
- **Requirement**: Must upgrade existing outpost
- **Benefits**:
  - +1 Victory Point (2 VP total with outpost)
  - 2x resource production instead of 1x
  - Enhanced passive income
- **Build Mode**: Click "Upgrade Fortress" → Tile selection mode → Click outpost

### Build Interaction
- **Build Mode System**: Toggle between edge movement and tile selection
- **ESC to cancel**: Press Escape key to exit build mode
- **Visual feedback**: Cursor changes to crosshair, tile highlights on hover
- **Validation**: Error messages if invalid placement

---

## Combat System

### Encounter Mechanics
- **Trigger**: Moving hero to new location with unrevealed tiles
- **Encounter Cards**: Drawn from threat-level-based decks
- **Modal UI**: Combat modal with encounter details

### Combat Resolution
- **Slot-based system**: Enemies have defense slots with requirements
- **Slot types**:
  - **Tactics (tac)**: Yellow slots - requires tactics dice
  - **Strength (str)**: Red slots - requires strength dice
  - **Tech**: Blue slots - requires tech dice
- **Dice rolling**: Player rolls 1d6 + stat bonus per stat type
  - Tactics die: 1d6 + tactics stat (from gear)
  - Strength die: 1d6 + strength stat (from gear)
  - Tech die: 1d6 + tech stat (from gear)
- **Grit Token System**:
  - Earned on defeat (equal to VP lost)
  - Can be spent before combat resolution to boost any dice
  - UI shows +/- buttons per stat when grit available
- **Animated resolution**:
  - 1.5 second dice rolling animation
  - Color-coded dice display (Yellow/Red/Blue)
  - Result banner (VICTORY / DEFEAT)

### Combat Results
- **Victory**:
  - **Victory Points**: +VP equal to encounter level (Level 1 = +1 VP, Level 2 = +2 VP, Level 3 = +3 VP)
  - Equipment loot (gear equipped to suit or weapon slot)
  - Resource rewards (optional, card-specific)
  - Reward UI with claim button
- **Defeat**:
  - **VP Loss**: Lose VP equal to encounter level
  - **Resource Loss**: Lose half of all resources
  - **Grit Tokens**: Gain grit tokens equal to VP lost (defeat bonus)
  - Hero marked inactive for 2 turns
  - **Death tally increases; on 3rd defeat the player is eliminated from the game**
  - Threat track increases

### Combat UI
- **Fight/Retreat buttons** (retreat costs 1 Food)
- **Enemy information**: Name, level, description, slots display
- **Dice area**: Shows player dice with colors and animated rolling
- **Grit Spending UI**: If player has grit tokens, can spend to boost dice before resolution
- **Requirements display**: Color-coded slots (Tactics/Strength/Tech)
- **Rewards preview**: Shows equipment and resource rewards before combat
- **Step-by-step resolution**: Animated combat flow with result banner

---

## UI Features

### Action Buttons
- **Resource cost display**: Shows required resources inline with icons
- **Dynamic enable/disable**: Buttons grey out when insufficient resources
- **Cost highlighting**: Red text when can't afford
- **Phase-based availability**: Some buttons only work in specific phases

### Game Log
- **Color-coded messages**: Success (green), warning (yellow), danger (red), normal
- **Per-player resource logging**: Shows which player gained resources
- **Action feedback**: Confirms moves, builds, encounters
- **Scrollable**: Maintains history of all game events

### Visual Feedback
- **Phase indicator**: Shows current game phase
- **Turn counter**: Displays current turn number
- **Active player highlight**: Shows whose turn it is
- **Victory Points**: Tracked and displayed per player
- **Threat Level**: Displayed in UI

### Mouse Interaction
- **Hover highlights**: 
  - Tiles highlight in setup and build modes
  - Edges highlight during movement
- **Click feedback**: Console logs for debugging
- **Cursor changes**: Crosshair for build/patrol modes
- **Selection visual**: Yellow outline on selected hex

### Keyboard Shortcuts
- **ESC**: Cancel build mode or patrol mode

---

## Game State Management

### Phase System
- **Setup**: 4-step initial placement
- **Production**: Dice rolling and resource generation
- **Action**: Hero movement and building
- Phase validation prevents actions in wrong phase

### Victory Conditions
- **Victory Points**: Tracked per player (visible in UI)
- **Target**: 10 VP to win (enforced with victory message)
- **VP Sources**:
  - Outpost: +1 VP
  - Fortress: +1 VP (total 2 with outpost)
  - **Combat Victory**: +VP equal to encounter level (1/2/3)
- **VP Loss**:
  - Combat defeat: -VP equal to encounter level

### Threat System
- **Threat Level**: 1-3 (displayed in UI)
- **Threat Track**: 0-5 counter
- **Encounter Decks**: Different decks per threat level
- **Threat increase**: On combat defeat (tracked but consequences not fully implemented)

---

## Technical Features

### Multi-player Resource Tracking
- **Per-player gains**: `playerGains` object tracks resources per player ID
- **Ownership system**: Tiles have `ownerId` property
- **Adjacent tile tracking**: System checks each player's hero-adjacent tiles independently
- **Production logging**: Shows resource gains per player separately

### Rendering System
- **Canvas-based hex grid**: Efficient rendering with HTML5 Canvas
- **Multi-hero rendering**: Draws all players' heroes simultaneously
- **Color-coded heroes**: Each player has unique color and initial display
- **Layer system**: Tiles → Outposts → Alien Patrols → Heroes → Highlights

### Data Structures
- **Map**: Uses ES6 Map with "q,r" string keys
- **Player objects**: Separate objects per player with resources, hero, VP
- **Tile objects**: Store type, revealed status, tokens, ownership, buildings
- **Hero location**: Object with {q, r, edgeIndex} coordinates

---

## Testing Infrastructure

### Test Suites
1. **Core Rules**: Basic game mechanics
2. **Combat Basic**: Victory and defeat scenarios
3. **Combat Advanced**: Complex slot mechanics
4. **Resource Generation**: Production system validation
5. **Movement & Exploration**: Hero movement and tile reveal

### Test Coverage
- ✅ All 5 test suites passing
- Multi-player resource tracking validated
- Combat resolution logic verified
- Movement costs and rewards verified

---

## Known Limitations / Not Implemented

### Partially Implemented
- **Food consumption**: Distance calculation exists, hero returns to outpost if insufficient food
- **Hero defeat**: Inactive turns tracked but not fully enforced in action restrictions
- **Threat consequences**: Level 3+ game over not enforced
- **Player elimination**: 3 defeats eliminates player, winner by elimination implemented

### Not Yet Implemented
- Co-op combat assistance
- Secret objectives
- Xeno-nests
- Boss encounters
- Resource trading between players

### Removed Features
- **XP/Leveling system**: Replaced with equipment-only progression
- **Alien Patrols**: Removed for now (may return in future iteration)

### Recently Added Features
- **Grit Token System**: Earned on defeat, spent to boost combat dice
- **Extract Action**: New action to gather resources from adjacent tiles
- **Encounter Level Selection**: Player chooses difficulty (1/2/3) when revealing tiles
- **VP from Combat**: Victory points scale with encounter level
- **Invasion Event (Roll 7)**: Increases threat, forces resource discard
- **Move/Extract Restrictions**: Cannot move after extracting or vice versa
- **Encounter Limit**: 1 encounter per turn maximum

---

## File Structure

### Core Game Files
- `game_manager.js`: Core game logic, state management
- `hex_grid.js`: Canvas rendering, hex math, visual display
- `main.js`: UI interactions, event handlers, game flow
- `combat.js`: Combat system, dice resolution
- `encounter_manager.js`: Encounter card decks

### UI Files
- `index.html`: Game layout and structure
- `main.css`: Styling, animations, responsive design

### Test Files
- `test_rules.js`: Core game rule validation
- `test_combat.js`: Basic combat testing
- `test_combat_advanced.js`: Complex combat scenarios
- `test_resource_generation.js`: Production system tests
- `test_movement_exploration.js`: Movement and exploration tests
- `run_all_tests.js`: Test suite runner

---

**Last Updated**: November 27, 2025
**Status**: Multiplayer prototype with core mechanics functional, grit token system, and encounter level selection
**Next Priority**: Complete threat system consequences, co-op combat, trading system
