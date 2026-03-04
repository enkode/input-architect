import { ColorPicker } from './ColorPicker';
import { KeymapFlow } from './KeymapFlow';
import { RapidTriggerControl } from './RapidTriggerControl';
import { LEDMatrixControls } from './LEDMatrixControls';
import { Settings2, Download, Upload } from 'lucide-react';
import { configService } from '../../services/ConfigService';
import type { VIAKeyboardDefinition } from '../../types/via'; // Import Type

// Removed ModuleData import to break dependency on legacy file if needed, 
// or just define a loose contract
// import type { ModuleData } from '../Stage/ModuleRenderer';

interface PropertyPanelProps {
    activeMode: 'mapping' | 'lighting' | 'macros' | 'settings';
    activeDefinition?: VIAKeyboardDefinition;
    selectedModuleId: string | null;
    selectedModuleType: 'keyboard' | 'numpad' | 'led-matrix' | null;
    selectedKeyIndices?: number[];
    selectedLayer?: number;
    onConfigRestore?: () => void;
    onKeymapChange?: () => void;
    onKeyColorChange?: (indices: number[], color: string | null) => void;
}

export function PropertyPanel({ activeMode, activeDefinition, selectedModuleId, selectedModuleType, selectedKeyIndices = [], selectedLayer = 0, onConfigRestore, onKeymapChange, onKeyColorChange }: PropertyPanelProps) {
    // If no module selected, we might still show generic global settings in some modes
    if (!selectedModuleId) {
        return (
            <div className="p-4 h-full flex items-center justify-center text-text-muted text-xs">
                Select a module to edit properties
            </div>
        );
    }

    // LED Matrix/Display Logic
    if (selectedModuleType === 'led-matrix') {
        return (
            <div className="p-4 space-y-4 h-full">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-primary/30 pb-1">Properties</h2>
                    <span className="text-[10px] font-mono text-text-muted">{selectedModuleId.toUpperCase()}</span>
                </div>
                <LEDMatrixControls />
            </div>
        );
    }

    // Keyboard Logic (Default)
    return (
        <div className="p-4 space-y-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest border-b border-primary/30 pb-1">
                    {activeMode === 'mapping' ? 'Key Mapping' : activeMode === 'lighting' ? 'Lighting' : 'Macros'}
                </h2>
                <span className="text-[10px] font-mono text-text-muted">
                    {selectedModuleId.toUpperCase()}
                    {selectedKeyIndices.length > 0 && ` // ${selectedKeyIndices.length} KEYS`}
                </span>
            </div>

            {activeMode === 'mapping' && (
                <>
                    <KeymapFlow
                        definition={activeDefinition}
                        selectedKeyIndices={selectedKeyIndices}
                        selectedLayer={selectedLayer}
                        onKeymapChange={onKeymapChange}
                    />
                    <RapidTriggerControl />
                </>
            )}

            {activeMode === 'lighting' && (
                <ColorPicker
                    definition={activeDefinition}
                    selectedKeyIndices={selectedKeyIndices}
                    onKeyColorChange={onKeyColorChange}
                />
            )}

            {activeMode === 'macros' && (
                <div className="text-sm text-text-muted text-center py-10 border-2 border-dashed border-border rounded-lg">
                    Macro Recording Interface<br />(Coming Soon)
                </div>
            )}

            {activeMode === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-surface border border-border p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Settings2 size={16} />
                            Backup & Restore
                        </h3>
                        <p className="text-[10px] text-text-muted">
                            Save your keymap configuration to a file or restore from a backup.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    const cfg = await configService.backupConfig();
                                    if (cfg) {
                                        const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `framework-config-${Date.now()}.json`;
                                        a.click();
                                    }
                                }}
                                className="flex-1 bg-surface-highlight hover:bg-primary hover:text-white transition-colors py-2 rounded text-xs flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Backup
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.json';
                                    input.onchange = async (e: Event) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (!file) return;
                                        const text = await file.text();
                                        try {
                                            const json = JSON.parse(text);
                                            const success = activeDefinition
                                                ? await configService.restoreConfig(json, activeDefinition)
                                                : false;
                                            if (success && onConfigRestore) {
                                                onConfigRestore();
                                            }
                                        } catch {
                                            alert("Invalid Config File");
                                        }
                                    };
                                    input.click();
                                }}
                                className="flex-1 bg-surface-highlight hover:bg-primary hover:text-white transition-colors py-2 rounded text-xs flex items-center justify-center gap-2"
                            >
                                <Upload size={14} /> Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
