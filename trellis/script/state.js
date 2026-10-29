import {valueAt, nextEcologicalRandom} from './random.js';

export const emptyStats = () => ({steps: 0, planted: 0, tilled: 0, watered: 0, fertilized: 0, harvested: 0});
export function createTile(tile = 'soil') {
    return {tile, plantType: null, growthStage: null, growthProgress: 0,
        moisture: 0, fertility: 0, weeds: false, mulch: false,
        readyToHarvest: false, tileVariant: null, plantVariant: null};
}
export function createState(rules, seed) {
    const player = {x: Math.floor(rules.mapWidth / 2), y: Math.floor(rules.mapHeight / 2)};
    return {seed: seed >>> 0, ecologyState: seed >>> 0, player, selector: {...player},
        map: {[`${player.x},${player.y}`]: createTile()}, revealed: {},
        time: {hour: rules.dayStartHour, minute: 0, week: 1, seasonIndex: 0}, dailyStats: emptyStats()};
}
export function isWithinMap(x, y, rules) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < rules.mapWidth && y < rules.mapHeight;
}
export function getTile(state, x, y, rules) {
    if (!isWithinMap(x, y, rules)) return null;
    const key = `${x},${y}`;
    if (!state.map[key]) {
        const entries = Object.entries(rules.initialTileWeights);
        const target = valueAt(state.seed, 'terrain', key) * entries.reduce((sum, [,w]) => sum + w, 0);
        let sum = 0;
        const type = entries.find(([,w]) => { sum += w; return target < sum; })?.[0] ?? entries.at(-1)[0];
        state.map[key] = createTile(type);
    }
    return state.map[key];
}
export function revealGarden(state, rules) {
    for (let dy = -rules.revealRadius; dy <= rules.revealRadius; dy++) {
        for (let dx = -rules.revealRadius; dx <= rules.revealRadius; dx++) {
            const x = state.player.x + dx, y = state.player.y + dy;
            if (!isWithinMap(x, y, rules)) continue;
            getTile(state, x, y, rules);
            state.revealed[`${x},${y}`] = true;
        }
    }
}
export function advanceTime(state, minutes, rules) {
    const total = Math.min(rules.dayEndHour * 60, state.time.hour * 60 + state.time.minute + minutes);
    state.time.hour = Math.floor(total / 60);
    state.time.minute = total % 60;
}
// A derived condition shared by growth and the interface; never stored in saves.
export function growthPausedForMoisture(tile, def) {
    return Boolean(def?.moistureResponse && tile.growthStage !== def.growthStages.at(-1)
        && tile.moisture <= def.moistureResponse.pauseAtOrBelow);
}
export function growPlant(tile, def) {
    const next = {...tile};
    if (!def || growthPausedForMoisture(tile, def)) return next;
    next.growthProgress++;
    const index = def.growthStages.indexOf(next.growthStage);
    if (next.growthProgress >= def.growthTime && index < def.growthStages.length - 1) {
        next.growthStage = def.growthStages[index + 1];
        next.growthProgress = 0;
        next.readyToHarvest = Boolean(def.harvestable && index + 1 === def.growthStages.length - 1);
    }
    next.moisture = Math.max(0, next.moisture - def.moistureUse);
    next.fertility = Math.max(0, next.fertility - def.fertilityUse);
    return next;
}
export function advanceGarden(state, rules, update = growPlant) {
    // Every calculation reads the same previous garden. Commit only after all
    // results exist. Sorted keys also fix the order of future ecological draws.
    const snapshot = Object.fromEntries(Object.entries(state.map).map(([key, tile]) => [key, Object.freeze({...tile})]));
    const tileAt = (x, y) => snapshot[`${x},${y}`] ?? null;
    const randomState = {ecologyState: state.ecologyState};
    const context = {tileAt, neighbors: (x, y) => [[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy]) => tileAt(x+dx,y+dy)), random: () => nextEcologicalRandom(randomState)};
    const updates = Object.keys(snapshot).sort().map(key => {
        const [x,y] = key.split(',').map(Number);
        return [key, update(snapshot[key], rules.species[snapshot[key].plantType], {...context, x, y})];
    });
    for (const [key, tile] of updates) state.map[key] = tile;
    state.ecologyState = randomState.ecologyState;
}
export function completeDay(state, rules) {
    advanceGarden(state, rules);
    state.time.hour = rules.dayStartHour;
    state.time.minute = 0;
    state.time.week += rules.timeStep.weeksPerCompletedDay;
    if (state.time.week > rules.weeksPerSeason) {
        state.time.week = 1;
        state.time.seasonIndex = (state.time.seasonIndex + 1) % rules.seasons.length;
    }
    state.dailyStats = emptyStats();
}
