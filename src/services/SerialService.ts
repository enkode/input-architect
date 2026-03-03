/// <reference types="w3c-web-serial" />

// Framework Input Module Protocol (Serial)
// Magic bytes: 0x32, 0xAC

export class SerialService {
    private port: SerialPort | null = null;
    private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    isConnected: boolean = false;

    async requestPort(): Promise<boolean> {
        try {
            // Framework Input Modules often show up with VID 0x32AC
            const port = await navigator.serial.requestPort({
                filters: [{ usbVendorId: 0x32AC }]
            });

            await port.open({ baudRate: 115200 });

            this.port = port;
            if (port.writable) {
                this.writer = port.writable.getWriter();
            }
            if (port.readable) {
                this.reader = port.readable.getReader();
            }

            this.isConnected = true;
            console.log("Serial Device Connected");
            return true;

        } catch (err) {
            console.error("Serial Connection Failed:", err);
            return false;
        }
    }

    async sendCommand(commandId: number, params: number[] = []): Promise<void> {
        if (!this.writer) return;

        // Protocol: 0x32, 0xAC, CommandID, ...Params
        const packet = new Uint8Array([0x32, 0xAC, commandId, ...params]);
        await this.writer.write(packet);
    }

    // Common commands from commands.md

    async setBrightness(brightness: number) {
        // Command 0x00: Set LED brightness
        // Brightness 0-255? commands.md doesn't specify byte range but implies it.
        // Wait, 0x00 for LED Matrix.
        // Let's assume 1 byte param for now, need to check if it's 0-100 or 0-255.
        // commands.md says "Set LED brightness". 
        await this.sendCommand(0x00, [brightness]);
    }

    async setPattern(patternId: number) {
        // Command 0x01: Display a pattern
        await this.sendCommand(0x01, [patternId]);
    }

    async setAnimate(animate: boolean) {
        // Command 0x04: Scroll current pattern
        await this.sendCommand(0x04, [animate ? 1 : 0]);
    }

    async setSleep(sleep: boolean) {
        // Command 0x03
        await this.sendCommand(0x03, [sleep ? 1 : 0]);
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            this.reader.releaseLock();
        }
        if (this.writer) {
            await this.writer.close();
            this.writer.releaseLock();
        }
        if (this.port) {
            await this.port.close();
        }
        this.isConnected = false;
        this.port = null;
        this.writer = null;
        this.reader = null;
    }
}

export const serial = new SerialService();
