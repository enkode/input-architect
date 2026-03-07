import { useState, useEffect } from 'react';
import { storageService, type ConfigSnapshot } from '../../services/StorageService';
import { hid } from '../../services/HIDService';
import { log } from '../../services/Logger';
import { useDevice } from '../../context/DeviceContext';
import { FRAMEWORK_RGB_EFFECTS } from '../../data/definitions/framework16';
import { hsvToRgb } from '../../utils/color';
import { RotateCcw, Trash2, Download, Clock, ChevronDown, Save } from 'lucide-react';
import { clsx } from 'clsx';

function formatTimestamp(ts: number): string {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (isToday) return `Today ${time}`;
    if (isYesterday) return `Yesterday ${time}`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`;
}

interface ConfigHistoryProps {
    onPerKeyColorsRestore?: (colors: Record<number, string>) => void;
    keyColors?: Record<number, string>;
}

export function ConfigHistory({ onPerKeyColorsRestore, keyColors }: ConfigHistoryProps) {
    const { connectedProductId } = useDevice();
    const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);
    const [savingName, setSavingName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (connectedProductId === null) return;
        setSnapshots(storageService.loadSnapshots(connectedProductId));
    }, [connectedProductId]);

    const handleRestore = async (snapshot: ConfigSnapshot) => {
        if (restoringId || connectedProductId === null) return;
        setRestoringId(snapshot.id);
        try {
            if (snapshot.rgbSettings) {
                const { brightness, effectId, speed, hue, saturation } = snapshot.rgbSettings;
                await hid.setRGBBrightness(brightness);
                await hid.setRGBEffect(effectId);
                await hid.setRGBEffectSpeed(speed);
                await hid.setRGBColor(hue, saturation);
                await hid.saveRGBSettings(snapshot.rgbSettings);
                storageService.saveDeviceState(connectedProductId, {
                    rgbSettings: snapshot.rgbSettings,
                });
            }
            if (snapshot.perKeyColors && onPerKeyColorsRestore) {
                onPerKeyColorsRestore(snapshot.perKeyColors);
            }
        } catch (err) {
            log.errorConfig(`Restore failed: ${err}`);
        } finally {
            setRestoringId(null);
        }
    };

    const handleDelete = (snapshotId: string) => {
        if (connectedProductId === null) return;
        storageService.deleteSnapshot(connectedProductId, snapshotId);
        setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    };

    const handleExport = (snapshot: ConfigSnapshot) => {
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fw-config-${snapshot.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleManualSave = async () => {
        if (connectedProductId === null || saving) return;
        setSaving(true);
        try {
            const brightness = await hid.getRGBBrightness();
            const effectId = await hid.getRGBEffect();
            const speed = await hid.getRGBEffectSpeed();
            const color = await hid.getRGBColor();
            const rgbSettings = brightness !== null && effectId !== null && speed !== null && color !== null
                ? { brightness, effectId, speed, hue: color[0], saturation: color[1] }
                : undefined;
            const perKeyColors = keyColors && Object.keys(keyColors).length > 0 ? keyColors : undefined;
            const label = savingName.trim() || 'Manual save';
            storageService.saveSnapshot(connectedProductId, {
                label: `Manual: ${label}`,
                rgbSettings,
                perKeyColors,
            });
            setSnapshots(storageService.loadSnapshots(connectedProductId));
            setSavingName('');
            setShowSaveInput(false);
        } catch (err) {
            log.errorConfig(`Manual save failed: ${err}`);
        } finally {
            setSaving(false);
        }
    };

    const reversed = [...snapshots].reverse();

    return (
        <div className="bg-surface border border-border p-4 rounded-lg space-y-3">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between"
            >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Clock size={16} />
                    Config History
                </h3>
                <ChevronDown size={14} className={clsx("text-text-muted transition-transform", expanded && "rotate-180")} />
            </button>

            {expanded && (
                <>
                    <p className="text-[10px] text-text-muted">
                        Automatic snapshots of your lighting settings. Restore any previous configuration.
                    </p>

                    {/* Manual save */}
                    {showSaveInput ? (
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                placeholder="Snapshot name..."
                                value={savingName}
                                onChange={(e) => setSavingName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSave()}
                                className="flex-1 px-2 py-1.5 rounded-md text-[10px] bg-surface-highlight border border-border text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary"
                                autoFocus
                            />
                            <button
                                onClick={handleManualSave}
                                disabled={saving}
                                className={clsx(
                                    "px-3 py-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors",
                                    saving ? "bg-primary/20 text-primary cursor-wait" : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                            >
                                <Save size={10} />
                                {saving ? '...' : 'Save'}
                            </button>
                            <button
                                onClick={() => { setShowSaveInput(false); setSavingName(''); }}
                                className="px-2 py-1.5 rounded-md text-[10px] text-text-muted hover:text-text-primary transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSaveInput(true)}
                            className="w-full py-1.5 rounded-md text-[10px] font-semibold flex items-center justify-center gap-1 bg-surface-highlight hover:bg-primary/10 hover:text-primary text-text-muted transition-colors"
                        >
                            <Save size={10} />
                            Save Current Config
                        </button>
                    )}

                    {reversed.length === 0 ? (
                        <div className="text-[10px] text-text-muted/50 italic py-4 text-center">
                            No snapshots yet. Save settings to create your first snapshot.
                        </div>
                    ) : (
                        <div className="space-y-1.5 max-h-64 overflow-auto">
                            {reversed.map(snapshot => {
                                const effect = snapshot.rgbSettings
                                    ? FRAMEWORK_RGB_EFFECTS.find(e => e.id === snapshot.rgbSettings?.effectId)
                                    : null;
                                const [cr, cg, cb] = snapshot.rgbSettings
                                    ? hsvToRgb(snapshot.rgbSettings.hue, snapshot.rgbSettings.saturation, 255)
                                    : [0, 0, 0];
                                const brightnessPercent = snapshot.rgbSettings
                                    ? Math.max(1, Math.round((snapshot.rgbSettings.brightness / 255) * 100))
                                    : null;
                                const isRestoring = restoringId === snapshot.id;
                                const hasPerKey = snapshot.perKeyColors && Object.keys(snapshot.perKeyColors).length > 0;

                                return (
                                    <div
                                        key={snapshot.id}
                                        className="bg-surface-highlight/50 border border-border/50 rounded-md p-2 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {snapshot.rgbSettings && (
                                                    <div
                                                        className="w-3 h-3 rounded-full flex-shrink-0 border border-white/10"
                                                        style={{ backgroundColor: `rgb(${cr},${cg},${cb})` }}
                                                    />
                                                )}
                                                <span className="text-[10px] text-text-primary truncate">
                                                    {snapshot.label}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-text-muted/60 flex-shrink-0 ml-2">
                                                {formatTimestamp(snapshot.timestamp)}
                                            </span>
                                        </div>

                                        {snapshot.rgbSettings && (
                                            <div className="text-[9px] text-text-muted font-mono">
                                                {brightnessPercent}% brightness
                                                {effect ? ` / ${effect.name}` : ''}
                                                {hasPerKey ? ' + per-key colors' : ''}
                                            </div>
                                        )}

                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleRestore(snapshot)}
                                                disabled={isRestoring || restoringId !== null}
                                                className={clsx(
                                                    "flex-1 py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors",
                                                    isRestoring
                                                        ? "bg-primary/20 text-primary cursor-wait"
                                                        : "bg-primary/10 text-primary hover:bg-primary/20"
                                                )}
                                            >
                                                <RotateCcw size={10} className={clsx(isRestoring && "animate-spin")} />
                                                {isRestoring ? 'Restoring...' : 'Restore'}
                                            </button>
                                            <button
                                                onClick={() => handleExport(snapshot)}
                                                title="Export as JSON"
                                                className="px-2 py-1 rounded text-[10px] text-text-muted hover:text-primary transition-colors bg-surface-highlight/50"
                                            >
                                                <Download size={10} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(snapshot.id)}
                                                title="Delete snapshot"
                                                className="px-2 py-1 rounded text-[10px] text-text-muted hover:text-red-400 transition-colors bg-surface-highlight/50"
                                            >
                                                <Trash2 size={10} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
