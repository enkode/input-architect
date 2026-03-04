import { hid } from './HIDService';
import type { VIAKeyboardDefinition } from '../types/via';

export interface KeyboardConfig {
    version: number;
    timestamp: number;
    productId: number;
    productName?: string;
    layers: {
        [layerId: number]: {
            [keyIndex: number]: number // keycode
        }
    };
    rgbSettings?: {
        brightness: number;
        effectId: number;
        speed: number;
        hue: number;
        saturation: number;
    };
    perKeyColors?: Record<number, string>; // key index -> "rgb(r,g,b)"
}

const LAYER_COUNT = 6;

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

    async backupConfig(
        definition: VIAKeyboardDefinition,
        perKeyColors?: Record<number, string>,
        onProgress?: (layer: number, totalLayers: number) => void,
    ): Promise<KeyboardConfig | null> {
        if (!hid.isDeviceConnected()) return null;

        const productId = hid.getConnectedProductId();
        if (productId === null) return null;

        const config: KeyboardConfig = {
            version: 2,
            timestamp: Date.now(),
            productId,
            productName: hid.getConnectedProductName() ?? undefined,
            layers: {},
        };

        // Read all 6 layers
        for (let layer = 0; layer < LAYER_COUNT; layer++) {
            onProgress?.(layer, LAYER_COUNT);
            const keymap = await this.readKeymap(definition, layer);
            if (keymap) {
                config.layers[layer] = {};
                for (let i = 0; i < keymap.length; i++) {
                    if (keymap[i] !== 0) {
                        config.layers[layer][i] = keymap[i];
                    }
                }
            }
        }

        // Read global RGB settings
        const brightness = await hid.getRGBBrightness();
        const effectId = await hid.getRGBEffect();
        const speed = await hid.getRGBEffectSpeed();
        const color = await hid.getRGBColor();

        if (brightness !== null || effectId !== null) {
            config.rgbSettings = {
                brightness: brightness ?? 128,
                effectId: effectId ?? 1,
                speed: speed ?? 128,
                hue: color?.[0] ?? 0,
                saturation: color?.[1] ?? 255,
            };
        }

        // Include per-key colors from app state
        if (perKeyColors && Object.keys(perKeyColors).length > 0) {
            config.perKeyColors = { ...perKeyColors };
        }

        return config;
    }

    async restoreConfig(
        config: KeyboardConfig,
        definition: VIAKeyboardDefinition,
    ): Promise<{ success: boolean; perKeyColors?: Record<number, string> }> {
        if (!hid.isDeviceConnected()) return { success: false };
        if (config.productId !== hid.getConnectedProductId()) {
            const confirm = window.confirm("Config Product ID mismatch. Restore anyway?");
            if (!confirm) return { success: false };
        }

        // Restore keycodes layer by layer
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

        // Restore global RGB settings if present
        if (config.rgbSettings) {
            await hid.setRGBBrightness(config.rgbSettings.brightness);
            await hid.setRGBEffect(config.rgbSettings.effectId);
            await hid.setRGBEffectSpeed(config.rgbSettings.speed);
            await hid.setRGBColor(config.rgbSettings.hue, config.rgbSettings.saturation);
            await hid.saveRGBSettings(config.rgbSettings);
        }

        alert("Configuration Restored!");
        return {
            success: true,
            perKeyColors: config.perKeyColors,
        };
    }
}

export const configService = new ConfigService();
