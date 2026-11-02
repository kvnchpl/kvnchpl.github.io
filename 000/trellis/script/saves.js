import {hash} from './random.js';

export const SAVE_VERSION = 2;
export const SUPPORTED_SAVE_VERSIONS = Object.freeze([0, 1, 2]);
const uint = value => Number.isSafeInteger(value) && value >= 0 && value <= 4294967295;
const tileFields = ['tile','plantType','growthStage','growthProgress','moisture','fertility',
    'weeds','mulch','readyToHarvest','tileVariant','plantVariant'];
const pick = (object, fields) => Object.fromEntries(fields.map(key => [key, object[key]]));

// Validation builds a new state. Neither loading nor migration mutates the
// decoded source, and presentation/runtime-only fields never enter save data.
function readGarden(data, config) {
    const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
    const require = valid => { if (!valid) throw new Error('Invalid save'); };
    const point = value => record(value) && Number.isSafeInteger(value.x) && Number.isSafeInteger(value.y);
    const coordinate = key => /^-?\d+,-?\d+$/.test(key) && key.split(',').every(v => Number.isSafeInteger(Number(v)));
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
    require(record(data.time) && record(data.dailyStats));
    const time = data.time ?? {hour: config.dayStartHour, minute: 0, week: 1, seasonIndex: 0};
    require(record(time) && integer(time.hour, config.dayStartHour, config.dayEndHour) && integer(time.minute, 0, 59));
    require(integer(time.week, 1, config.weeksPerSeason) && integer(time.seasonIndex, 0, config.seasons.length - 1));
    require(time.hour !== config.dayEndHour || time.minute === 0);
    const dailyStats = {};
    require(data.dailyStats === undefined || record(data.dailyStats));
    for (const key of ['steps', 'planted', 'tilled', 'watered', 'fertilized', 'harvested']) {
        require(Number.isSafeInteger(data.dailyStats[key]));
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
    return {player, selector: {...player}, map, revealed,
        time: {hour: time.hour, minute: time.minute, week: time.week, seasonIndex: time.seasonIndex}, dailyStats};
}
function legacySeed(map) {
    const terrain = Object.entries(map).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([key,tile]) => [key,tile.tile]);
    return hash(0, JSON.stringify(terrain));
}
// Add a single forward step here when the stored model changes, together with
// historical fixtures. Version 0 represents the released unversioned format.
const migrations = new Map([
    [0, garden => ({...garden, version: 1})],
    [1, (garden, config) => {
        const seed = legacySeed(garden.map);
        const defaults = {steps:0, planted:0, tilled:0, watered:0, fertilized:0, harvested:0};
        const stats = garden.dailyStats;
        const dailyStats = stats === undefined ? defaults :
            stats && typeof stats === 'object' && !Array.isArray(stats)
                ? Object.fromEntries(Object.keys(defaults).map(key => [key,stats[key] ?? 0])) : stats;
        return {...garden, version: 2, seed, ecologyState: seed, dailyStats,
            time:garden.time ?? {hour:config.dayStartHour,minute:0,week:1,seasonIndex:0}};
    }]

]);
export function decodeSavedGame(raw, config) {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid save');
    const sourceVersion = data.version === undefined ? 0 : data.version;
    if (!SUPPORTED_SAVE_VERSIONS.includes(sourceVersion)) throw new Error('Unsupported save version');
    // Forward migrations run before current-model validation, so a future
    // migration can rename old species IDs or introduce ecological fields.
    let garden = {...data, version:sourceVersion};
    while (garden.version < SAVE_VERSION) {
        const migrate = migrations.get(garden.version);
        if (!migrate) throw new Error('Missing save migration');
        garden = migrate(garden, config);
    }
    if (!uint(garden.seed) || !uint(garden.ecologyState)) throw new Error('Invalid random state');
    const state = {...readGarden(garden, config),seed:garden.seed,ecologyState:garden.ecologyState};
    return {state, sourceVersion, migrated: sourceVersion !== SAVE_VERSION};
}
export function parseSavedGame(raw, config) {
    return decodeSavedGame(raw, config).state;
}
export function serializeGame(state) {
    const {seed, ecologyState, player, selector, time, dailyStats} = state;
    const map = Object.fromEntries(Object.entries(state.map).map(([key,tile]) => [key,pick(tile,tileFields)]));
    return JSON.stringify({version: SAVE_VERSION, seed, ecologyState,
        player:pick(player,['x','y']), selector:pick(selector,['x','y']), map,
        revealed:Object.fromEntries(Object.entries(state.revealed)),
        time:pick(time,['hour','minute','week','seasonIndex']),
        dailyStats:pick(dailyStats,['steps','planted','tilled','watered','fertilized','harvested'])});
}
