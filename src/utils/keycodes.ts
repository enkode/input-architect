// QMK modifier bitmasks (bits 8-15 of a 16-bit keycode)
export const MOD_LCTL = 0x0100;
export const MOD_LSFT = 0x0200;
export const MOD_LALT = 0x0400;
export const MOD_LGUI = 0x0800;

export const KEYCODE_MAP: Record<number, string> = {
    0x0000: "None",
    0x0001: "Trns", // KC_TRANSPARENT — pass through to lower layer
    0x0004: "A",
    0x0005: "B",
    0x0006: "C",
    0x0007: "D",
    0x0008: "E",
    0x0009: "F",
    0x000A: "G",
    0x000B: "H",
    0x000C: "I",
    0x000D: "J",
    0x000E: "K",
    0x000F: "L",
    0x0010: "M",
    0x0011: "N",
    0x0012: "O",
    0x0013: "P",
    0x0014: "Q",
    0x0015: "R",
    0x0016: "S",
    0x0017: "T",
    0x0018: "U",
    0x0019: "V",
    0x001A: "W",
    0x001B: "X",
    0x001C: "Y",
    0x001D: "Z",
    0x001E: "!\n1",
    0x001F: "@\n2",
    0x0020: "#\n3",
    0x0021: "$\n4",
    0x0022: "%\n5",
    0x0023: "^\n6",
    0x0024: "&\n7",
    0x0025: "*\n8",
    0x0026: "(\n9",
    0x0027: ")\n0",
    0x0028: "Enter",
    0x0029: "Esc",
    0x002A: "Backspace",
    0x002B: "Tab",
    0x002C: "Space",
    0x002D: "_\n-",
    0x002E: "+\n=",
    0x002F: "{\n[",
    0x0030: "}\n]",
    0x0031: "|\n\\",
    0x0033: ":\n;",
    0x0034: "\"\n'",
    0x0035: "~\n`",
    0x0036: "<\n,",
    0x0037: ">\n.",
    0x0038: "?\n/",
    0x0039: "Caps Lock",
    0x003A: "F1",
    0x003B: "F2",
    0x003C: "F3",
    0x003D: "F4",
    0x003E: "F5",
    0x003F: "F6",
    0x0040: "F7",
    0x0041: "F8",
    0x0042: "F9",
    0x0043: "F10",
    0x0044: "F11",
    0x0045: "F12",
    0x0046: "PrtSc",
    0x0047: "ScrLk",
    0x0048: "Pause",
    0x0049: "Ins",
    0x004A: "Home",
    0x004B: "PgUp",
    0x004C: "Del",
    0x004D: "End",
    0x004E: "PgDn",
    0x004F: "→",
    0x0050: "←",
    0x0051: "↓",
    0x0052: "↑",
    0x0053: "NumLk",
    0x0054: "KP /",
    0x0055: "KP *",
    0x0056: "KP -",
    0x0057: "KP +",
    0x0058: "KP Ent",
    0x0059: "KP 1",
    0x005A: "KP 2",
    0x005B: "KP 3",
    0x005C: "KP 4",
    0x005D: "KP 5",
    0x005E: "KP 6",
    0x005F: "KP 7",
    0x0060: "KP 8",
    0x0061: "KP 9",
    0x0062: "KP 0",
    0x0063: "KP .",
    // Media keys (QMK keycodes)
    0x00A5: "Pwr",
    0x00A6: "Slp",
    0x00A7: "Wake",
    0x00A8: "Mute",
    0x00A9: "Vol+",
    0x00AA: "Vol-",
    0x00AB: "Next",
    0x00AC: "Prev",
    0x00AD: "Stop",
    0x00AE: "Play",
    // Modifiers
    0x00E0: "LCtrl",
    0x00E1: "LShift",
    0x00E2: "LAlt",
    0x00E3: "LWin",
    0x00E4: "RCtrl",
    0x00E5: "RShift",
    0x00E6: "RAlt",
    0x00E7: "RWin"
};

