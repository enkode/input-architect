# Current Issues — Input Architect

## 1. Per-Key Colors Not Readable From Hardware (Protocol Limitation)

**Severity:** Fundamental
**Files:** `src/services/HIDService.ts`, `src/components/Inspector/ColorPicker.tsx`

### Problem
The app cannot read per-key colors from the keyboard hardware. When the app opens, the virtual keyboard should display the actual colors on the physical keyboard. Instead, it relies on localStorage, which can be stale, cleared, or absent.

### Root Cause
The nucleardog `rgb_remote` firmware protocol only supports **writing** per-key colors:

| Command   | Code | Direction | Description |
|-----------|------|-----------|-------------|
| QUERY     | 0x00 | Read      | Check if per-key RGB is supported |
| ENABLE    | 0x01 | Write     | Enable per-key mode |
| DISABLE   | 0x02 | Write     | Disable per-key mode |
| SET_LEDS  | 0x10 | Write     | Set LED colors (batch) |

There is **no GET_LEDS command** to read current colors. The firmware stores colors in RAM (`rgb_remote_state[]`) but does not expose them over HID.

### Current Workaround
Per-key colors are saved to localStorage on change (500ms debounce). On reconnect, they're restored to both the device and the virtual keyboard. Breaks if: localStorage was cleared, a different app instance set the colors, or first-time use on a pre-colored keyboard.

### Possible Solutions
- **Option A:** Add `GET_LEDS (0x11)` to the firmware fork — true device readback
- **Option B:** Keep localStorage but add file-based export/import, cloud sync, and "Restored from saved config" indicator
- **Option C:** Make the refresh button re-apply stored per-key colors to the device as a manual sync

---

## 2. Global Backlight Color No Longer Shown on Virtual Keyboard

**Severity:** Medium — regression risk
**File:** `src/components/Inspector/ColorPicker.tsx:68-72`

### Problem
The `onGlobalColorChange` effect now always emits `null`, so the virtual keyboard never shows the global backlight color (hue/saturation from VIA). In global mode (no keys selected), all keys appear dark/uncolored even though the hardware has a backlight color set.

Previously this was changed because the global color was bleeding onto every key, making it look like they all had per-key colors. The fix went too far — now there's no visual representation of the backlight color at all.

### Possible Fix
Only show global color when effect is "Solid Color" and no per-key colors are set, or show it as a subtle background tint on the keyboard stage rather than on individual keys.

---

## 3. Multi-Key Color Batch — Unconfirmed Fix

**Severity:** Medium — may still drop packets
**File:** `src/services/HIDService.ts:438-458`

### Problem
Batch size was reduced from 25 to 10 LEDs per packet (v0.12.2) to fix multi-key color changes only affecting the last key. This was a speculative fix — there is **no error detection** in `setPerKeyColor`. If a batch packet is dropped or rejected by the firmware, the failure is silent.

### Details
- 26 letter keys = 3 packets (10+10+6) with 5ms inter-packet delay
- Full keyboard restore (97 LEDs, one color) = 10 packets
- No acknowledgment verification — the app sends commands and hopes they work
- The original 25-LED batch filled the entire 32-byte HID report; firmware may have had buffer issues

---

## 4. Shift+Click Cross-Row Selection Doesn't Work

**Severity:** Medium — design limitation
**File:** `src/utils/keyboardLayout.ts:64`

### Problem
`getRowRangeIndices()` returns only `[targetIdx]` (single key) when the anchor and target are on different rows. Cross-row Shift+click is effectively broken — it selects only the target key instead of a range.

The shift-hover preview also goes blank when crossing row boundaries, giving no visual hint of the limitation.

### Impact
Users must use Ctrl+click or presets for multi-row selection. The presets feature (v0.12.1) mitigates this significantly.

---

## 5. Refresh Button Misleading

**Severity:** Low-Medium
**File:** `src/components/Inspector/ColorPicker.tsx` (refresh button next to Save)

### Problem
The refresh button calls `readDeviceState()` which reads global VIA settings (brightness, effect, speed, HSV color). It does **not** read or re-apply per-key colors. Users expect it to sync per-key state.

### Possible Fix
Make the refresh button also re-apply stored per-key colors from localStorage to the device, or disable it with a tooltip explaining the limitation.

---

## 6. Remaining `alert()` Calls

