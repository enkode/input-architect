/// <reference types="w3c-web-hid" />

// VIA Protocol Constants (from quantum/via.h)
const VIA_GET_PROTOCOL_VERSION       = 0x01;
const VIA_DYNAMIC_KEYMAP_GET_KEYCODE = 0x04;
const VIA_DYNAMIC_KEYMAP_SET_KEYCODE = 0x05;
const VIA_CUSTOM_SET_VALUE           = 0x07; // V3: id_custom_set_value
const VIA_CUSTOM_GET_VALUE           = 0x08; // V3: id_custom_get_value
const VIA_CUSTOM_SAVE                = 0x09;

// VIA V3 Channel IDs (only used when protocolVersion >= 11)
const CHANNEL_RGB_MATRIX   = 3;

// RGB Matrix Value IDs
const RGB_MATRIX_BRIGHTNESS   = 1;
const RGB_MATRIX_EFFECT       = 2;
const RGB_MATRIX_EFFECT_SPEED = 3;
const RGB_MATRIX_COLOR        = 4;  // [hue, saturation]

// nucleardog rgb_remote protocol (custom firmware for per-key RGB)
// https://gitlab.com/nucleardog/qmk_firmware_fw16
const RGB_REMOTE_CMD             = 0xFE;
const RGB_REMOTE_QUERY           = 0x00;
const RGB_REMOTE_ENABLE          = 0x01;
const RGB_REMOTE_DISABLE         = 0x02;
const RGB_REMOTE_SET_LEDS        = 0x10;

// Standard VIA Vendor IDs (Framework + Generic QMK)
const SUPPORTED_VIDS = [0x32AC, 0x4657];

// QMK Raw HID interface identifiers
// The keyboard exposes multiple HID interfaces (boot keyboard, raw HID, consumer).
// VIA commands only work on the raw HID interface (usage page 0xFF60, usage 0x61).
const RAW_HID_USAGE_PAGE = 0xFF60;
const RAW_HID_USAGE = 0x61;

export class HIDService {
    private device: HIDDevice | null = null;
    private isConnected: boolean = false;
    private connectionListeners: Set<(connected: boolean) => void> = new Set();
    private disconnectHandler: ((e: HIDConnectionEvent) => void) | null = null;
    private protocolVersion: number = 0; // 0 = unknown, >= 11 = V3
    private _hasPerKeySupport: boolean = false; // nucleardog rgb_remote firmware
    private _perKeyEnabled: boolean = false;
    // Command queue to serialize HID commands (prevents response mix-ups)
    private commandQueue: Promise<DataView | null> = Promise.resolve(null);

    /** Whether the device uses VIA V3 (channel-based) protocol */
    get isV3(): boolean {
        return this.protocolVersion >= 11;
    }

    async requestDevice(): Promise<boolean> {
        try {
            const devices = await navigator.hid.requestDevice({
                filters: SUPPORTED_VIDS.map(vid => ({
                    vendorId: vid,
                    usagePage: RAW_HID_USAGE_PAGE,
                    usage: RAW_HID_USAGE,
                }))
            });

            if (devices.length > 0) {
                return await this.openDevice(devices[0]);
            }
        } catch (err) {
            console.error("Failed to connect HID:", err);
        }
        return false;
    }

    async openDevice(device: HIDDevice): Promise<boolean> {
        try {
            // Clean up previous device if any
            if (this.device) {
                this.cleanupDevice();
            }

            if (!device.opened) {
                await device.open();
            }
            this.device = device;
            this.isConnected = true;

            // Listen for disconnection (single handler, cleaned up properly)
            this.disconnectHandler = (e: HIDConnectionEvent) => {
                if (e.device === this.device) {
                    this.disconnect();
                }
            };
            navigator.hid.addEventListener('disconnect', this.disconnectHandler);

            // Detect protocol version
            this.protocolVersion = await this.getProtocolVersion();

            // Detect per-key RGB firmware support (nucleardog rgb_remote)
            this._hasPerKeySupport = await this.detectPerKeySupport();

            console.log(`HID Device connected: ${this.device.productName} (PID: 0x${device.productId.toString(16)}, VIA Protocol: ${this.protocolVersion}${this.isV3 ? ' [V3]' : ' [V2]'}, Per-Key RGB: ${this._hasPerKeySupport ? 'YES' : 'NO'})`);

            this.notifyListeners();
            return true;
        } catch (err) {
            console.error("Failed to open HID device:", err);
            return false;
        }
    }

