import { useState, useEffect, useRef, useMemo } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { KeyboardStage } from './components/Stage/KeyboardStage';
import { PropertyPanel } from './components/Inspector/PropertyPanel';
import { FirmwarePanel } from './components/Firmware/FirmwarePanel';
import { FirmwareStage } from './components/Firmware/FirmwareStage';
import { HelpPanel } from './components/Sidebar/HelpPanel';
import { LayerSelector, type LayerSwitchType } from './components/Sidebar/LayerSelector';
import { NavigationMenu, type AppMode } from './components/Sidebar/NavigationMenu';
import { FRAMEWORK_16_ANSI } from './data/definitions/framework16';
import { FRAMEWORK_MACROPAD } from './data/definitions/macropad';
import { useDevice } from './context/DeviceContext';
import { configService } from './services/ConfigService';
import { storageService } from './services/StorageService';
import { log } from './services/Logger';
import { hid, type HealthCheckResult } from './services/HIDService';
import { ANSI_KEY_PRESETS, MACROPAD_KEY_PRESETS, type KeyPreset } from './data/key-presets';
import { parseKeyPositions, getRowRangeIndices } from './utils/keyboardLayout';
import type { VIAKeyboardDefinition } from './types/via';
import { clsx } from 'clsx';
import { Stethoscope, ChevronDown, Plus } from 'lucide-react';

