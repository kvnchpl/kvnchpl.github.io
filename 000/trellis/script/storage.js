import {decodeSavedGame, serializeGame} from './saves.js';

// Browser persistence is an adapter. The codec and migration steps are usable
// with a file adapter, and each preview gets its own active and backup keys.
export function createBrowserStorage(rules, getStorage = () => localStorage, key = 'trellisSave') {
    const backupKey = `${key}:before-upgrade`;
    let protectionReason = null, pendingUpgrade = null;
    const read = name => { try { return getStorage().getItem(name); } catch { return null; } };
    const readRaw = () => read(key);
    const status = (bytes, reason = null, protectedSave = false) => {
        return {bytes, reason, protected: protectedSave,
            hasPrevious: protectedSave && readRaw() !== null, hasBackup: read(backupKey) !== null};
    };
    return {
        readRaw,
        readBackup: () => read(backupKey),
        load() {
            const raw = readRaw();
            if (raw === null) return null;
            try {
                const result = decodeSavedGame(raw, rules);
                pendingUpgrade = result.migrated ? raw : null;
                return result.state;
            } catch { protectionReason = 'unreadable'; return null; }
        },
        replace() {
            protectionReason = null; pendingUpgrade = null;
            try { getStorage().removeItem(key); } catch { /* In-memory play still works. */ }
        },
        save(state) {
            if (protectionReason) return status(null, protectionReason, true);
            let raw;
            try {
                raw = serializeGame(state);
                // Validate the actual serialized representation before replacing
                // a working save, including every required current-model field.
                decodeSavedGame(raw, rules);
            } catch { return status(null, 'invalid-state', true); }
            if (pendingUpgrade !== null) {
                if (readRaw() !== pendingUpgrade) return status(null, 'changed-save', true);
                try {
                    if (read(backupKey) !== pendingUpgrade) getStorage().setItem(backupKey, pendingUpgrade);
                    if (read(backupKey) !== pendingUpgrade) throw new Error('Upgrade backup was not kept');
                } catch { return status(null, 'upgrade-backup', true); }
            }
            try { getStorage().setItem(key, raw); }
            catch { return status(null, 'storage'); }
            pendingUpgrade = null;
            return status(new TextEncoder().encode(raw).length);
        }
    };
}
