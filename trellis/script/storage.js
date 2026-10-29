import {parseSavedGame, serializeGame} from './saves.js';

// Browser-specific storage is outside the simulation and can be replaced by a
// file adapter for an offline application without changing garden rules.
export function createBrowserStorage(rules, getStorage = () => localStorage, key = 'trellisSave') {
    let protectedSave = false;
    const readRaw = () => { try { return getStorage().getItem(key); } catch { return null; } };
    return {
        readRaw,
        load() {
            const raw = readRaw();
            if (raw === null) return null;
            try { return parseSavedGame(raw, rules); }
            catch { protectedSave = true; return null; }
        },
        replace() {
            protectedSave = false;
            try { getStorage().removeItem(key); } catch { /* In-memory play still works. */ }
        },
        save(state) {
            if (protectedSave) return {protected: true, bytes: null};
            const raw = serializeGame(state);
            try { getStorage().setItem(key, raw); }
            catch { return {protected: false, bytes: null}; }
            return {protected: false, bytes: new TextEncoder().encode(raw).length};
        }
    };
}
