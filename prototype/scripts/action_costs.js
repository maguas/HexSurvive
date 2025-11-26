export const RESOURCE_METADATA = {
    scrap: { icon: "🔩", label: "Scrap", order: 0 },
    food: { icon: "🍏", label: "Food", order: 1 },
    fuel: { icon: "⚡", label: "Fuel", order: 2 },
    alloy: { icon: "🔮", label: "Alloy", order: 3 },
    intel: { icon: "💾", label: "Intel", order: 4 }
};

export const ACTION_COSTS = {
    buildOutpost: { scrap: 1, food: 1, fuel: 1, alloy: 1, intel: 1 },
    upgradeFortress: { scrap: 2, alloy: 3 },
    moveHero: { fuel: 2 },
    explore: { fuel: 1, food: 1 },
    extract: { fuel: 1, food: 1 }
};

const getResourceOrder = (resource) => {
    return RESOURCE_METADATA[resource]?.order ?? 99;
};

export function getCostDisplayData(cost) {
    return Object.entries(cost)
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => getResourceOrder(a[0]) - getResourceOrder(b[0]))
        .map(([resource, amount]) => ({
            resource,
            amount,
            icon: RESOURCE_METADATA[resource]?.icon || "",
            label: RESOURCE_METADATA[resource]?.label || resource
        }));
}

export function formatCostString(cost) {
    return getCostDisplayData(cost)
        .map(entry => `${entry.amount} ${entry.label}`)
        .join(', ');
}

export function canAfford(resources, cost) {
    if (!cost) return true;
    return Object.entries(cost).every(([resource, amount]) => {
        const available = resources?.[resource] ?? 0;
        return available >= amount;
    });
}

export function applyCost(resources, cost) {
    if (!cost) return;
    Object.entries(cost).forEach(([resource, amount]) => {
        if (!(resource in resources)) {
            resources[resource] = 0;
        }
        resources[resource] -= amount;
    });
}
