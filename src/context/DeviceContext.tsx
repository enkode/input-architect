import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { hid } from '../services/HIDService';

interface DeviceContextType {
    isConnected: boolean;
    isConnecting: boolean;
    connectedProductId: number | null;
    connectedProductName: string | null;
    protocolVersion: number;
    hasPerKeyRGB: boolean;
    connectDevice: () => Promise<void>;
    switchDevice: () => Promise<void>;
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

    useEffect(() => {
        // Sync initial state
        setIsConnected(hid.isDeviceConnected());
        setConnectedProductId(hid.getConnectedProductId());
        setConnectedProductName(hid.getConnectedProductName());
        setProtocolVersion(hid.getDetectedProtocolVersion());
        setHasPerKeyRGB(hid.hasPerKeySupport);

        // Listen for changes - now returns cleanup function
        const unsubscribe = hid.onConnectionChange((connected) => {
            setIsConnected(connected);
            setConnectedProductId(hid.getConnectedProductId());
            setConnectedProductName(hid.getConnectedProductName());
            setProtocolVersion(hid.getDetectedProtocolVersion());
            setHasPerKeyRGB(hid.hasPerKeySupport);
        });

        // Auto-reconnect to a previously-permitted device on page load
        if (!hid.isDeviceConnected()) {
            hid.autoConnect();
        }

        return unsubscribe;
    }, []);

    const connectDevice = async () => {
        setIsConnecting(true);
        try {
            await hid.requestDevice();
        } finally {
            setIsConnecting(false);
        }
    };

    const switchDevice = async () => {
        setIsConnecting(true);
        try {
            const currentPid = hid.getConnectedProductId();
            hid.disconnect();
            // Try to connect to a different permitted device
            const permitted = await hid.getPermittedDevices();
            const other = permitted.find(d => d.productId !== currentPid);
            if (other) {
                await hid.openDevice(other);
            } else {
                // No other permitted device — show browser picker to add one
                await hid.requestDevice();
            }
        } finally {
            setIsConnecting(false);
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
            connectDevice,
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
