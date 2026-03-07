import { useRef } from 'react';
import { VirtualKeyboard } from './VirtualKeyboard';

import type { VIAKeyboardDefinition } from '../../types/via';

interface KeyboardStageProps {
    definition: VIAKeyboardDefinition;
    pressedKeys: string[];
    selectedKeyIndices: number[];
    onKeySelect: (index: number, isMulti: boolean) => void;
    onDeselectAll?: () => void;
    deviceKeymap?: number[];
    keyColors?: Record<number, string>;
    globalColor?: string | null;
}

export function KeyboardStage({ definition, pressedKeys, selectedKeyIndices, onKeySelect, onDeselectAll, deviceKeymap, keyColors, globalColor }: KeyboardStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);

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
                    />
                </div>
            </div>
        </div>
    );
}