/** Organized key categories for the UI picker */
export const KEY_CATEGORIES: { name: string; codes: number[] }[] = [
    {
        name: 'Letters',
        codes: [
            0x0004, 0x0005, 0x0006, 0x0007, 0x0008, 0x0009, 0x000A, 0x000B,
            0x000C, 0x000D, 0x000E, 0x000F, 0x0010, 0x0011, 0x0012, 0x0013,
            0x0014, 0x0015, 0x0016, 0x0017, 0x0018, 0x0019, 0x001A, 0x001B,
            0x001C, 0x001D,
        ],
    },
    {
        name: 'Numbers',
        codes: [0x001E, 0x001F, 0x0020, 0x0021, 0x0022, 0x0023, 0x0024, 0x0025, 0x0026, 0x0027],
    },
    {
        name: 'Editing',
        codes: [0x0028, 0x0029, 0x002A, 0x002B, 0x002C, 0x004C, 0x0049, 0x0039],
    },
    {
        name: 'Symbols',
        codes: [0x002D, 0x002E, 0x002F, 0x0030, 0x0031, 0x0033, 0x0034, 0x0035, 0x0036, 0x0037, 0x0038],
    },
    {
        name: 'F-Keys',
        codes: [0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F, 0x0040, 0x0041, 0x0042, 0x0043, 0x0044, 0x0045],
    },
    {
        name: 'Nav',
        codes: [0x004F, 0x0050, 0x0051, 0x0052, 0x004A, 0x004D, 0x004B, 0x004E],
    },
    {
        name: 'Media',
        codes: [0x00AE, 0x00AD, 0x00AB, 0x00AC, 0x00A8, 0x00A9, 0x00AA, 0x00A5, 0x00A6, 0x00A7],
    },
    {
        name: 'Mods',
        codes: [0x00E0, 0x00E1, 0x00E2, 0x00E3, 0x00E4, 0x00E5, 0x00E6, 0x00E7],
    },
    {
        name: 'Numpad',
        codes: [0x0053, 0x0054, 0x0055, 0x0056, 0x0057, 0x0058, 0x0059, 0x005A, 0x005B, 0x005C, 0x005D, 0x005E, 0x005F, 0x0060, 0x0061, 0x0062, 0x0063],
    },
    {
        name: 'Special',
        codes: [0x0046, 0x0047, 0x0048, 0x0000, 0x0001],
    },
];

/** Build a keycode with modifier bits. e.g. Ctrl+C = buildModKeycode(0x0006, {ctrl: true}) */
export function buildModKeycode(baseCode: number, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean; gui?: boolean }): number {
    let code = baseCode & 0xFF;
    if (mods.ctrl) code |= MOD_LCTL;
    if (mods.shift) code |= MOD_LSFT;
    if (mods.alt) code |= MOD_LALT;
    if (mods.gui) code |= MOD_LGUI;
    return code;
}

/** Get display label for a keycode (may contain \n for dual-char keys) */
export const getKeyLabel = (code: number): string => {
    // Direct lookup first
    if (KEYCODE_MAP[code] !== undefined) return KEYCODE_MAP[code] || "None";

    // Check for modifier combo keycodes (bits 8-11 = modifier flags)
    const base = code & 0xFF;
    const mods = (code >> 8) & 0x0F;
    if (mods && KEYCODE_MAP[base]) {
        const parts: string[] = [];
        if (mods & 0x01) parts.push('C');
        if (mods & 0x02) parts.push('S');
        if (mods & 0x04) parts.push('A');
        if (mods & 0x08) parts.push('G');
        parts.push(KEYCODE_MAP[base].replace('\n', ''));
        return parts.join('+');
    }

    return "0x" + code.toString(16).toUpperCase().padStart(4, '0');
};

/** Get a single-line label for compact display (strips newlines) */
export const getKeyLabelCompact = (code: number): string => {
    return getKeyLabel(code).replace('\n', ' ');
};
