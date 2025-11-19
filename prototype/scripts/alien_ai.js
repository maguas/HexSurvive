export class AlienAI {
    constructor() {
        this.name = "Xeno-Mind";
    }

    /**
     * Suggests a move for the Alien Patrol.
     * Currently picks a random revealed tile.
     * @param {Map} map - The game map
     * @param {string} currentPos - "q,r" key of current position
     * @returns {Object} { q, r } or null
     */
    suggestPatrolMove(map, currentPos) {
        const candidates = [];

        map.forEach((tile, key) => {
            if (tile.revealed && key !== currentPos && !tile.alienPatrol) {
                candidates.push(key);
            }
        });

        if (candidates.length === 0) return null;

        // Simple AI: Random move
        // TODO: Prioritize tiles with Outposts or high resources
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        const [q, r] = choice.split(',').map(Number);

        return { q, r };
    }
}
