import { useRef } from 'react';
import { clsx } from 'clsx';
import { VirtualKeyboard } from './VirtualKeyboard';

import type { VIAKeyboardDefinition } from '../../types/via';
import type { KeyPreset } from '../../data/key-presets';

interface KeyboardStageProps {
    definition: VIAKeyboardDefinition;
    pressedKeys: string[];
    selectedKeyIndices: number[];
    onKeySelect: (index: number, modifiers: { ctrl: boolean; shift: boolean }) => void;
    onDeselectAll?: () => void;
    deviceKeymap?: number[];
    keyColors?: Record<number, string>;
    globalColor?: string | null;
    shiftHoverPreviewIndices?: number[];
    onKeyHover?: (index: number | null) => void;
    activeMode?: string;
    presets?: KeyPreset[];
    onPresetSelect?: (indices: number[], ctrl: boolean) => void;
}

export function KeyboardStage({ definition, pressedKeys, selectedKeyIndices, onKeySelect, onDeselectAll, deviceKeymap, keyColors, globalColor, shiftHoverPreviewIndices, onKeyHover, activeMode, presets, onPresetSelect }: KeyboardStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const isPresetActive = (preset: KeyPreset) =>
        preset.indices.length > 0 && preset.indices.every(i => selectedKeyIndices.includes(i));

    return (
        <div
            ref={containerRef}
            className="w-full h-full flex items-center justify-center overflow-hidden bg-background"
            onClick={() => onDeselectAll?.()}
        >
            <div className="relative transform scale-90 md:scale-100 transition-transform">
                <div className="relative cursor-default">
                    <div className="mb-4 text-center">
                        <h2 className="text-xl font-bold text-text-primary tracking-tight">{definition.name}</h2>
                        <p className="text-xs text-text-muted uppercase tracking-widest">VIA Device</p>
                    </div>

                    <VirtualKeyboard
                        definition={definition}
                        pressedKeys={pressedKeys}
                        selectedKeyIndices={selectedKeyIndices}
                        onKeySelect={onKeySelect}
                        deviceKeymap={deviceKeymap}
                        keyColors={keyColors}
                        globalColor={globalColor}
                        shiftHoverPreviewIndices={shiftHoverPreviewIndices}
                        onKeyHover={onKeyHover}
                    />

                    {activeMode === 'lighting' && presets && presets.length > 0 && onPresetSelect && (
                        <div
                            className="mt-3 flex flex-wrap justify-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {presets.map(preset => {
                                const active = isPresetActive(preset);
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPresetSelect(preset.indices, e.ctrlKey || e.metaKey);
                                        }}
                                        className={clsx(
                                            "px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-150 border",
                                            active
                                                ? "bg-primary text-white border-primary shadow-sm shadow-primary/30"
                                                : "bg-surface text-text-muted border-border hover:border-primary/50 hover:text-text-primary"
                                        )}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