    /** Queue-wrapped sendCommand — ensures commands are serialized (no overlapping responses) */
    async sendCommand(commandId: number, data: number[] = []): Promise<DataView | null> {
        const result = this.commandQueue.then(
            () => this._sendCommandRaw(commandId, data),
            () => this._sendCommandRaw(commandId, data) // continue even if prev failed
        );
        this.commandQueue = result;
        return result;
    }

    private async _sendCommandRaw(commandId: number, data: number[]): Promise<DataView | null> {
        if (!this.device || !this.device.opened) return null;

        const reportId = 0x00;
        const packet = new Uint8Array(32);
        packet[0] = commandId;
        for (let i = 0; i < data.length; i++) {
            packet[i + 1] = data[i];
        }

        const hexData = Array.from(packet.slice(0, Math.max(data.length + 1, 4))).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`HID TX: [${hexData}]`);

        try {
            // Set up listener BEFORE sending to avoid race condition
            const responsePromise = new Promise<DataView | null>((resolve) => {
                if (!this.device) return resolve(null);

                const timeoutId = setTimeout(() => {
                    this.device?.removeEventListener('inputreport', listener);
                    console.warn(`HID RX: (timeout for cmd 0x${commandId.toString(16).padStart(2, '0')})`);
                    resolve(null);
                }, 1000);

                const listener = (event: HIDInputReportEvent) => {
                    if (event.reportId === 0x00 || event.reportId === 0) {
                        clearTimeout(timeoutId);
                        this.device?.removeEventListener('inputreport', listener);
                        const rxBytes = [];
                        for (let i = 0; i < Math.min(event.data.byteLength, 8); i++) {
                            rxBytes.push(event.data.getUint8(i).toString(16).padStart(2, '0'));
                        }
                        console.log(`HID RX: [${rxBytes.join(' ')}...]`);
                        // Check for id_unhandled (0xFF) response
                        if (event.data.byteLength > 0 && event.data.getUint8(0) === 0xFF) {
                            console.warn(`HID: Command 0x${commandId.toString(16).padStart(2, '0')} was REJECTED by firmware (0xFF)`);
                        }
                        resolve(event.data);
                    }
                };
                this.device.addEventListener('inputreport', listener);
            });

            await this.device.sendReport(reportId, packet);
            return await responsePromise;

        } catch (err) {
            console.error("HID Send Error:", err);
            return null;
        }
    }

    // --- Keycode Commands (VIA: 0x04/0x05 - same in V2 and V3) ---

    async getKeycode(layer: number, row: number, col: number): Promise<number | null> {
        const data = await this.sendCommand(VIA_DYNAMIC_KEYMAP_GET_KEYCODE, [layer, row, col]);
        if (data && data.byteLength >= 6) {
            return (data.getUint8(4) << 8) | data.getUint8(5);
        }
        return null;
    }

    async setKeycode(layer: number, row: number, col: number, keycode: number) {
        const hi = (keycode >> 8) & 0xFF;
        const lo = keycode & 0xFF;
        await this.sendCommand(VIA_DYNAMIC_KEYMAP_SET_KEYCODE, [layer, row, col, hi, lo]);
    }

    // --- RGB Matrix Commands (auto-adapts V2 vs V3) ---

    private lightingSetData(valueId: number, ...values: number[]): number[] {
        if (this.isV3) {
            // V3: [channel, value_id, ...values]
            return [CHANNEL_RGB_MATRIX, valueId, ...values];
        }
        // V2: [value_id, ...values] (no channel byte)
        return [valueId, ...values];
    }

    private lightingGetData(valueId: number): number[] {
        if (this.isV3) {
            return [CHANNEL_RGB_MATRIX, valueId];
        }
        return [valueId];
    }

    /** Parse a get-value response. Returns the value byte(s) offset. */
    private lightingResponseOffset(): number {
        // V3 response: [cmd, channel, value_id, data...]  -> offset 3
        // V2 response: [cmd, value_id, data...]            -> offset 2
        return this.isV3 ? 3 : 2;
    }

    async setRGBBrightness(brightness: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_BRIGHTNESS, brightness & 0xFF));
    }

    async getRGBBrightness(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_BRIGHTNESS));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBEffect(effectId: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_EFFECT, effectId & 0xFF));
    }

    async getRGBEffect(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_EFFECT));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBEffectSpeed(speed: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_EFFECT_SPEED, speed & 0xFF));
    }

    async getRGBEffectSpeed(): Promise<number | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_EFFECT_SPEED));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off) {
            return data.getUint8(off);
        }
        return null;
    }

    async setRGBColor(hue: number, saturation: number) {
        await this.sendCommand(VIA_CUSTOM_SET_VALUE, this.lightingSetData(RGB_MATRIX_COLOR, hue & 0xFF, saturation & 0xFF));
    }

    async getRGBColor(): Promise<[number, number] | null> {
        const data = await this.sendCommand(VIA_CUSTOM_GET_VALUE, this.lightingGetData(RGB_MATRIX_COLOR));
        const off = this.lightingResponseOffset();
        if (data && data.byteLength > off + 1) {
            return [data.getUint8(off), data.getUint8(off + 1)];
        }
        return null;
    }

    /**
     * Save all RGB settings to device EEPROM.
     * Sends current values to RAM first, then issues the save command,
     * then reads back to verify the write succeeded.
     */
    async saveRGBSettings(currentState?: {
        brightness: number;
        effectId: number;
        speed: number;
        hue: number;
        saturation: number;
    }): Promise<boolean> {
        // Step 1: Re-send all current values to ensure RAM is in sync
        if (currentState) {
            await this.setRGBBrightness(currentState.brightness);
            await this.setRGBEffect(currentState.effectId);
            await this.setRGBEffectSpeed(currentState.speed);
            await this.setRGBColor(currentState.hue, currentState.saturation);
        }

        // Step 2: Issue the EEPROM save command
        let saveResponse: DataView | null;
        if (this.isV3) {
            saveResponse = await this.sendCommand(VIA_CUSTOM_SAVE, [CHANNEL_RGB_MATRIX]);
        } else {
            saveResponse = await this.sendCommand(VIA_CUSTOM_SAVE);
        }

        // Check if save was rejected (0xFF) or timed out (null)
        if (!saveResponse) {
            console.error('Save command timed out — no response from device');
            return false;
        }
        if (saveResponse.byteLength > 0 && saveResponse.getUint8(0) === 0xFF) {
            console.error('Save command was rejected by firmware (0xFF)');
            return false;
        }

        // Step 3: Read back and verify (if we know what we saved)
        if (currentState) {
            const readBrightness = await this.getRGBBrightness();
            const readEffect = await this.getRGBEffect();
            if (readBrightness !== null && readBrightness !== currentState.brightness) {
                console.warn(`Save verify: brightness mismatch (sent ${currentState.brightness}, read ${readBrightness})`);
                return false;
            }
            if (readEffect !== null && readEffect !== currentState.effectId) {
                console.warn(`Save verify: effect mismatch (sent ${currentState.effectId}, read ${readEffect})`);
                return false;
            }
        }

        console.log('RGB settings saved to EEPROM successfully');
        return true;
    }

    // --- Per-Key RGB (nucleardog rgb_remote protocol) ---
    // Requires custom firmware: https://gitlab.com/nucleardog/qmk_firmware_fw16

    /** Probe whether firmware supports the rgb_remote per-key protocol */
    private async detectPerKeySupport(): Promise<boolean> {
        try {
            const data = await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_QUERY]);
            // If firmware echoes 0xFE back (not 0xFF), it supports the protocol
            if (data && data.byteLength > 0 && data.getUint8(0) === RGB_REMOTE_CMD) {
                console.log('Per-key RGB firmware detected (rgb_remote)');
                return true;
            }
        } catch {
            // Silently fail — stock firmware
        }
        return false;
    }

    get hasPerKeySupport(): boolean {
        return this._hasPerKeySupport;
    }

    /** Enable per-key RGB mode (takes over LEDs from animations) */
    async enablePerKeyMode(): Promise<boolean> {
        if (!this._hasPerKeySupport) return false;
        const data = await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_ENABLE]);
        this._perKeyEnabled = data !== null && data.getUint8(0) === RGB_REMOTE_CMD;
        return this._perKeyEnabled;
    }

    /** Disable per-key RGB mode (restores normal animations) */
    async disablePerKeyMode(): Promise<boolean> {
        if (!this._hasPerKeySupport) return false;
        await this.sendCommand(RGB_REMOTE_CMD, [RGB_REMOTE_DISABLE]);
        this._perKeyEnabled = false;
        return true;
    }

    /** Set color for specific LEDs using rgb_remote protocol (RGB 0-255) */
    async setPerKeyColor(r: number, g: number, b: number, ledIndices: number[]): Promise<boolean> {
        if (!this._hasPerKeySupport || !this._perKeyEnabled) return false;
        // Protocol: [0xFE, 0x10, R, G, B, flags=0, count, idx1, idx2, ...]
        // Max ~24 LED indices per packet (32 - 7 header bytes = 25)
        const maxPerPacket = 25;
        for (let i = 0; i < ledIndices.length; i += maxPerPacket) {
            const batch = ledIndices.slice(i, i + maxPerPacket);
            await this.sendCommand(RGB_REMOTE_CMD, [
                RGB_REMOTE_SET_LEDS,
                r & 0xFF, g & 0xFF, b & 0xFF,
                0x00, // flags
                batch.length,
                ...batch
            ]);
        }
        return true;
    }

    /** Set all LEDs to one color */
    async setAllKeysColor(r: number, g: number, b: number, totalLeds: number): Promise<boolean> {
        const indices = Array.from({ length: totalLeds }, (_, i) => i);
        return this.setPerKeyColor(r, g, b, indices);
    }

    // --- Protocol Version ---

    async getProtocolVersion(): Promise<number> {
        const data = await this.sendCommand(VIA_GET_PROTOCOL_VERSION);
        if (data && data.byteLength >= 3) {
            return (data.getUint8(1) << 8) | data.getUint8(2);
        }
        return 0;
    }

    getDetectedProtocolVersion(): number {
        return this.protocolVersion;
    }

    // --- Device State ---

    isDeviceConnected() {
        return this.isConnected;
    }

    getConnectedProductId(): number | null {
        return this.device?.productId ?? null;
    }

    getConnectedProductName(): string | null {
        return this.device?.productName ?? null;
    }

    private cleanupDevice() {
        if (this.disconnectHandler) {
            navigator.hid.removeEventListener('disconnect', this.disconnectHandler);
            this.disconnectHandler = null;
        }
        if (this.device?.opened) {
            this.device.close().catch(() => {});
        }
        this.device = null;
        this.protocolVersion = 0;
        this._hasPerKeySupport = false;
        this._perKeyEnabled = false;
    }

    disconnect() {
        this.cleanupDevice();
        this.isConnected = false;
        this.notifyListeners();
    }

    onConnectionChange(callback: (connected: boolean) => void): () => void {
        this.connectionListeners.add(callback);
        return () => {
            this.connectionListeners.delete(callback);
        };
    }

    private notifyListeners() {
        this.connectionListeners.forEach(cb => cb(this.isConnected));
    }
}

export const hid = new HIDService();