**Severity:** Low — code quality
**Files:**
- `src/components/Inspector/KeymapFlow.tsx:47` — `alert("No keys selected!")`
- `src/components/Inspector/PropertyPanel.tsx:59` — `alert("Backup failed...")`
- `src/components/Inspector/PropertyPanel.tsx:89` — `alert("Invalid Config File")`

These blocking `alert()` calls should be replaced with in-app toast notifications or inline error messages.

---

## 7. Console Logging Bypasses Centralized Logger

**Severity:** Low — code quality
**Files:**
- `src/components/Inspector/KeymapFlow.tsx:55,59` — `console.log`, `console.warn`
- `src/components/Inspector/PropertyPanel.tsx:64` — `console.error`
- `src/services/StorageService.ts:40,85,104` — `console.warn` (acceptable — avoiding circular deps with Logger)

These log calls won't appear in the in-app diagnostics panel.

---

## 8. ESLint Errors (Fast Refresh)

**Severity:** Low — development experience
**Files:**
- `src/context/DeviceContext.tsx:183` — exports both `DeviceProvider` component and `useDevice` hook
- `src/layouts/MainLayout.tsx:6` — exports both component and type

React Fast Refresh won't work correctly for these files during development.

---

## 9. ESLint Warnings (Dependency Arrays)

**Severity:** Low — potential stale closure bugs
**Files:**
- `src/App.tsx:190` — restore `useEffect` missing deps: `connectedProductId`, `hasPerKeyRGB`, `markRestoreComplete`, `refreshKeymap`
- `src/components/Inspector/ColorPicker.tsx:66` — color-sync `useEffect` missing `keyColors` dep
- `src/components/Inspector/ColorPicker.tsx:123` — stale `eslint-disable` directive (no longer needed)

The missing `hasPerKeyRGB` dep means if per-key support detection completes AFTER the restore effect runs, the per-key hardware restore is skipped.

---

## 10. Per-Key Persistence Race Condition

**Severity:** Low — edge case
**File:** `src/App.tsx:138-189`

### Problem
`perKeyRestoredRef.current = true` is set synchronously before the async `doRestore()`. If `doRestore` fails partway and the device disconnects/reconnects quickly, the ref is still `true` so restore won't retry. The ref reset (on disconnect) and the restore effect both depend on `isConnected`, and effect execution order isn't guaranteed.

---

## 11. Keycode Verify Failure Silent

**Severity:** Low — UX gap
**File:** `src/components/Inspector/KeymapFlow.tsx:58-59`

When a keycode write-then-verify fails (readback doesn't match), the only output is `console.warn`. No user-visible indicator or in-app log entry.

---

## 12. Config History — No Auto-Snapshot on Restore

**Severity:** Low — UX gap
**File:** `src/components/Inspector/ConfigHistory.tsx`

Restoring a snapshot does not create a "Restored from..." auto-snapshot or refresh the visible snapshot list. The user can't tell what state they were in before restoring.

---

## 13. Layer Selector Shown in Lighting Mode

**Severity:** Low — UX confusion
**File:** `src/App.tsx:411`

The layer selector is displayed in lighting mode, implying per-key colors differ per layer. They don't — all layers share the same physical LEDs. The layer selector should only appear in mapping mode.

---

## Summary

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | No per-key color readback from hardware | Fundamental | Protocol limitation |
| 2 | Global backlight color not shown on virtual keyboard | Medium | Regression from v0.12.3 |
| 3 | Multi-key batch may silently drop packets | Medium | Speculative fix, unconfirmed |
| 4 | Cross-row Shift+click broken | Medium | Design limitation, mitigated by presets |
| 5 | Refresh button doesn't sync per-key colors | Low-Medium | Missing feature |
| 6 | Blocking `alert()` calls (3 remaining) | Low | Code quality |
| 7 | Console logging bypasses Logger (3 files) | Low | Code quality |
| 8 | ESLint fast-refresh errors (2 files) | Low | Dev experience |
| 9 | ESLint dep array warnings (3 locations) | Low | Potential stale closures |
| 10 | Per-key restore race condition | Low | Edge case |
| 11 | Keycode verify failure silent | Low | UX gap |
| 12 | No auto-snapshot on config restore | Low | UX gap |
| 13 | Layer selector in lighting mode misleading | Low | UX confusion |