function App() {
  const { isConnected, isConnecting, connectDevice, connectToDevice, switchDevice, disconnectDevice, connectedProductId, connectedProductName, protocolVersion, hasPerKeyRGB, permittedDevices, markRestoreComplete } = useDevice();

  const otherDevices = permittedDevices.filter(d => d.productId !== connectedProductId);

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
  // globalColor removed — showing VIA backlight color on individual keys was misleading
  // (users thought it was per-key readback from hardware, which firmware doesn't support)

  // Custom key presets (per device, persisted in localStorage)
  const [customPresets, setCustomPresets] = useState<KeyPreset[]>([]);

  // Input Handling for visual feedback
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [isShiftHeld, setIsShiftHeld] = useState(false);

  // Shift-click range selection
  const [anchorKeyIndex, setAnchorKeyIndex] = useState<number | null>(null);
  const [hoveredKeyIndex, setHoveredKeyIndex] = useState<number | null>(null);

  // Layer mapping mode (pick-a-key flow from LayerSelector)
  const [layerMapping, setLayerMapping] = useState<{
    targetLayer: number;
    type: LayerSwitchType;
  } | null>(null);

  // Health check
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [showHealthLog, setShowHealthLog] = useState(false);

  // Refs for auto-save debounce and per-key restore tracking
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perKeyRestoredRef = useRef(false);

  // Initialize persistent storage (hydrates localStorage from Tauri store on reinstall)
  useEffect(() => { storageService.init(); }, []);

  // Clean up save timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLayerMapping(null);
      if (e.key === 'Shift') setIsShiftHeld(true);
      if (!e.repeat) setPressedKeys(prev => [...prev, e.code]);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftHeld(false);
      setPressedKeys(prev => prev.filter(k => k !== e.code));
    };
    const handleBlur = () => { setIsShiftHeld(false); setPressedKeys([]); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Compute shift-hover preview indices
  const shiftHoverPreviewIndices = useMemo(() => {
    if (!isShiftHeld || anchorKeyIndex === null || hoveredKeyIndex === null || !activeDefinition) {
      return [];
    }
    const keys = parseKeyPositions(activeDefinition);
    return getRowRangeIndices(anchorKeyIndex, hoveredKeyIndex, keys);
  }, [isShiftHeld, anchorKeyIndex, hoveredKeyIndex, activeDefinition]);

  // Reset per-key restore flag on disconnect
  useEffect(() => {
    if (!isConnected) {
      perKeyRestoredRef.current = false;
    }
  }, [isConnected]);

  // Load custom presets when device connects
  useEffect(() => {
    if (connectedProductId !== null) {
      setCustomPresets(storageService.loadCustomPresets(connectedProductId));
    } else {
      setCustomPresets([]);
    }
  }, [connectedProductId]);

  const refreshKeymap = () => {
    if (isConnected && activeDefinition) {
      configService.readKeymap(activeDefinition, selectedLayer)
        .then(keymap => {
          if (keymap) setDeviceKeymap(keymap);
        })
        .catch(err => log.errorConfig(`Keymap read failed: ${err}`));
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
      perKeyRestoredRef.current = true; // Prevent duplicate triggers during this connection session
      const stored = storageService.loadDeviceState(connectedProductId);

      // Snapshot current stored state as "Session start" for history
      if (stored?.rgbSettings || stored?.perKeyColors) {
        storageService.saveSnapshot(connectedProductId, {
          label: 'Session start',
          rgbSettings: stored.rgbSettings,
          perKeyColors: stored.perKeyColors,
        });
      }

      const doRestore = async () => {
        try {
          // Restore global RGB settings from localStorage
          if (stored?.rgbSettings) {
            const { brightness, effectId, speed, hue, saturation } = stored.rgbSettings;
            log.config(`Auto-restoring RGB settings: brightness=${brightness}, effect=${effectId}, speed=${speed}, H=${hue}, S=${saturation}`);
            await hid.setRGBBrightness(brightness);
            await hid.setRGBEffect(effectId);
            await hid.setRGBEffectSpeed(speed);
            await hid.setRGBColor(hue, saturation);
            log.config('RGB settings restored from localStorage');
          }

          // Restore per-key colors
          if (stored?.perKeyColors && Object.keys(stored.perKeyColors).length > 0) {
            setKeyColors(stored.perKeyColors);
            if (hasPerKeyRGB) {
              await restorePerKeyColorsToDevice(stored.perKeyColors, activeDefinition);
            }
          }
        } catch (err) {
          log.errorConfig(`Failed to restore settings: ${err}`);
          // Allow retry on next reconnect if restore failed
          perKeyRestoredRef.current = false;
        } finally {
          markRestoreComplete();
        }
      };
      doRestore();
    } else if (isConnected && perKeyRestoredRef.current) {
      // Already restored in this session (e.g. layer change re-trigger)
      markRestoreComplete();
    }
  }, [isConnected, selectedLayer, activeDefinition, connectedProductId, hasPerKeyRGB, markRestoreComplete]);

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

  const handlePerKeyColorsRestore = async (colors: Record<number, string>) => {
    setKeyColors(colors);
    if (connectedProductId !== null) {
      storageService.saveDeviceState(connectedProductId, { perKeyColors: colors });
    }
    if (hasPerKeyRGB && activeDefinition) {
      if (Object.keys(colors).length > 0) {
        await restorePerKeyColorsToDevice(colors, activeDefinition);
      } else {
        await hid.disablePerKeyMode();
      }
    }
  };

  const runHealthCheck = async () => {
    setHealthChecking(true);
    setShowHealthLog(true);
    try {
      const result = await hid.healthCheck();
      setHealthResult(result);
    } catch (e) {
      log.errorDevice(`Health check error: ${e}`);
      setHealthResult({ ok: false, deviceOpen: false, protocolResponds: false, protocolVersion: 0, rgbReadable: false, rgbBrightness: null, rgbEffect: null, rgbWriteVerify: false, perKeySupport: false, log: [`ERROR: ${e}`] });
    } finally {
      setHealthChecking(false);
    }
  };

  const handleKeySelect = async (index: number, modifiers: { ctrl: boolean; shift: boolean }) => {
    // Layer mapping mode: write keycode immediately and exit
    if (layerMapping && activeDefinition) {
      const { targetLayer, type } = layerMapping;
      const keycodeBase = type === 'MO' ? 0x5220 : type === 'TG' ? 0x5260 : 0x5200;
      const keycode = keycodeBase + targetLayer;
      const pos = activeDefinition.matrixPositions[index];
      if (pos) {
        const [row, col] = pos;
        log.hid(`Layer map: ${type}(${targetLayer}) -> Key ${index} [Row ${row}, Col ${col}] on Layer ${selectedLayer}`);
        await hid.setKeycode(selectedLayer, row, col, keycode);
        refreshKeymap();
      }
      setLayerMapping(null);
      return;
    }

    if (modifiers.shift && anchorKeyIndex !== null && activeDefinition) {
      // Shift-click: select range on same row (additive)
      const keys = parseKeyPositions(activeDefinition);
      const rangeIndices = getRowRangeIndices(anchorKeyIndex, index, keys);
      setSelectedKeyIndices(prev => {
        const merged = new Set([...prev, ...rangeIndices]);
        return Array.from(merged);
      });
    } else {
      // Plain or Ctrl click: toggle individual key
      setSelectedKeyIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
      setAnchorKeyIndex(index);
    }
  };

  const builtInPresets = connectedProductId === 0x0013 ? MACROPAD_KEY_PRESETS : ANSI_KEY_PRESETS;
  const activePresets = [...builtInPresets, ...customPresets];
  const customPresetIds = useMemo(() => new Set(customPresets.map(p => p.id)), [customPresets]);

  const handleSaveCustomPreset = (label: string, indices: number[]) => {
    if (connectedProductId === null || indices.length === 0) return;
    const preset = storageService.saveCustomPreset(connectedProductId, label, indices);
    setCustomPresets(prev => [...prev, preset]);
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    if (connectedProductId === null) return;
    storageService.deleteCustomPreset(connectedProductId, presetId);
    setCustomPresets(prev => prev.filter(p => p.id !== presetId));
  };

  const handlePresetSelect = (indices: number[], ctrl: boolean) => {
    if (ctrl) {
      // Ctrl+click: toggle — add if not all present, remove if all are
      setSelectedKeyIndices(prev => {
        const allPresent = indices.every(i => prev.includes(i));
        if (allPresent) {
          return prev.filter(i => !indices.includes(i));
        } else {
          const merged = new Set([...prev, ...indices]);
          return Array.from(merged);
        }
      });
    } else {
      // Plain click: toggle preset (deselect if already exactly active, otherwise select)
      setSelectedKeyIndices(prev => {
        const allPresent = indices.every(i => prev.includes(i));
        if (allPresent && prev.length === indices.length) {
          return []; // exact match — deselect all
        }
        return [...indices];
      });
    }
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
                <button
                  onClick={disconnectDevice}
                  className="w-full px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors text-xs font-semibold"
                >
                  Disconnect
                </button>
                {otherDevices.map(device => (
                  <button
                    key={device.productId}
                    onClick={() => switchDevice(device)}
                    disabled={isConnecting}
                    className={clsx(
                      "w-full px-3 py-2 rounded-lg bg-surface-highlight text-text-muted border border-border hover:border-primary hover:text-text-primary transition-colors text-xs font-semibold",
                      isConnecting && "opacity-50 cursor-wait"
                    )}
                  >
                    Switch to {device.productName}
                  </button>
                ))}
                <button
                  onClick={connectDevice}
                  disabled={isConnecting}
                  className="w-full px-3 py-1.5 rounded-lg text-[10px] text-text-muted border border-dashed border-border hover:border-primary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={10} /> Add Device
                </button>
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
              <>
                {permittedDevices.map(device => (
                  <button
                    key={device.productId}
                    onClick={() => connectToDevice(device)}
                    disabled={isConnecting}
                    className={clsx(
                      "w-full px-4 py-3 rounded-lg flex items-center justify-between gap-2 transition-all font-semibold bg-surface border border-border hover:border-primary hover:text-text-primary",
                      isConnecting && "opacity-50 cursor-wait"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-text-muted" />
                      {device.productName}
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      0x{device.productId.toString(16).padStart(4, '0')}
                    </span>
                  </button>
                ))}
                <button
                  onClick={connectDevice}
                  disabled={isConnecting}
                  className={clsx(
                    "w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold shadow-lg bg-primary text-white hover:bg-primary/90 shadow-glow cursor-pointer",
                    isConnecting && "opacity-50 cursor-wait"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-white/50" />
                  {permittedDevices.length === 0 ? 'Connect Device' : 'Connect New Device'}
                </button>
                {permittedDevices.length === 0 && (
                  <p className="text-[10px] text-text-muted text-center px-2">
                    Grant access to your keyboard and macropad separately for quick switching between them.
                  </p>
                )}
              </>
            )}
          </div>

          {isConnected && (
            <>
              <NavigationMenu activeMode={activeMode} onModeSelect={setActiveMode} />
              <div className="flex-1" />
              {activeMode === 'mapping' && (
                <LayerSelector
                  selectedLayer={selectedLayer}
                  onLayerSelect={setSelectedLayer}
                  onMapLayer={(targetLayer, type) => setLayerMapping({ targetLayer, type })}
                  isMappingActive={layerMapping !== null}
                />
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
        activeMode === 'help' ? (
          <HelpPanel />
        ) : activeMode === 'firmware' ? (
          <FirmwarePanel />
        ) : activeDefinition ? (
          <PropertyPanel
            activeMode={activeMode}
            activeDefinition={activeDefinition}
            selectedModuleId={activeDefinition.name}
            selectedKeyIndices={selectedKeyIndices}
            selectedLayer={selectedLayer}
            onConfigRestore={refreshKeymap}
            onKeymapChange={refreshKeymap}
            onKeyColorChange={handleKeyColorChange}
            keyColors={keyColors}
            onPerKeyColorsRestore={handlePerKeyColorsRestore}
            onSelectAll={() => {
              if (activeDefinition) {
                const totalKeys = activeDefinition.matrixPositions.length;
                setSelectedKeyIndices(Array.from({ length: totalKeys }, (_, i) => i));
              }
            }}
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
          onDeselectAll={() => { setSelectedKeyIndices([]); setAnchorKeyIndex(null); }}
          selectedCount={selectedKeyIndices.length}
          deviceKeymap={deviceKeymap}
          keyColors={keyColors}
          shiftHoverPreviewIndices={shiftHoverPreviewIndices}
          onKeyHover={setHoveredKeyIndex}
          activeMode={activeMode}
          presets={activePresets}
          customPresetIds={customPresetIds}
          onPresetSelect={handlePresetSelect}
          onSavePreset={handleSaveCustomPreset}
          onDeletePreset={handleDeleteCustomPreset}
          layerMappingLabel={layerMapping ? `${layerMapping.type}(${layerMapping.targetLayer})` : undefined}
          onCancelLayerMapping={() => setLayerMapping(null)}
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
