import {hash} from './random.js';
// Validate a complete save before touching the running farm. Older unversioned
// saves are accepted; unknown versions and malformed records remain untouched.
export function parseSavedGame(raw, config) {
    const data = JSON.parse(raw);
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
    const require = valid => { if (!valid) throw new Error('Invalid save'); };
    const point = value => record(value) && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);
    const coordinate = key => /^-?\d+,-?\d+$/.test(key) && key.split(',').every(v => Number.isSafeInteger(Number(v)));
    require(record(data) && (data.version === undefined || data.version === 1 || data.version === 2));
    require(point(data.player) && (data.selector === undefined || point(data.selector)));
    require(record(data.map) && record(data.revealed));
    const map = Object.create(null);
    for (const [key, tile] of Object.entries(data.map)) {
        require(coordinate(key) && record(tile) && config.tileTypes.includes(tile.tile));
        require(Number.isFinite(tile.moisture) && tile.moisture >= 0 && tile.moisture <= 100);
        require(Number.isFinite(tile.fertility) && tile.fertility >= 0 && tile.fertility <= 100);
        require(typeof tile.weeds === 'boolean' && typeof tile.mulch === 'boolean');
        require(integer(tile.growthProgress, 0, Number.MAX_SAFE_INTEGER));
        const variant = value => value == null || integer(value, 0, Number.MAX_SAFE_INTEGER);
        require(variant(tile.tileVariant) && variant(tile.plantVariant));
        const def = config.species[tile.plantType];
        require(tile.plantType === null || (Object.hasOwn(config.species, tile.plantType) && def.growthStages.includes(tile.growthStage)));
        map[key] = {
            tile: tile.tile, plantType: tile.plantType,
            growthStage: def ? tile.growthStage : null,
            growthProgress: def ? tile.growthProgress : 0,
            moisture: tile.moisture, fertility: tile.fertility,
            weeds: tile.weeds, mulch: tile.mulch,
            readyToHarvest: Boolean(def?.harvestable && tile.growthStage === def.growthStages.at(-1)),
            tileVariant: tile.tileVariant ?? null,
            plantVariant: def ? tile.plantVariant ?? null : null
        };
    }
    const revealed = Object.create(null);
    for (const [key, value] of Object.entries(data.revealed)) {
        require(coordinate(key) && typeof value === 'boolean');
        revealed[key] = value;
    }
    const time = data.time ?? {hour: config.dayStartHour, minute: 0, week: 1, seasonIndex: 0};
    require(record(time) && integer(time.hour, config.dayStartHour, config.dayEndHour) && integer(time.minute, 0, 59));
    require(integer(time.week, 1, config.weeksPerSeason) && integer(time.seasonIndex, 0, config.seasons.length - 1));
    require(time.hour !== config.dayEndHour || time.minute === 0);
    const dailyStats = {};
    require(data.dailyStats === undefined || record(data.dailyStats));
    for (const key of ['steps', 'planted', 'tilled', 'watered', 'fertilized', 'harvested']) {
        const value = data.dailyStats?.[key] ?? 0;
        require(integer(value, 0, Number.MAX_SAFE_INTEGER));
        dailyStats[key] = value;
    }
    // Keep historical tiles outside the old unenforced boundary, but return the
    // player to the nearest farm edge. No previously authored tile is removed.
    const player = {
        x: Math.max(0, Math.min(config.mapWidth - 1, data.player.x)),
        y: Math.max(0, Math.min(config.mapHeight - 1, data.player.y))
    };
    const uint = value => integer(value, 0, 4294967295);
    if (data.version === 2) require(uint(data.seed) && uint(data.ecologyState));
    // Seed old farms from terrain alone, independent of sprite choices and JSON key order.
    const legacyTerrain = Object.entries(map).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,tile]) => [key,tile.tile]);
    const seed = data.version === 2 ? data.seed : hash(0, JSON.stringify(legacyTerrain));
    const ecologyState = data.version === 2 ? data.ecologyState : seed;
    return {seed, ecologyState, player, selector: {...player}, map, revealed,
        time: {hour: time.hour, minute: time.minute, week: time.week, seasonIndex: time.seasonIndex}, dailyStats};
}

export function serializeGame(state) {
    const {seed, ecologyState, player, selector, map, revealed, time, dailyStats} = state;
    return JSON.stringify({version: 2, seed, ecologyState, player, selector, map, revealed, time, dailyStats});
}
