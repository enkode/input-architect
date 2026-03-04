import { useMemo } from 'react';
import type { VIAKeyboardDefinition, KeyPosition } from '../../types/via';
import { getKeyLabel } from '../../utils/keycodes';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface VirtualKeyboardProps {
    definition: VIAKeyboardDefinition;
    pressedKeys: string[];
    selectedKeyIndices: number[];
    onKeySelect: (index: number, isMulti: boolean) => void;
    deviceKeymap?: number[];
}

export function VirtualKeyboard({ definition, pressedKeys, selectedKeyIndices, onKeySelect, deviceKeymap }: VirtualKeyboardProps) {

    const renderableKeys = useMemo(() => {
        const result: KeyPosition[] = [];
        let y = 0;
        let keyCounter = 0;

        definition.layouts.keymap.forEach((rowData) => {
            let x = 0;
            let currentW = 1;
            let currentH = 1;
            let currentCode: string | undefined = undefined;

            rowData.forEach((item) => {
                if (typeof item === 'object') {
                    if (item.x !== undefined) x += item.x;
                    if (item.y !== undefined) y += item.y;
                    if (item.w !== undefined) currentW = item.w;
                    if (item.h !== undefined) currentH = item.h;
                    if (item.code !== undefined) currentCode = item.code;
                } else {
                    // Look up matrix position and LED index from definition
                    const matrixPos = definition.matrixPositions[keyCounter];
                    const ledArr = definition.ledIndices[keyCounter];

                    result.push({
                        index: keyCounter,
                        matrixRow: matrixPos ? matrixPos[0] : 0,
                        matrixCol: matrixPos ? matrixPos[1] : 0,
                        ledIndices: ledArr ?? [],
                        id: `k-${keyCounter}`,
                        x: x,
                        y: y,
                        w: currentW,
                        h: currentH,
                        label: typeof item === 'string' ? item : '',
                        code: currentCode
                    });

                    x += currentW;
                    keyCounter++;
                    currentW = 1;
                    currentH = 1;
                    currentCode = undefined;
                }
            });
            y++;
        });
        return result;
    }, [definition]);

    // Merge layout + live keymap labels
    const finalKeys = useMemo(() => {
        if (!deviceKeymap || deviceKeymap.length === 0) return renderableKeys;

        return renderableKeys.map((k, idx) => {
            if (deviceKeymap[idx] !== undefined && deviceKeymap[idx] !== 0) {
                return { ...k, label: getKeyLabel(deviceKeymap[idx]) };
            }
            return k;
        });
    }, [renderableKeys, deviceKeymap]);

    // Compute container size from actual key positions
    const containerSize = useMemo(() => {
        const UNIT = 50;
        const GAP = 4;
        let maxRight = 0;
        let maxBottom = 0;
        for (const key of renderableKeys) {
            maxRight = Math.max(maxRight, (key.x + key.w) * UNIT - GAP);
            maxBottom = Math.max(maxBottom, (key.y + key.h) * UNIT - GAP);
        }
        return { width: Math.ceil(maxRight) + GAP, height: Math.ceil(maxBottom) + GAP };
    }, [renderableKeys]);


    return (
        <div className="relative w-full h-full bg-surface/50 rounded-xl border border-border overflow-auto p-8 flex items-center justify-center">
            <div
                className="relative"
                style={{
                    width: `${containerSize.width}px`,
                    height: `${containerSize.height}px`
                }}
            >
                {finalKeys.map((key, idx) => {
                    const isSelected = selectedKeyIndices.includes(idx);
                    const isPressed = key.code && pressedKeys.includes(key.code);

                    return (
                        <motion.button
                            key={key.id}
                            className={clsx(
                                "absolute border rounded-md flex items-center justify-center text-xs font-semibold select-none transition-all duration-75",
                                isSelected
                                    ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(247,88,33,0.5)] z-10"
                                    : isPressed
                                        ? "bg-white text-black border-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 scale-95"
                                        : "bg-[#27272A] text-text-muted border-black/40 hover:border-text-secondary hover:text-text-primary"
                            )}
                            style={{
                                left: `${key.x * 50}px`,
                                top: `${key.y * 50}px`,
                                width: `${key.w * 50 - 4}px`,
                                height: `${key.h * 50 - 4}px`
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onKeySelect(idx, e.ctrlKey || e.metaKey);
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {key.label}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
