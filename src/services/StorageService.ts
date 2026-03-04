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
}

export const storageService = new StorageService();
