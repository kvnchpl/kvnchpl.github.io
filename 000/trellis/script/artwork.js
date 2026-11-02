// Explicit URLs keep format, resolution, and variant count independent of biology.
export function validateArtwork(artwork, rules) {
    const check = (valid, message) => { if (!valid) throw new Error(`Invalid artwork: ${message}`); };
    const safeURL = url => typeof url === 'string' && /^(?:assets\/|\/__trellis-assets\/)[A-Za-z0-9_./-]+\.(?:png|webp)$/.test(url) && !url.split('/').includes('..');
    const variants = list => Array.isArray(list) && list.length > 0 && list.every(safeURL);
    check(artwork?.version === 1 && artwork.profiles && Object.hasOwn(artwork.profiles, artwork.defaultProfile), 'default profile');
    for (const [id, profile] of Object.entries(artwork.profiles)) {
        check(/^[a-z0-9][a-z0-9-]*$/.test(id) && typeof profile.label === 'string' && safeURL(profile.fallback), 'profile');
        check(Object.keys(profile.tiles ?? {}).every(id => rules.tileTypes.includes(id)), 'unknown terrain');
        check(Object.keys(profile.plants ?? {}).every(id => Object.hasOwn(rules.species, id)), 'unknown species');
        for (const tile of rules.tileTypes) check(variants(profile.tiles?.[tile]), `terrain ${id}/${tile}`);
        for (const [species, definition] of Object.entries(rules.species)) {
            for (const stage of definition.growthStages) check(variants(profile.plants?.[species]?.[stage]), `plant ${id}/${species}/${stage}`);
        }
    }
    return artwork;
}
export function artworkProfile(artwork, id = artwork.defaultProfile) {
    if (!Object.hasOwn(artwork.profiles, id)) throw new Error('Unknown artwork profile');
    return artwork.profiles[id];
}
export function artworkPaths(profile) {
    return [...new Set([profile.fallback, ...Object.values(profile.tiles).flat(),
        ...Object.values(profile.plants).flatMap(stages => Object.values(stages).flat())])];
}
