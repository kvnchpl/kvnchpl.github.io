export function validateDefinitions({world, species, relationships, actions, presentation, sources, strings}) {
    const check = (valid, message) => { if (!valid) throw new Error(`Invalid definitions: ${message}`); };
    const positive = n => Number.isSafeInteger(n) && n > 0;
    check(positive(world.mapWidth) && positive(world.mapHeight), 'map dimensions');
    check(positive(world.weeksPerSeason) && world.seasons.length > 0, 'seasons');
    check(Number.isInteger(world.dayStartHour) && world.dayStartHour >= 0 && world.dayStartHour < world.dayEndHour && world.dayEndHour <= 24, 'day hours');
    check(world.timeStep.weeksPerCompletedDay === 1 && world.timeStep.growthUpdatesPerCompletedDay === 1, 'one completed day advances one week');
    check(positive(world.revealRadius) && positive(world.movementTimeIncrement), 'world movement');
    check(world.tileTypes.includes('soil') && world.tileTypes.includes('tilled'), 'terrain types');
    check(Object.entries(world.initialTileWeights).every(([id, weight]) => world.tileTypes.includes(id) && Number.isFinite(weight) && weight >= 0) && Object.values(world.initialTileWeights).some(w => w > 0), 'terrain weights');
    check(positive(presentation.viewport.tiles) && positive(presentation.imageVariantCount), 'display dimensions');
    for (const id of world.tileTypes) check(presentation.tiles.images[id] && presentation.tiles.colors[id], `terrain display ${id}`);
    for (const [id, def] of Object.entries(species)) {
        check(def.id === id && positive(def.growthTime) && def.growthStages.length > 0 && new Set(def.growthStages).size === def.growthStages.length, `species ${id}`);
        check(typeof def.harvestable === 'boolean' && Number.isFinite(def.moistureUse) && def.moistureUse >= 0 && Number.isFinite(def.fertilityUse) && def.fertilityUse >= 0, `species rates ${id}`);
        check(presentation.plants.labels[id] && presentation.plants.images[id] && presentation.plants.prefixes[id], `species display ${id}`);
        check(Array.isArray(def.sourceIds) && def.sourceIds.every(source => Object.hasOwn(sources, source)), `species sources ${id}`);
    }
    // Relationship records are reserved for researched, attributed additions.
    check(Array.isArray(relationships), 'relationships');
    const relationshipIds = new Set();
    for (const relationship of relationships) {
        check(typeof relationship.id === 'string' && !relationshipIds.has(relationship.id), 'relationship identifier');
        relationshipIds.add(relationship.id);
        check(relationship.speciesIds.length > 1 && relationship.speciesIds.every(id => Object.hasOwn(species, id)), 'relationship species');
        check(relationship.sourceIds.length > 0 && relationship.sourceIds.every(id => Object.hasOwn(sources, id)), 'relationship sources');
    }
    for (const [id, source] of Object.entries(sources)) check(source.title && source.attribution && source.url, `source ${id}`);
    for (const [id, action] of Object.entries(actions)) check(positive(action.timeIncrement) && action.effect && presentation.keyBindings.actions[id], `action ${id}`);
    check(strings.actions && Object.keys(species).length > 0, 'labels');
    return {rules: {...world, species, relationships, actions}, presentation, sources, strings};
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
