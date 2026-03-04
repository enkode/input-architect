import { useState, useRef, useEffect } from 'react';
import { hid } from '../../services/HIDService';
import { useDevice } from '../../context/DeviceContext';
import { FRAMEWORK_RGB_EFFECTS } from '../../data/definitions/framework16';
import { Save, ChevronDown, CheckCircle2, RefreshCw, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import type { VIAKeyboardDefinition } from '../../types/via';

// RGB to HSV helper (VIA uses 0-255 range for H and S)
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [Math.round(h * 255), Math.round(s * 255), Math.round(v * 255)];
}

// HSV to RGB helper (H and S in 0-255 range)
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    h = h / 255; s = s / 255; v = v / 255;
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

interface ColorPickerProps {
    definition?: VIAKeyboardDefinition;
    selectedKeyIndices?: number[];
    onKeyColorChange?: (indices: number[], color: string | null) => void;
}

export function ColorPicker({ definition, selectedKeyIndices = [], onKeyColorChange }: ColorPickerProps) {
    const { hasPerKeyRGB } = useDevice();

    const [color, setColor] = useState({ r: 255, g: 0, b: 0 });
    const [brightness, setBrightness] = useState(128);
    const [effectId, setEffectId] = useState(1);
    const [speed, setSpeed] = useState(128);
    const [effectDropdownOpen, setEffectDropdownOpen] = useState(false);
    const [isPerKeyMode, setIsPerKeyMode] = useState(false);
    const [perKeyEnabling, setPerKeyEnabling] = useState(false);
    const [perKeyBrightness, setPerKeyBrightness] = useState(255);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [diagLog, setDiagLog] = useState<string[]>([]);
    const [showDiag, setShowDiag] = useState(false);

    const isSending = useRef(false);
    const pendingColor = useRef<{ r: number; g: number; b: number } | null>(null);

    const hasSelectedKeys = selectedKeyIndices.length > 0;

    const log = (msg: string) => {
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry = `[${ts}] ${msg}`;
        console.log(entry);
        setDiagLog(prev => [...prev.slice(-49), entry]);
    };

    const readDeviceState = async () => {
        if (!hid.isDeviceConnected()) {
            log('ERROR: No device connected');
            return;
        }
        log('Reading lighting state from device...');
        try {
            const b = await hid.getRGBBrightness();
            log(`  Brightness: ${b ?? 'null (no response)'}`);
            const e = await hid.getRGBEffect();
            log(`  Effect: ${e ?? 'null (no response)'}`);
            const s = await hid.getRGBEffectSpeed();
            log(`  Speed: ${s ?? 'null (no response)'}`);
            const c = await hid.getRGBColor();
            log(`  Color (HSV): ${c ? `H=${c[0]}, S=${c[1]}` : 'null (no response)'}`);

            if (b !== null) setBrightness(b);
            if (e !== null) setEffectId(e);
            if (s !== null) setSpeed(s);
            if (c !== null) {
                const [r, g, b2] = hsvToRgb(c[0], c[1], 255);
                setColor({ r, g, b: b2 });
                log(`  Color (RGB): R=${r}, G=${g}, B=${b2}`);
            }

            if (b === null && e === null && s === null && c === null) {
                log('WARNING: All reads returned null — device may not be responding to VIA commands');
            } else {
                log('Read complete');
            }
        } catch (err) {
            log(`ERROR: ${err}`);
        }
    };

    // Read current lighting state from device on mount
    useEffect(() => {
        if (!hid.isDeviceConnected()) return;
        readDeviceState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const sendColorUpdate = async (r: number, g: number, b: number) => {
        if (isSending.current) {
            pendingColor.current = { r, g, b };
            return;
        }
        isSending.current = true;
        try {
            if (isPerKeyMode && hasSelectedKeys && definition) {
                // Per-key mode: apply brightness then send RGB to selected LED indices
                const scale = perKeyBrightness / 255;
                const ar = Math.round(r * scale);
                const ag = Math.round(g * scale);
                const ab = Math.round(b * scale);
                const ledIndices = selectedKeyIndices
                    .flatMap(idx => definition.ledIndices[idx] ?? []);
                if (ledIndices.length > 0) {
                    await hid.setPerKeyColor(ar, ag, ab, ledIndices);
                }
                // Update virtual keyboard visualization
                onKeyColorChange?.(selectedKeyIndices, `rgb(${ar},${ag},${ab})`);
            } else {
                // Global mode: convert to HSV and send via VIA protocol
                const [h, s] = rgbToHsv(r, g, b);
                await hid.setRGBColor(h, s);
            }
        } catch (err) {
            console.error("Color command failed:", err);
        } finally {
            isSending.current = false;
            if (pendingColor.current) {
                const p = pendingColor.current;
                pendingColor.current = null;
                setTimeout(() => sendColorUpdate(p.r, p.g, p.b), 10);
            }
        }
    };

    const handleColorChange = (key: 'r' | 'g' | 'b', val: number) => {
        const newColor = { ...color, [key]: val };
        setColor(newColor);
        if (!isPerKeyMode) setHasUnsavedChanges(true);
        sendColorUpdate(newColor.r, newColor.g, newColor.b);
    };

    const handlePerKeyBrightnessChange = (val: number) => {
        setPerKeyBrightness(val);
        sendColorUpdate(color.r, color.g, color.b);
    };

    const handlePerKeyToggle = async () => {
        if (perKeyEnabling) return;
        setPerKeyEnabling(true);
        try {
            if (!isPerKeyMode) {
                const ok = await hid.enablePerKeyMode();
                if (ok) setIsPerKeyMode(true);
                else console.warn('Failed to enable per-key mode');
            } else {
                await hid.disablePerKeyMode();
                setIsPerKeyMode(false);
            }
        } catch (err) {
            console.error('Per-key toggle error:', err);
        } finally {
            setPerKeyEnabling(false);
        }
    };

    const handleBrightnessChange = (val: number) => {
        setBrightness(val);
        setHasUnsavedChanges(true);
        hid.setRGBBrightness(val).catch(err => log(`Brightness set failed: ${err}`));
    };

    const handleEffectChange = (id: number) => {
        setEffectId(id);
        setEffectDropdownOpen(false);
        setHasUnsavedChanges(true);
        log(`Setting effect to ${id}`);
        hid.setRGBEffect(id).catch(err => log(`Effect set failed: ${err}`));
    };

    const handleSpeedChange = (val: number) => {
        setSpeed(val);
        setHasUnsavedChanges(true);
        hid.setRGBEffectSpeed(val).catch(err => log(`Speed set failed: ${err}`));
    };

    const handleSave = async () => {
        if (saveState === 'saving') return;
        setSaveState('saving');
        log(`Saving: brightness=${brightness}, effect=${effectId}, speed=${speed}, color=RGB(${color.r},${color.g},${color.b})`);
        try {
            const [h, s] = rgbToHsv(color.r, color.g, color.b);
            log(`  HSV: H=${h}, S=${s}`);
            const ok = await hid.saveRGBSettings({
                brightness,
                effectId,
                speed,
                hue: h,
                saturation: s,
            }, log);
            if (ok) {
                log('Save SUCCESS');
                setSaveState('saved');
                setHasUnsavedChanges(false);
                setTimeout(() => setSaveState('idle'), 2000);
            } else {
                log('Save FAILED — see details above');
                setSaveState('error');
                setTimeout(() => setSaveState('idle'), 3000);
            }
        } catch (err) {
            log(`Save ERROR: ${err}`);
            setSaveState('error');
            setTimeout(() => setSaveState('idle'), 3000);
        }
    };

    const currentEffect = FRAMEWORK_RGB_EFFECTS.find(e => e.id === effectId);

    return (
        <div className="space-y-4">
            {/* Per-Key RGB mode toggle (only when firmware supports it) */}
            {hasPerKeyRGB && (
                <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-text-primary">
                                {isPerKeyMode ? 'Per-Key Color' : 'Global Color'}
                            </div>
                            <div className="text-[10px] text-text-muted">
                                {isPerKeyMode
                                    ? (hasSelectedKeys ? `${selectedKeyIndices.length} keys selected` : 'Select keys on the keyboard')
                                    : 'Applies to all keys'}
                            </div>
                        </div>
                        <button
                            onClick={handlePerKeyToggle}
                            disabled={perKeyEnabling}
                            className={clsx(
                                "w-10 h-5 rounded-full relative transition-colors",
                                isPerKeyMode ? 'bg-primary' : 'bg-surface-highlight border border-text-muted',
                                perKeyEnabling && 'opacity-50'
                            )}
                        >
                            <div className={clsx(
                                "absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow transition-all",
                                isPerKeyMode ? 'right-0.5' : 'left-0.5'
                            )} />
                        </button>
                    </div>
                </div>
            )}

            {/* Info when per-key is not available */}
            {!hasPerKeyRGB && (
                <div className="bg-surface border border-border rounded-lg p-3">
                    <div className="text-[10px] text-text-muted">
                        <span className="font-semibold text-text-secondary">Per-key RGB</span> requires custom firmware.
                        Use the <span className="text-primary font-semibold">Firmware</span> tab to flash it.
                    </div>
                </div>
            )}

            {/* Color Preview */}
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                    {isPerKeyMode ? 'Per-Key Color' : 'Backlight Color'}
                </h3>

                <div className="flex justify-center my-2">
                    {(() => {
                        const scale = isPerKeyMode ? perKeyBrightness / 255 : 1;
                        const dr = Math.round(color.r * scale);
                        const dg = Math.round(color.g * scale);
                        const db = Math.round(color.b * scale);
                        return (
                            <div className="w-24 h-24 rounded-full relative bg-gradient-to-tr from-blue-500 via-red-500 to-green-500 shadow-inner border border-white/10">
                                <div
                                    className="absolute inset-2 rounded-full bg-surface/80 backdrop-blur-sm flex items-center justify-center transition-colors duration-300"
                                    style={{ backgroundColor: `rgba(${dr},${dg},${db}, 0.2)` }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] border-2 border-white/20 transition-colors duration-200"
                                        style={{ backgroundColor: `rgb(${dr},${dg},${db})` }}
                                    />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* RGB Sliders */}
                <div className="space-y-2">
                    {(['r', 'g', 'b'] as const).map((c) => (
                        <div key={c} className="flex items-center gap-2 text-xs font-mono">
                            <span className={clsx("w-3 uppercase", c === 'r' ? 'text-red-400' : c === 'g' ? 'text-green-400' : 'text-blue-400')}>{c}</span>
                            <input
                                type="range"
                                min={0} max={255}
                                className="flex-1 h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                                value={color[c]}
                                onChange={(e) => handleColorChange(c, parseInt(e.target.value))}
                            />
                            <span className="text-text-muted w-8 text-right">{color[c]}</span>
                        </div>
                    ))}
                </div>

                {/* Per-key Brightness */}
                {isPerKeyMode && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted flex justify-between">
                            <span>Brightness</span>
                            <span>{Math.round((perKeyBrightness / 255) * 100)}%</span>
                        </label>
                        <input
                            type="range" min="0" max="255"
                            value={perKeyBrightness}
                            onChange={(e) => handlePerKeyBrightnessChange(parseInt(e.target.value))}
                            className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                        />
                    </div>
                )}

                {/* Per-key hint */}
                {isPerKeyMode && !hasSelectedKeys && (
                    <div className="text-[10px] text-primary/70 text-center animate-pulse">
                        Click keys on the keyboard to select them, then adjust color
                    </div>
                )}
            </div>

            {/* Global Controls (only in global mode) */}
            {!isPerKeyMode && (
                <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                    <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Lighting Controls</h3>

                    {/* Brightness */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted flex justify-between">
                            <span>Brightness</span>
                            <span>{Math.round((brightness / 255) * 100)}%</span>
                        </label>
                        <input
                            type="range" min="0" max="255"
                            value={brightness}
                            onChange={(e) => handleBrightnessChange(parseInt(e.target.value))}
                            className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                        />
                    </div>

                    {/* Effect Speed */}
                    {effectId > 1 && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-text-muted flex justify-between">
                                <span>Speed</span>
                                <span>{Math.round((speed / 255) * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="255"
                                value={speed}
                                onChange={(e) => handleSpeedChange(parseInt(e.target.value))}
                                className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:opacity-80"
                            />
                        </div>
                    )}

                    {/* Effect Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-muted">Effect</label>
                        <div className="relative">
                            <button
                                onClick={() => setEffectDropdownOpen(!effectDropdownOpen)}
                                className="w-full h-9 bg-surface-highlight border border-border rounded-md flex items-center justify-between px-3 hover:border-primary transition-colors text-xs"
                            >
                                <span>{currentEffect?.name ?? `Effect ${effectId}`}</span>
                                <ChevronDown size={14} className={clsx("text-text-muted transition-transform", effectDropdownOpen && "rotate-180")} />
                            </button>
                            {effectDropdownOpen && (
                                <div className="absolute bottom-full mb-1 left-0 w-full max-h-60 overflow-auto bg-surface border border-border rounded-md shadow-xl z-20">
                                    {FRAMEWORK_RGB_EFFECTS.map((e) => (
                                        <button
                                            key={e.id}
                                            onClick={() => handleEffectChange(e.id)}
                                            className={clsx(
                                                "w-full px-3 py-2 text-left text-xs transition-colors hover:bg-surface-highlight",
                                                effectId === e.id ? "text-primary bg-surface-highlight/50" : "text-text-muted"
                                            )}
                                        >
                                            {e.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save & Refresh buttons */}
            <div className="flex gap-2">
                <button
                    onClick={handleSave}
                    disabled={saveState === 'saving'}
                    className={clsx(
                        "flex-1 py-2 rounded-lg font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition-all",
                        saveState === 'saved'
                            ? 'bg-green-600 text-white'
                            : saveState === 'error'
                                ? 'bg-red-600 text-white'
                                : 'bg-surface-highlight hover:bg-primary hover:text-white',
                        saveState === 'saving' && 'opacity-50 cursor-wait'
                    )}
                >
                    {saveState === 'saved' ? (
                        <><CheckCircle2 size={14} /> Saved!</>
                    ) : saveState === 'error' ? (
                        <><Save size={14} /> Save Failed</>
                    ) : saveState === 'saving' ? (
                        <><Save size={14} /> Saving...</>
                    ) : (
                        <>
                            {hasUnsavedChanges && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                            <Save size={14} /> Save to Device
                        </>
                    )}
                </button>
                <button
                    onClick={readDeviceState}
                    title="Read current state from device"
                    className="px-3 py-2 rounded-lg text-xs bg-surface-highlight hover:bg-primary hover:text-white transition-all"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Diagnostic Log */}
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <button
                    onClick={() => setShowDiag(!showDiag)}
                    className="w-full px-3 py-2 flex items-center gap-2 text-[10px] text-text-muted hover:text-text-primary transition-colors"
                >
                    <Terminal size={12} />
                    <span>Diagnostics</span>
                    <ChevronDown size={12} className={clsx("ml-auto transition-transform", showDiag && "rotate-180")} />
                </button>
                {showDiag && (
                    <div className="border-t border-border px-3 py-2 max-h-40 overflow-auto font-mono text-[9px] leading-relaxed text-text-muted bg-black/20 space-y-0.5">
                        {diagLog.length === 0 ? (
                            <div className="text-text-muted/50 italic">No log entries yet. Try clicking the refresh button.</div>
                        ) : (
                            diagLog.map((entry, i) => (
                                <div key={i} className={clsx(
                                    entry.includes('ERROR') || entry.includes('FAILED') ? 'text-red-400' :
                                    entry.includes('WARNING') ? 'text-yellow-400' :
                                    entry.includes('SUCCESS') ? 'text-green-400' :
                                    'text-text-muted'
                                )}>{entry}</div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
