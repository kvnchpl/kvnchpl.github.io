// Separate named streams: terrain and artwork never consume ecological RNG.
export function hash(seed, text) {
    let value = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
        value = Math.imul(value ^ text.charCodeAt(i), 16777619);
        value ^= value >>> 13;
    }
    value = Math.imul(value ^ (value >>> 16), 2246822507);
    return (value ^ (value >>> 13)) >>> 0;
}
export function valueAt(seed, stream, key) {
    return hash(seed, `${stream}:${key}`) / 4294967296;
}
export function nextEcologicalRandom(state) {
    state.ecologyState = (Math.imul(state.ecologyState, 1664525) + 1013904223) >>> 0;
    return state.ecologyState / 4294967296;
}
export function visualVariant(seed, key, count) {
    return Math.floor(valueAt(seed, 'artwork', key) * count);
}
