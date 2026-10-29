import {validateArtwork} from './artwork.js';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = values => Array.isArray(values) && new Set(values).size === values.length;
const fail = (valid, name) => { if (!valid) throw new Error(`Invalid definitions: ${name}`); };
const keys = (object, allowed, name) => fail(record(object) && Object.keys(object).every(key => allowed.includes(key)), name);
function validateActions(actions, world, species) {
    const numeric = ['moisture','fertility','growthProgress'];
    const fields = ['tile','plantType','growthStage',...numeric,'weeds','mulch','readyToHarvest','tileVariant','plantVariant'];
    function value(key, val) {
        if (key === 'tile') return world.tileTypes.includes(val);
        if (key === 'plantType') return val === null || Object.hasOwn(species,val);
        if (key === 'growthStage') return val === null || Object.values(species).some(def => def.growthStages.includes(val));
        if (['weeds','mulch','readyToHarvest'].includes(key)) return typeof val === 'boolean';
        if (key.endsWith('Variant')) return val === null || Number.isSafeInteger(val) && val >= 0;
        if (key === 'growthProgress') return Number.isSafeInteger(val) && val >= 0;
        return Number.isFinite(val) && val >= world[`${key}Range`].min && val <= world[`${key}Range`].max;
    }
    function condition(rule, name) {
        fail(record(rule) && Object.keys(rule).length > 0, name);
        if (Object.hasOwn(rule,'or')) {
            keys(rule,['or'],name);
            fail(Array.isArray(rule.or) && rule.or.length > 0,name);
            rule.or.forEach(child => condition(child,name)); return;
        }
        keys(rule,fields,name);
        for (const [key, val] of Object.entries(rule)) {
            if (record(val)) {
                fail(Object.keys(val).length === 1,name);
                const [operator] = Object.keys(val);
                fail(['lt','gt','not'].includes(operator),name);
                fail(operator === 'not' ? value(key,val.not) : numeric.includes(key) && value(key,val[operator]),name);
            } else fail(value(key,val),name);
        }
    }
    for (const [id, action] of Object.entries(actions)) {
        const name = `action ${id}`;
        keys(action,['condition','effect','timeIncrement'],name);
        condition(action.condition,`${name} condition`);
        keys(action.effect,fields,`${name} effect`);
        fail(Object.keys(action.effect).length > 0,`${name} effect`);
        for (const [key,val] of Object.entries(action.effect)) {
            if (record(val)) {
                keys(val,['inc','dec'],`${name} effect ${key}`);
                fail(['moisture','fertility'].includes(key) && Object.keys(val).length === 1 && Object.values(val).every(n => Number.isFinite(n) && n > 0),`${name} effect ${key}`);
            } else fail(value(key,val),`${name} effect ${key}`);
        }
    }
}
export function validateDefinitions({world, species, relationships, actions, presentation, sources, strings, artwork}) {
    const check = (valid, message) => { if (!valid) throw new Error(`Invalid definitions: ${message}`); };
    for (const [name,def] of Object.entries({world,species,actions,presentation,sources,strings})) fail(record(def),`${name} object`);
    const positive = n => Number.isSafeInteger(n) && n > 0;
    check(positive(world.mapWidth) && positive(world.mapHeight), 'map dimensions');
    check(unique(world.seasons) && world.seasons.length > 0 && world.seasons.every(text), 'season names');
    check(unique(world.tileTypes) && world.tileTypes.every(text), 'terrain identifiers');
    for (const resource of ['moisture','fertility']) {
        const range=world[`${resource}Range`];
        check(record(range) && range.min === 0 && range.max === 100, `${resource} range must match saved 0–100 values`);
    }
    check(positive(world.weeksPerSeason) && world.seasons.length > 0, 'seasons');
    check(Number.isInteger(world.dayStartHour) && world.dayStartHour >= 0 && world.dayStartHour < world.dayEndHour && world.dayEndHour <= 24, 'day hours');
    check(world.timeStep.weeksPerCompletedDay === 1 && world.timeStep.growthUpdatesPerCompletedDay === 1, 'one completed day advances one week');
    check(positive(world.revealRadius) && positive(world.movementTimeIncrement), 'world movement');
    check(world.tileTypes.includes('soil') && world.tileTypes.includes('tilled'), 'terrain types');
    check(Object.entries(world.initialTileWeights).every(([id, weight]) => world.tileTypes.includes(id) && Number.isFinite(weight) && weight >= 0) && Object.values(world.initialTileWeights).some(w => w > 0), 'terrain weights');
    check(positive(presentation.viewport.tiles), 'display dimensions');
    for (const id of world.tileTypes) check(presentation.tiles.colors[id], `terrain display ${id}`);
    for (const [id, def] of Object.entries(species)) {
        keys(def,['id','growthStages','growthTime','harvestable','moistureUse','fertilityUse','sourceIds','evidenceStatus','moistureResponse'],`species fields ${id}`);
        check(unique(def.growthStages) && def.growthStages.every(text), `species stages ${id}`);
        check(def.evidenceStatus === 'prototype-placeholder', `species rate evidence ${id}`);
        check(def.id === id && positive(def.growthTime) && def.growthStages.length > 0 && new Set(def.growthStages).size === def.growthStages.length, `species ${id}`);
        check(typeof def.harvestable === 'boolean' && Number.isFinite(def.moistureUse) && def.moistureUse >= 0 && Number.isFinite(def.fertilityUse) && def.fertilityUse >= 0, `species rates ${id}`);
        check(presentation.plants.labels[id], `species display ${id}`);
        check(unique(def.sourceIds) && def.sourceIds.every(source => Object.hasOwn(sources, source)), `species sources ${id}`);
        if (def.moistureResponse !== undefined) {
            const response = def.moistureResponse;
            keys(response,['pauseAtOrBelow','evidenceStatus','sourceIds','explanation','modelNote'],`moisture fields ${id}`);
            check(response && Number.isFinite(response.pauseAtOrBelow) && response.pauseAtOrBelow >= world.moistureRange.min && response.pauseAtOrBelow < world.moistureRange.max, `moisture threshold ${id}`);
            check(response.evidenceStatus === 'source-informed-simplification' && typeof response.explanation === 'string' && response.explanation.trim() && typeof response.modelNote === 'string' && response.modelNote.trim(), `moisture explanation ${id}`);
            check(unique(response.sourceIds) && response.sourceIds.length > 0 && response.sourceIds.every(source => def.sourceIds.includes(source) && Object.hasOwn(sources, source)), `moisture sources ${id}`);
        }
    }
    // Relationship records are reserved for researched, attributed additions.
    check(Array.isArray(relationships), 'relationships');
    const relationshipIds = new Set();
    for (const relationship of relationships) {
        keys(relationship,['id','speciesIds','sourceIds'], 'relationship fields');
        check(unique(relationship.speciesIds) && unique(relationship.sourceIds), 'relationship references');
        check(text(relationship.id) && typeof relationship.id === 'string' && !relationshipIds.has(relationship.id), 'relationship identifier');
        relationshipIds.add(relationship.id);
        check(relationship.speciesIds.length > 1 && relationship.speciesIds.every(id => Object.hasOwn(species, id)), 'relationship species');
        check(relationship.sourceIds.length > 0 && relationship.sourceIds.every(id => Object.hasOwn(sources, id)), 'relationship sources');
    }
    for (const [id, source] of Object.entries(sources)) {
        keys(source,['title','attribution','url'], `source fields ${id}`);
        check(text(source.title) && text(source.attribution) && text(source.url), `source ${id}`);
        let url; try { url = new URL(source.url); } catch { check(false, `source URL ${id}`); }
        check(['https:','http:'].includes(url.protocol) && !url.username && !url.password, `source URL ${id}`);
    }
    validateActions(actions,world,species);
    const bindings=presentation.keyBindings;
    const directions=['up','down','left','right','selectUp','selectDown','selectLeft','selectRight','resetSelector'];
    keys(bindings,[...directions,'actions'],'control bindings');
    keys(bindings.actions,Object.keys(actions),'action bindings');
    const bound=[...directions.map(id=>bindings[id]),...Object.keys(actions).map(id=>bindings.actions[id])];
    check(bound.every(text) && unique(bound.map(key=>key.length===1?key.toLowerCase():key)), 'missing or duplicate control bindings');
    check(Object.keys(bindings.actions).length === Object.keys(actions).length, 'action bindings');
    for (const [id, action] of Object.entries(actions)) check(positive(action.timeIncrement) && action.effect && presentation.keyBindings.actions[id], `action ${id}`);
    check(strings.actions && Object.keys(species).length > 0, 'labels');
    const rules = {...world, species, relationships, actions};
    validateArtwork(artwork, rules);
    return {rules, presentation, sources, strings, artwork};
}
export async function loadDefinitions(fetchJSON = async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
}) {
    const manifest = await fetchJSON('config.json');
    if (manifest.schemaVersion !== 1) throw new Error('Unsupported configuration version');
    const entries = await Promise.all(Object.entries(manifest.definitions).map(async ([name, path]) => [name, await fetchJSON(path)]));
    return validateDefinitions(Object.fromEntries(entries));
}
