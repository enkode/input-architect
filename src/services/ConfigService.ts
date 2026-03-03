import { hid } from './HIDService';
import type { VIAKeyboardDefinition } from '../types/via';

export interface KeyboardConfig {
    version: number;
    timestamp: number;
    productId: number;
    layers: {
        [layerId: number]: {
            [keyIndex: number]: number // keycode
        }
    };
}

export class ConfigService {
    async readKeymap(definition: VIAKeyboardDefinition, layer: number): Promise<number[] | null> {
        if (!hid.isDeviceConnected()) return null;

        const keymap: number[] = [];

        // Use matrixPositions for correct row/col lookup
        for (let i = 0; i < definition.matrixPositions.length; i++) {
            const [row, col] = definition.matrixPositions[i];
            try {
                const code = await hid.getKeycode(layer, row, col);
                keymap.push(code ?? 0);
            } catch (e) {
                console.error(`Failed to read key index ${i} at [${row},${col}]:`, e);
                keymap.push(0);
            }
        }

        return keymap;
    }

    async backupConfig(): Promise<KeyboardConfig | null> {
        if (!hid.isDeviceConnected()) return null;
        // TODO: implement full backup using readKeymap across all layers
        return null;
    }

    async restoreConfig(config: KeyboardConfig, definition: VIAKeyboardDefinition): Promise<boolean> {
        if (!hid.isDeviceConnected()) return false;
        if (config.productId !== hid.getConnectedProductId()) {
            const confirm = window.confirm("Config Product ID mismatch. Restore anyway?");
            if (!confirm) return false;
        }

        for (const layerStr in config.layers) {
            const layer = Number(layerStr);
            const layerData = config.layers[layer];
            for (const keyIdxStr in layerData) {
                const keyIdx = Number(keyIdxStr);
                const code = layerData[keyIdx];
                const pos = definition.matrixPositions[keyIdx];
                if (pos) {
                    const [row, col] = pos;
                    await hid.setKeycode(layer, row, col, code);
                    await new Promise(res => setTimeout(res, 10));
                }
            }
        }

        alert("Configuration Restored!");
        return true;
    }
}

export const configService = new ConfigService();
