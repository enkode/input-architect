import type { VIAKeyboardDefinition, KeyPosition } from '../types/via';

/**
 * Parse a VIA keyboard definition into renderable key positions.
 * Extracted from VirtualKeyboard.tsx for shared use.
 */
export function parseKeyPositions(definition: VIAKeyboardDefinition): KeyPosition[] {
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
                const matrixPos = definition.matrixPositions[keyCounter];
                const ledArr = definition.ledIndices[keyCounter];

                result.push({
                    index: keyCounter,
                    matrixRow: matrixPos ? matrixPos[0] : 0,
                    matrixCol: matrixPos ? matrixPos[1] : 0,
                    ledIndices: ledArr ?? [],
                    id: `k-${keyCounter}`,
                    x, y, w: currentW, h: currentH,
                    label: typeof item === 'string' ? item : '',
                    code: currentCode,
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
}

/**
 * Get all key indices between an anchor and target on the same row.
 * Returns only [targetIdx] if keys are on different rows.
 */
export function getRowRangeIndices(
    anchorIdx: number,
    targetIdx: number,
    keys: KeyPosition[],
): number[] {
    const anchor = keys[anchorIdx];
    const target = keys[targetIdx];
    if (!anchor || !target) return [targetIdx];
    if (anchor.y !== target.y) return [targetIdx];

    const minX = Math.min(anchor.x, target.x);
    const maxX = Math.max(anchor.x + anchor.w, target.x + target.w);

    return keys
        .filter(k => k.y === anchor.y && k.x >= minX && k.x < maxX)
        .map(k => k.index);
}
