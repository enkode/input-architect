<p align="center">
  <img src="https://raw.githubusercontent.com/enkode/input-architect/main/docs/banner.svg" alt="Input Architect" width="600" />
</p>

<h1 align="center">Input Architect</h1>

<p align="center">
  <strong>A modern, open-source configurator for Framework Laptop 16 input modules.</strong>
</p>

<p align="center">
  Remap keys, control per-key RGB lighting, flash custom firmware — available as a desktop app or in your browser.
</p>

<p align="center">
  <a href="#download">Download</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#usage">Usage</a> &bull;
  <a href="#firmware">Firmware</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#credits">Credits</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://github.com/enkode/input-architect/releases/latest"><img src="https://img.shields.io/badge/Download-Windows%20Installer-F75821?style=for-the-badge&logo=windows" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Framework-Laptop%2016-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/WebHID-Supported-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/VIA-V2%20%26%20V3-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Tauri-Desktop%20App-24C8D8?style=flat-square&logo=tauri" />
  <img src="https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square" />
</p>

---

## Screenshots

*Coming soon*

---

## Download

### Desktop App (Recommended)

The easiest way to use Input Architect — just download, install, and go. No code, no terminal, no setup.

| Platform | Download | Size |
|----------|----------|------|
| Windows (64-bit) | [**Input Architect Installer**](https://github.com/enkode/input-architect/releases/latest) | ~2 MB |

> Built with [Tauri](https://tauri.app/) — lightweight native desktop app using your system's WebView2 runtime. No bloated Electron, no 150 MB downloads.

### Browser App

If you prefer not to install anything, you can run Input Architect directly in Chrome or Edge:

```bash
git clone https://github.com/enkode/input-architect.git
cd input-architect
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome 89+ or Edge 89+ (WebHID required).

---

## Features

### Key Mapping
- **Full key remapping** via the [VIA protocol](https://www.caniusevia.com/) (V2 and V3)
- **6 programmable layers** — base layer plus 5 custom layers
- **100+ QMK keycodes** organized by category (Basic, Function, Navigation, Modifiers, Media)
- **Modifier combinations** — Ctrl+Key, Shift+Key, Alt+Key, and more
- **Live readback** — see what's programmed on each key in real time

### RGB Lighting
- **28+ built-in effects** — Solid Color, Breathing, Rainbow, Heatmap, Digital Rain, and more
- **Per-key RGB control** — set individual key colors with the [nucleardog firmware](#custom-firmware)
- **Per-key brightness** — independent brightness slider for selected keys
- **Global controls** — brightness, effect speed, and color
- **HSV and RGB** color pickers with live preview
- **Save to device** — persist settings in keyboard EEPROM

### Firmware Management
- **Guided 5-step flash workflow** — Select → Download → Bootloader → Flash → Reconnect
- **UF2 file validator** — checks magic bytes, RP2040 family ID, flash address range, block integrity
- **One-click build script** — automatically clones, installs QMK MSYS, compiles, and delivers firmware
- **Interactive device detection** — build script scans USB and shows connected Framework devices
- **Device-specific bootloader instructions** — touchpad slide method and BOOTSEL button

### Hardware Support
| Module | PID | Keys | LEDs | Per-Key RGB |
|--------|-----|------|------|:-----------:|
| Framework 16 ANSI Keyboard | `0x0012` | 78 | 97 | With custom firmware |
| Framework 16 RGB Macropad | `0x0013` | 24 | 24 | With custom firmware |

---

## Getting Started

**Most users:** Just [download the installer](#download) — no setup required.

**Developers** who want to build from source or contribute:

### Prerequisites

- **Node.js** 18+ and **npm**
- **Browser:** Chrome 89+ or Edge 89+ (WebHID required — Firefox/Safari not supported)
- **Device:** Framework Laptop 16 with ANSI Keyboard or RGB Macropad
- **For custom firmware builds:** [Git](https://git-scm.com/) installed and in your PATH
- **For desktop builds:** [Rust](https://rustup.rs/) toolchain and [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Development

```bash
git clone https://github.com/enkode/input-architect.git
cd input-architect
npm install

# Run in browser
npm run dev

# Run as desktop app (requires Rust)
npm run tauri:dev
```

### Production Build

```bash
# Web build
npm run build

# Desktop installer (outputs to src-tauri/target/release/bundle/)
npm run tauri:build
```

---

## Usage

### Connecting Your Device

1. Click **Connect Your Device** (or the **Connect** button in the sidebar)
2. The browser will show a device picker — select your Framework keyboard or macropad
3. The app automatically detects the VIA protocol version and per-key RGB support

### Remapping Keys

1. Navigate to the **Mapping** tab
2. Click a key on the virtual keyboard to select it
3. Choose a new keycode from the inspector panel on the right
4. Click **Apply** — the change is written to the device immediately
5. Use the **Layer Selector** at the bottom-left to switch between layers (0–5)

### Controlling RGB Lighting

**Global Mode:**
1. Navigate to the **Lighting** tab
2. Adjust brightness, effect, speed, and color using the inspector panel
3. Click **Save to Device** to persist changes

**Per-Key Mode** (requires [custom firmware](#custom-firmware)):
1. Toggle **Per-Key Color** on
2. Click one or more keys on the virtual keyboard (Shift+click for multi-select)
3. Adjust the R, G, B sliders and brightness
4. Colors update in real time on the hardware

### Flashing Firmware

1. Navigate to the **Firmware** tab
2. Select a firmware from the catalog
3. Follow the guided workflow:
   - **Download** — get the `.uf2` file (or use the auto-build script)
   - **Bootloader** — put your device into bootloader mode (appears as `RPI-RP2` USB drive)
   - **Flash** — drag the `.uf2` file onto the drive
   - **Reconnect** — the device reboots automatically; reconnect in the app

---

## Firmware

### Stock Framework Firmware

The stock QMK firmware from Framework Computer supports key remapping and global RGB effects via VIA, but does **not** support per-key RGB control.

- **Source:** [FrameworkComputer/qmk_firmware](https://github.com/FrameworkComputer/qmk_firmware)
- **VIA Definitions:** [FrameworkComputer/the-via-keyboards](https://github.com/FrameworkComputer/the-via-keyboards)

### Custom Firmware (Per-Key RGB)

[nucleardog's QMK fork](https://gitlab.com/nucleardog/qmk_firmware_fw16) adds a custom `rgb_remote` protocol that enables per-key RGB control from the host. This is what powers the per-key color feature in Input Architect.

- **Source:** [nucleardog/qmk_firmware_fw16](https://gitlab.com/nucleardog/qmk_firmware_fw16)
- **Protocol:** Custom VIA raw HID commands (`0xFE` prefix)
- **Targets:** `framework/ansi` and `framework/macropad`

#### Building Custom Firmware

**Automatic (recommended):**
1. Go to the **Firmware** tab → select **nucleardog per-key RGB**
2. Click **Download Build Script**
3. Double-click the downloaded `build-firmware.cmd`
4. The script will:
   - Detect connected Framework devices
   - Ask which device to build for
   - Clone the firmware source from GitLab
   - Download and install QMK MSYS (if not already installed)
   - Compile the firmware
   - Copy the `.uf2` file to your Desktop

**Manual:**
```bash
# Install QMK CLI
pip install qmk

# Clone the firmware
git clone https://gitlab.com/nucleardog/qmk_firmware_fw16.git ~/qmk_firmware_fw16
qmk setup -H ~/qmk_firmware_fw16 -y

# Compile (run in QMK MSYS on Windows)
cd ~/qmk_firmware_fw16
qmk compile -kb framework/ansi -km default      # For ANSI keyboard
qmk compile -kb framework/macropad -km default   # For RGB macropad
```

### Safety

The Framework 16 keyboard and macropad use the **RP2040** microcontroller with a **permanent, immutable UF2 bootloader**. It is impossible to brick the device — if anything goes wrong, simply re-enter bootloader mode and flash again. Always have an external keyboard handy during flashing.

---

## Architecture

```
src/
├── App.tsx                     # Root component, mode routing
├── main.tsx                    # React entry point
├── index.css                   # Tailwind imports, theme variables
│
├── layouts/
│   └── MainLayout.tsx          # 3-column layout (sidebar | stage | inspector)
│
├── components/
│   ├── Stage/                  # Center — keyboard visualization
│   │   ├── KeyboardStage.tsx   # Keyboard container
│   │   ├── VirtualKeyboard.tsx # Key layout renderer (from VIA JSON)
│   │   └── Key.tsx             # Individual key (selection, animation)
│   │
│   ├── Inspector/              # Right panel — configuration
│   │   ├── PropertyPanel.tsx   # Mode router (mapping/lighting/macros)
│   │   ├── KeymapFlow.tsx      # Keycode selector & apply flow
│   │   ├── ColorPicker.tsx     # RGB/HSV picker, per-key & global controls
│   │   ├── LEDMatrixControls.tsx  # Serial LED matrix (expansion cards)
│   │   └── RapidTriggerControl.tsx # Analog actuation (stub)
│   │
│   ├── Sidebar/                # Left panel — navigation
│   │   ├── NavigationMenu.tsx  # Mode tabs (Mapping/Lighting/Firmware/...)
│   │   ├── LayerSelector.tsx   # Layer picker (0–5)
│   │   └── ModuleList.tsx      # Device module selector
│   │
│   └── Firmware/               # Firmware management
│       ├── FirmwareStage.tsx   # 5-step guided flash workflow
│       └── FirmwarePanel.tsx   # Firmware catalog & info
│
├── services/
│   ├── HIDService.ts           # WebHID — VIA protocol, per-key RGB
│   ├── SerialService.ts        # WebSerial — LED matrix modules
│   └── ConfigService.ts        # High-level keymap read/write
│
├── context/
│   └── DeviceContext.tsx        # React context — device state
│
├── data/
│   ├── definitions/
│   │   ├── framework16.ts      # ANSI keyboard (78 keys, 97 LEDs)
│   │   └── macropad.ts         # RGB macropad (24 keys, 24 LEDs)
│   └── firmware-catalog.ts     # Firmware entries & bootloader instructions
│
├── types/
│   └── via.ts                  # VIA protocol TypeScript types
│
└── utils/
    ├── keycodes.ts             # QMK keycode map & labels
    ├── uf2.ts                  # UF2 file format validator
    └── build-script.ts         # Firmware build script generator
```

### Communication Protocols

**VIA Protocol (V2/V3)** — Standard keyboard configuration protocol over raw HID (usage page `0xFF60`, usage `0x61`). Used for reading/writing keycodes, RGB effect control, and EEPROM save.

**nucleardog rgb_remote** — Custom extension to VIA raw HID using command prefix `0xFE`. Supports:
- `0x00` — Query per-key RGB support
- `0x01` — Enable per-key mode
- `0x02` — Disable per-key mode
- `0x10` — Set LED colors (batch, up to 25 LEDs per packet)

**WebSerial** — Used for Framework LED matrix expansion cards (separate from keyboard).

### Tech Stack

| | |
|---|---|
| **Framework** | React 19 + TypeScript 5.9 |
| **Build** | Vite 7 |
| **Desktop** | Tauri 2 (Rust + WebView2) |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Hardware** | WebHID API, WebSerial API |

---

## Credits

This project stands on the shoulders of several amazing open-source projects and communities:

### Framework Computer
- [FrameworkComputer/qmk_firmware](https://github.com/FrameworkComputer/qmk_firmware) — Official QMK firmware for Framework Laptop 16 input modules
- [FrameworkComputer/the-via-keyboards](https://github.com/FrameworkComputer/the-via-keyboards) — VIA keyboard definitions for Framework devices
- [FrameworkComputer/inputmodule-rs](https://github.com/FrameworkComputer/inputmodule-rs) — Rust-based input module control tool

### nucleardog
- [nucleardog/qmk_firmware_fw16](https://gitlab.com/nucleardog/qmk_firmware_fw16) — Custom QMK firmware fork that adds per-key RGB control via the `rgb_remote` protocol. This is what makes per-key RGB possible in Input Architect.

### QMK
- [QMK Firmware](https://github.com/qmk/qmk_firmware) — The open-source keyboard firmware that powers Framework input modules
- [QMK MSYS](https://msys.qmk.fm/) — Windows build environment for QMK firmware

### VIA
- [VIA](https://www.caniusevia.com/) — The keyboard configuration protocol and app that inspired this project's communication layer
- [the-via/keyboards](https://github.com/the-via/keyboards) — Community VIA keyboard definitions

### Microsoft
- [microsoft/uf2](https://github.com/microsoft/uf2) — USB Flashing Format specification used by RP2040 bootloader

---

## Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or pull requests — all help is appreciated.

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes
4. **Push** to the branch
5. **Open** a Pull Request

### Development

```bash
npm run dev          # Start web dev server with HMR
npm run build        # Type-check + production build
npm run lint         # Run ESLint
npm run tauri:dev    # Launch desktop app in dev mode
npm run tauri:build  # Build desktop installer
```

### Adding Support for New Devices

To add a new Framework input module:

1. Create a definition file in `src/data/definitions/` following the pattern in `framework16.ts`
2. Add the product ID to `SUPPORTED_VIDS` in `HIDService.ts` (if different VID)
3. Add auto-detection logic in `App.tsx` based on `connectedProductId`
4. Add firmware entries to `firmware-catalog.ts` if applicable

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with <a href="https://frame.work">Framework</a> hardware and a lot of late nights.<br/>
  <sub>Not affiliated with Framework Computer Inc.</sub>
</p>
