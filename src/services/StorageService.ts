const STORAGE_PREFIX = 'fw-hid';

interface StoredDeviceState {
    perKeyColors: Record<number, string>;
    rgbSettings?: {
        brightness: number;
        effectId: number;
        speed: number;
        hue: number;
        saturation: number;
    };
    updatedAt: number;
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

    // --- Diagnostic Log ---

    private readonly LOG_KEY = `${STORAGE_PREFIX}:diag-log`;
    private readonly LOG_MAX = 200;

    appendDiagLog(entries: string[]): void {
        const existing = this.loadDiagLog();
        const combined = [...existing, ...entries].slice(-this.LOG_MAX);
        try {
            localStorage.setItem(this.LOG_KEY, JSON.stringify(combined));
        } catch (e) {
            console.warn('localStorage diag log save failed:', e);
        }
    }

    loadDiagLog(): string[] {
        try {
            const raw = localStorage.getItem(this.LOG_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    clearDiagLog(): void {
        localStorage.removeItem(this.LOG_KEY);
    }

    exportDiagLog(): string {
        return this.loadDiagLog().join('\n');
    }
}

export const storageService = new StorageService();
