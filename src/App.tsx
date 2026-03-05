import { useState, useEffect, useRef } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { KeyboardStage } from './components/Stage/KeyboardStage';
import { PropertyPanel } from './components/Inspector/PropertyPanel';
import { FirmwarePanel } from './components/Firmware/FirmwarePanel';
import { FirmwareStage } from './components/Firmware/FirmwareStage';
import { LayerSelector } from './components/Sidebar/LayerSelector';
import { NavigationMenu, type AppMode } from './components/Sidebar/NavigationMenu';
import { FRAMEWORK_16_ANSI } from './data/definitions/framework16';
import { FRAMEWORK_MACROPAD } from './data/definitions/macropad';
import { useDevice } from './context/DeviceContext';
import { configService } from './services/ConfigService';
import { storageService } from './services/StorageService';
import { hid, type HealthCheckResult } from './services/HIDService';
import type { VIAKeyboardDefinition } from './types/via';
import { clsx } from 'clsx';
import { Stethoscope, ChevronDown } from 'lucide-react';

function App() {
  const { isConnected, connectDevice, switchDevice, disconnectDevice, connectedProductId, connectedProductName, protocolVersion, hasPerKeyRGB } = useDevice();

  // Only select a definition when a device is actually connected
  const activeDefinition = !isConnected ? null
    : connectedProductId === 0x0013 ? FRAMEWORK_MACROPAD
    : FRAMEWORK_16_ANSI;

  const [selectedKeyIndices, setSelectedKeyIndices] = useState<number[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<number>(0);
  const [activeMode, setActiveMode] = useState<AppMode>('mapping');

  // Device State
  const [deviceKeymap, setDeviceKeymap] = useState<number[]>([]);
  const [keyColors, setKeyColors] = useState<Record<number, string>>({});

  // Input Handling for visual feedback
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);

  // Health check
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [showHealthLog, setShowHealthLog] = useState(false);

  // Refs for auto-save debounce and per-key restore tracking
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perKeyRestoredRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.repeat) setPressedKeys(prev => [...prev, e.code]);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys(prev => prev.filter(k => k !== e.code));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Reset per-key restore flag on disconnect
  useEffect(() => {
    if (!isConnected) {
      perKeyRestoredRef.current = false;
    }
  }, [isConnected]);

  const refreshKeymap = () => {
    if (isConnected && activeDefinition) {
      configService.readKeymap(activeDefinition, selectedLayer)
        .then(keymap => {
          if (keymap) setDeviceKeymap(keymap);
        })
        .catch(console.error);
    }
  };

  // Restore per-key colors from localStorage to device
  const restorePerKeyColorsToDevice = async (
    colors: Record<number, string>,
    definition: VIAKeyboardDefinition,
  ) => {
    const enabled = await hid.enablePerKeyMode();
    if (!enabled) return;

    // Group keys by color to minimize HID commands
    const colorGroups: Record<string, number[]> = {};
    for (const [keyIdx, color] of Object.entries(colors)) {
      if (!colorGroups[color]) colorGroups[color] = [];
      colorGroups[color].push(Number(keyIdx));
    }

    for (const [colorStr, keyIndices] of Object.entries(colorGroups)) {
      const match = colorStr.match(/rgb\((\d+),(\d+),(\d+)\)/);
      if (!match) continue;
      const [, r, g, b] = match.map(Number);

      const ledIndices = keyIndices.flatMap(idx => definition.ledIndices[idx] ?? []);
      if (ledIndices.length > 0) {
        await hid.setPerKeyColor(r, g, b, ledIndices);
      }
    }
  };

  // Sync Keymap on Connect/Layer Change + auto-restore per-key colors
  useEffect(() => {
    // Clear selection and keymap when device changes
    setSelectedKeyIndices([]);
    setDeviceKeymap([]);
    refreshKeymap();

    // Auto-restore saved settings once per connection session
    if (isConnected && !perKeyRestoredRef.current && connectedProductId !== null && activeDefinition) {
      perKeyRestoredRef.current = true;
      const stored = storageService.loadDeviceState(connectedProductId);

      // Restore global RGB settings from localStorage
      if (stored?.rgbSettings) {
        const { brightness, effectId, speed, hue, saturation } = stored.rgbSettings;
        console.log(`Auto-restoring RGB settings: brightness=${brightness}, effect=${effectId}, speed=${speed}, H=${hue}, S=${saturation}`);
        (async () => {
          try {
            await hid.setRGBBrightness(brightness);
            await hid.setRGBEffect(effectId);
            await hid.setRGBEffectSpeed(speed);
            await hid.setRGBColor(hue, saturation);
            console.log('RGB settings restored from localStorage');
          } catch (err) {
            console.error('Failed to restore RGB settings:', err);
          }
        })();
      }

      // Restore per-key colors
      if (stored?.perKeyColors && Object.keys(stored.perKeyColors).length > 0) {
        setKeyColors(stored.perKeyColors);
        if (hasPerKeyRGB) {
          restorePerKeyColorsToDevice(stored.perKeyColors, activeDefinition);
        }
      }
    }
  }, [isConnected, selectedLayer, activeDefinition]);

  const handleKeyColorChange = (indices: number[], color: string | null) => {
    setKeyColors(prev => {
      const next = { ...prev };
      for (const idx of indices) {
        if (color) next[idx] = color;
        else delete next[idx];
      }

      // Debounced save to localStorage
      if (connectedProductId !== null) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          storageService.saveDeviceState(connectedProductId!, { perKeyColors: next });
        }, 500);
      }

      return next;
    });
  };

  const handlePerKeyColorsRestore = (colors: Record<number, string>) => {
    setKeyColors(colors);
    if (connectedProductId !== null) {
      storageService.saveDeviceState(connectedProductId, { perKeyColors: colors });
    }
    if (hasPerKeyRGB && activeDefinition) {
      restorePerKeyColorsToDevice(colors, activeDefinition);
    }
  };

  const runHealthCheck = async () => {
    setHealthChecking(true);
    setShowHealthLog(true);
    try {
      const result = await hid.healthCheck();
      setHealthResult(result);
    } catch (e) {
      console.error('Health check error:', e);
    } finally {
      setHealthChecking(false);
    }
  };

  const handleKeySelect = (index: number, isMulti: boolean) => {
    setSelectedKeyIndices(prev => {
      if (isMulti) {
        return prev.includes(index)
          ? prev.filter(i => i !== index)
          : [...prev, index];
      }
      return [index];
    });
  };

  return (
    <MainLayout
      sidebarLeft={
        <div className="flex flex-col h-full gap-4">
          <div className="px-4 pt-4 space-y-2">
            {isConnected ? (
              <>
                <div className="w-full px-4 py-3 rounded-lg bg-green-500/10 text-green-500 border border-green-500/20 text-center">
                  <div className="flex items-center justify-center gap-2 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Connected
                  </div>
                  {connectedProductName && (
                    <div className="text-[10px] text-green-400/70 mt-1 font-mono truncate">{connectedProductName}</div>
                  )}
                  {protocolVersion > 0 && (
                    <div className="text-[10px] text-green-400/50 font-mono">VIA Protocol: {protocolVersion} ({protocolVersion >= 11 ? 'V3' : 'V2'})</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={disconnectDevice}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-semibold"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={() => switchDevice()}
                    className="flex-1 px-3 py-2 rounded-lg bg-surface-highlight text-text-muted border border-border hover:border-text-secondary hover:text-text-primary transition-colors text-xs font-semibold"
                  >
                    Switch Device
                  </button>
                </div>
                <button
                  onClick={runHealthCheck}
                  disabled={healthChecking}
                  className={clsx(
                    "w-full px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors border",
                    healthResult
                      ? healthResult.ok
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-surface-highlight text-text-muted border-border hover:border-text-secondary hover:text-text-primary",
                    healthChecking && "opacity-50 cursor-wait"
                  )}
                >
                  <Stethoscope size={14} />
                  {healthChecking ? 'Testing...' : healthResult ? (healthResult.ok ? 'Connection OK' : 'Issues Detected') : 'Test Connection'}
                </button>
                {healthResult && (
                  <div className="bg-surface border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setShowHealthLog(!showHealthLog)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                    >
                      <span>Health Check Log</span>
                      <ChevronDown size={10} className={clsx("ml-auto transition-transform", showHealthLog && "rotate-180")} />
                    </button>
                    {showHealthLog && (
                      <div className="border-t border-border px-3 py-2 max-h-48 overflow-auto font-mono text-[9px] leading-relaxed bg-black/20 space-y-0.5">
                        {healthResult.log.map((entry, i) => (
                          <div key={i} className={clsx(
                            entry.startsWith('FAIL') ? 'text-red-400' :
                            entry.startsWith('WARN') ? 'text-yellow-400' :
                            entry.startsWith('OK') ? 'text-green-400' :
                            'text-text-muted'
                          )}>{entry}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={connectDevice}
                className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold shadow-lg bg-primary text-white hover:bg-primary/90 shadow-glow cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-white/50" />
                Connect Device
              </button>
            )}
          </div>

          {isConnected && (
            <>
              <NavigationMenu activeMode={activeMode} onModeSelect={setActiveMode} />
              <div className="flex-1" />
              {(activeMode === 'mapping' || activeMode === 'lighting') && (
                <LayerSelector selectedLayer={selectedLayer} onLayerSelect={setSelectedLayer} />
              )}
            </>
          )}
          {!isConnected && (
            <>
              <NavigationMenu activeMode={activeMode} onModeSelect={setActiveMode} />
              <div className="flex-1" />
            </>
          )}
        </div>
      }
      sidebarRight={
        activeMode === 'firmware' ? (
          <FirmwarePanel />
        ) : activeDefinition ? (
          <PropertyPanel
            activeMode={activeMode}
            activeDefinition={activeDefinition}
            selectedModuleId={activeDefinition.name}
            selectedModuleType={activeDefinition === FRAMEWORK_MACROPAD ? 'numpad' : 'keyboard'}
            selectedKeyIndices={selectedKeyIndices}
            selectedLayer={selectedLayer}
            onConfigRestore={refreshKeymap}
            onKeymapChange={refreshKeymap}
            onKeyColorChange={handleKeyColorChange}
            keyColors={keyColors}
            onPerKeyColorsRestore={handlePerKeyColorsRestore}
          />
        ) : (
          <div className="p-4 h-full flex items-center justify-center text-text-muted text-xs">
            Connect a device to get started
          </div>
        )
      }
    >
      {activeMode === 'firmware' ? (
        <FirmwareStage />
      ) : activeDefinition ? (
        <KeyboardStage
          definition={activeDefinition}
          pressedKeys={pressedKeys}
          selectedKeyIndices={selectedKeyIndices}
          onKeySelect={handleKeySelect}
          deviceKeymap={deviceKeymap}
          keyColors={keyColors}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Framework Input Architect</h1>
            <p className="text-sm text-text-muted max-w-md">
              Configure your Framework Laptop 16 keyboard and macropad.
              Remap keys, customize RGB lighting, and more.
            </p>
          </div>
          <button
            onClick={connectDevice}
            className="px-8 py-4 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/50 transition-all active:scale-95"
          >
            Connect Your Device
          </button>
          <p className="text-xs text-text-muted">
            Supports Framework 16 ANSI Keyboard and RGB Macropad
          </p>
        </div>
      )}
    </MainLayout>
  );
}

export default App;
