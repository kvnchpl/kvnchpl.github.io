import {parseSavedGame, serializeGame} from './saves.js';

// Browser-specific storage is outside the simulation and can be replaced by a
// file adapter for an offline application without changing garden rules.
export function createBrowserStorage(rules, getStorage = () => localStorage) {
    let protectedSave = false;
    const readRaw = () => { try { return getStorage().getItem('trellisSave'); } catch { return null; } };
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
            try { getStorage().removeItem('trellisSave'); } catch { /* In-memory play still works. */ }
        },
        save(state) {
            if (protectedSave) return {protected: true, bytes: null};
            const raw = serializeGame(state);
            try { getStorage().setItem('trellisSave', raw); }
            catch { return {protected: false, bytes: null}; }
            return {protected: false, bytes: new TextEncoder().encode(raw).length};
        }
    };
}
