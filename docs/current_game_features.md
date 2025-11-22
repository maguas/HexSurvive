# Xeno-Hex: Current Game Features
**Live Status Document - Updated: November 22, 2025**

This document tracks all currently implemented features in the game. It reflects the actual codebase state, not design goals.

---

## Core Systems

### Multiplayer System
- **2 Players**: Commander Red (#f44336) and Commander Blue (#2196f3)
- **Turn-based gameplay** with active player tracking
- **Player switching** at end of turn
- Each player has independent resources, hero, and victory points

### Map & Hex Grid
- **Edge-based hero positioning**: Heroes stand on edges between tiles, not on tile centers
- **Fog of war**: All tiles start unrevealed (dark)
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
- **1 Fuel** per player
- **Plus exploration rewards** from setup placement

---

## Turn Structure

### Phase 1: Production
- **Active Player rolls 2d6**
- **Result 2-6, 8-12**: 
  - All tiles with matching number tokens produce resources
  - **Multi-player resource generation**: Each player gains resources from:
    - Tiles adjacent to their hero location
    - Tiles with their owned outposts
  - Resources logged per player in game log
- **Result 7**: No production (no special effect currently)
- **Fortress tiles**: Produce 2x resources instead of 1x

### Phase 2: Action
Players can perform actions:
- **Move Hero** (costs 2 Fuel, free to outpost edges)
- **Build Outpost** (costs resources)
- **Upgrade to Fortress** (costs resources)
- Other actions planned but not implemented

### Phase 3: End Turn
- **Passive Income**: Each player gains per owned outpost:
  - +1 Fuel
  - +1 Food
- **Food Consumption**: Based on distance from nearest outpost (partially implemented)
- **Switch to next player**
- **Turn counter** increments when cycling back to Player 1

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
- **Exploration mechanics**:
  - Reveals unrevealed adjacent tiles
  - Assigns number tokens to newly revealed tiles
  - **Exploration Rewards**: Gain 1 resource per tile (even if already revealed)
  - Draws encounter card for newly revealed tiles
  - 500ms delay before encounter modal appears

### Hero Stats
- Health: 3
- Base Stats: Tactics 1, Strength 1, Tech 1
- Stats increase only through equipped items (from defeated encounters)
- Hand: Empty array (for future equipment)

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
  - When placing/moving hero: +1 resource per adjacent revealed tile
- **Passive Income**: +1 fuel, +1 food per owned outpost at turn end
- **Fortress Bonus**: 2x production instead of 1x

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
  - **Specific**: Requires tactics/strength/tech dice
  - **Any**: Can be filled with any dice type
- **Dice rolling**: Player rolls dice based on hero stats
- **Animated resolution**:
  - Step-by-step dice rolling with shake animation
  - Color-coded enemy slots (Yellow/Red/Blue/Grey)
  - Dice assignment visualization
  - Result banner (Victory! / Defeat!)

### Combat Results
- **Victory**:
  - Equipment loot (encounter card becomes equipment)
  - Resource rewards (optional, card-specific)
  - Card is tucked under hero card showing equipment bonuses
  - Reward UI with claim button
- **Defeat**:
  - Hero returns to nearest outpost
  - Hero is inactive for 2 turns
  - Threat increase (tracked)

### Combat UI
- **Fight/Retreat buttons** (retreat not implemented)
- **Enemy information**: Name, level, slots display
- **Dice area**: Shows player dice with colors
- **Combat hint**: Shows required slots
- **Step-by-step resolution**: Animated combat flow

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
- **Victory Points**: Tracked per player (currently visible in UI)
- **Target**: 10 VP to win (not enforced yet)
- **VP Sources**:
  - Outpost: +1 VP
  - Fortress: +1 VP (total 2 with outpost)
  - Other sources planned but not implemented

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
- **Food consumption**: Distance calculation exists but consequences minimal
- **Hero defeat**: Returns to outpost but 2-turn inactive period not enforced
- **Threat consequences**: Level 3+ game over not enforced
- **Equipment system**: Cards tracked but not integrated into stat calculations

### Not Yet Implemented
- Trading system
- Equipment stat bonuses affecting combat
- Co-op combat assistance
- Secret objectives
- Xeno-nests
- Boss encounters
- Resource trading (bank/players)

### Removed Features
- **XP/Leveling system**: Replaced with equipment-only progression
- **Alien Patrols**: Removed for now (may return in future iteration)
- **Roll 7 effects**: Currently has no effect (previously patrol movement)

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

**Last Updated**: November 22, 2025
**Status**: Multiplayer prototype with core mechanics functional
**Next Priority**: Complete threat system, alien patrol UI, hero progression
