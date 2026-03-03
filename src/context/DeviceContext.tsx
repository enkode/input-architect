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
