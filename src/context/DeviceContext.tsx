import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { hid } from '../services/HIDService';

interface PermittedDevice {
    productId: number;
    productName: string;
    device: HIDDevice;
}

interface DeviceContextType {
    isConnected: boolean;
    isConnecting: boolean;
    connectedProductId: number | null;
    connectedProductName: string | null;
    protocolVersion: number;
    hasPerKeyRGB: boolean;
    permittedDevices: PermittedDevice[];
    connectDevice: () => Promise<void>;
    connectToDevice: (device: PermittedDevice) => Promise<void>;
    switchDevice: (targetDevice?: PermittedDevice) => Promise<void>;
    disconnectDevice: () => void;
    activeLayer: number;
    setActiveLayer: (layer: number) => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export function DeviceProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectedProductId, setConnectedProductId] = useState<number | null>(null);
    const [connectedProductName, setConnectedProductName] = useState<string | null>(null);
    const [protocolVersion, setProtocolVersion] = useState(0);
    const [hasPerKeyRGB, setHasPerKeyRGB] = useState(false);
    const [activeLayer, setActiveLayer] = useState(0);
    const [permittedDevices, setPermittedDevices] = useState<PermittedDevice[]>([]);

    const refreshPermittedDevices = useCallback(async () => {
        const devices = await hid.getPermittedDevices();
        setPermittedDevices(devices.map(d => ({
            productId: d.productId,
            productName: d.productName ?? `Device 0x${d.productId.toString(16)}`,
            device: d,
        })));
    }, []);

    useEffect(() => {
        // Sync initial state
        setIsConnected(hid.isDeviceConnected());
        setConnectedProductId(hid.getConnectedProductId());
        setConnectedProductName(hid.getConnectedProductName());
        setProtocolVersion(hid.getDetectedProtocolVersion());
        setHasPerKeyRGB(hid.hasPerKeySupport);
        refreshPermittedDevices();

        // Listen for changes
        const unsubscribe = hid.onConnectionChange((connected) => {
            setIsConnected(connected);
            setConnectedProductId(hid.getConnectedProductId());
            setConnectedProductName(hid.getConnectedProductName());
            setProtocolVersion(hid.getDetectedProtocolVersion());
            setHasPerKeyRGB(hid.hasPerKeySupport);
            refreshPermittedDevices();
        });

        // Auto-reconnect to a previously-permitted device on page load
        if (!hid.isDeviceConnected()) {
            hid.autoConnect();
        }

        return unsubscribe;
    }, [refreshPermittedDevices]);

    const connectDevice = async () => {
        setIsConnecting(true);
        try {
            await hid.requestDevice();
        } finally {
            setIsConnecting(false);
            await refreshPermittedDevices();
        }
    };

    const connectToDevice = async (target: PermittedDevice) => {
        setIsConnecting(true);
        try {
            if (isConnected) hid.disconnect();
            await hid.openDevice(target.device);
        } finally {
            setIsConnecting(false);
        }
    };

    const switchDevice = async (targetDevice?: PermittedDevice) => {
        setIsConnecting(true);
        try {
            const currentPid = hid.getConnectedProductId();
            hid.disconnect();
            if (targetDevice) {
                await hid.openDevice(targetDevice.device);
            } else {
                const permitted = await hid.getPermittedDevices();
                const other = permitted.find(d => d.productId !== currentPid);
                if (other) {
                    await hid.openDevice(other);
                } else {
                    await hid.requestDevice();
                }
            }
        } finally {
            setIsConnecting(false);
            await refreshPermittedDevices();
        }
    };

    const disconnectDevice = () => {
        hid.disconnect();
    };

    return (
        <DeviceContext.Provider value={{
            isConnected,
            isConnecting,
            connectedProductId,
            connectedProductName,
            protocolVersion,
            hasPerKeyRGB,
            permittedDevices,
            connectDevice,
            connectToDevice,
            switchDevice,
            disconnectDevice,
            activeLayer,
            setActiveLayer
        }}>
            {children}
        </DeviceContext.Provider>
    );
}

export function useDevice() {
    const context = useContext(DeviceContext);
    if (context === undefined) {
        throw new Error('useDevice must be used within a DeviceProvider');
    }
    return context;
}
