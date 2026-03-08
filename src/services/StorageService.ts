const STORAGE_PREFIX = 'fw-hid';

interface StoredDeviceState {
    perKeyColors: Record<number, string>;
    rgbSettings?: RGBSettings;
    updatedAt: number;
}

export interface RGBSettings {
    brightness: number;
    effectId: number;
    speed: number;
    hue: number;
    saturation: number;
}

export interface ConfigSnapshot {
    id: string;
    timestamp: number;
    label: string;
    rgbSettings?: RGBSettings;
    perKeyColors?: Record<number, string>;
}

class StorageService {
    private deviceKey(productId: number): string {
        return `${STORAGE_PREFIX}:device:${productId.toString(16)}`;
    }

    saveDeviceState(productId: number, state: Partial<StoredDeviceState>): void {
        const existing = this.loadDeviceState(productId);
        const merged: StoredDeviceState = {
            perKeyColors: state.perKeyColors ?? existing?.perKeyColors ?? {},
            rgbSettings: state.rgbSettings ?? existing?.rgbSettings,
            updatedAt: Date.now(),
        };
        try {
            localStorage.setItem(this.deviceKey(productId), JSON.stringify(merged));
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }
    }

    loadDeviceState(productId: number): StoredDeviceState | null {
        try {
            const raw = localStorage.getItem(this.deviceKey(productId));
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    clearDeviceState(productId: number): void {
        localStorage.removeItem(this.deviceKey(productId));
    }

    // --- Config Snapshots ---

    private readonly SNAPSHOT_MAX = 20;

    private snapshotKey(productId: number): string {
        return `${STORAGE_PREFIX}:snapshots:${productId.toString(16)}`;
    }

    saveSnapshot(productId: number, data: Omit<ConfigSnapshot, 'id' | 'timestamp'>): ConfigSnapshot {
        const snapshot: ConfigSnapshot = {
            ...data,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: Date.now(),
        };
        const existing = this.loadSnapshots(productId);
        existing.push(snapshot);
        // Trim: remove oldest auto-saves first when over limit
        while (existing.length > this.SNAPSHOT_MAX) {
            const oldestAutoIdx = existing.findIndex(s => !s.label.startsWith('Manual'));
            if (oldestAutoIdx >= 0) {
                existing.splice(oldestAutoIdx, 1);
            } else {
                existing.shift();
            }
        }
        try {
            localStorage.setItem(this.snapshotKey(productId), JSON.stringify(existing));
        } catch (e) {
            console.warn('Snapshot save failed:', e);
        }
        return snapshot;
    }

    loadSnapshots(productId: number): ConfigSnapshot[] {
        try {
            const raw = localStorage.getItem(this.snapshotKey(productId));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    deleteSnapshot(productId: number, snapshotId: string): void {
        const snapshots = this.loadSnapshots(productId).filter(s => s.id !== snapshotId);
        try {
            localStorage.setItem(this.snapshotKey(productId), JSON.stringify(snapshots));
        } catch (e) {
            console.warn('Snapshot delete failed:', e);
        }
    }

    renameSnapshot(productId: number, snapshotId: string, newLabel: string): void {
        const snapshots = this.loadSnapshots(productId);
        const idx = snapshots.findIndex(s => s.id === snapshotId);
        if (idx >= 0) {
            snapshots[idx].label = newLabel;
            try {
                localStorage.setItem(this.snapshotKey(productId), JSON.stringify(snapshots));
            } catch (e) {
                console.warn('Snapshot rename failed:', e);
            }
        }
    }

    // --- Custom Key Presets ---

    private readonly PRESET_MAX = 20;

    private presetKey(productId: number): string {
        return `${STORAGE_PREFIX}:custom-presets:${productId.toString(16)}`;
    }

    saveCustomPreset(productId: number, label: string, indices: number[]): { id: string; label: string; indices: number[] } {
        const preset = {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            label,
            indices,
        };
        const existing = this.loadCustomPresets(productId);
        existing.push(preset);
        while (existing.length > this.PRESET_MAX) {
            existing.shift();
        }
        try {
            localStorage.setItem(this.presetKey(productId), JSON.stringify(existing));
        } catch (e) {
            console.warn('Custom preset save failed:', e);
        }
        return preset;
    }

    loadCustomPresets(productId: number): { id: string; label: string; indices: number[] }[] {
        try {
            const raw = localStorage.getItem(this.presetKey(productId));
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    deleteCustomPreset(productId: number, presetId: string): void {
        const presets = this.loadCustomPresets(productId).filter(p => p.id !== presetId);
        try {
            localStorage.setItem(this.presetKey(productId), JSON.stringify(presets));
        } catch (e) {
            console.warn('Custom preset delete failed:', e);
        }
    }
}

export const storageService = new StorageService();
