import { useState, useRef } from 'react';
// import { hid } from '../../services/HIDService';

export function RapidTriggerControl() {
    const [enabled, setEnabled] = useState(true);
    const [sensitivity, setSensitivity] = useState(20); // 0.2mm * 100
    const lastSentRef = useRef<number>(0);

    const handleToggle = () => {
        const newState = !enabled;
        setEnabled(newState);
        console.log("Rapid Trigger Toggle:", newState);
        // hid.setRapidTrigger(newState, sensitivity);
    };

    const handleSensitivityChange = (val: number) => {
        setSensitivity(val);
        // Throttle
        const now = Date.now();
        if (now - lastSentRef.current > 50) {
            console.log("Rapid Trigger Sensitivity:", val);
            // hid.setRapidTrigger(enabled, val).catch(console.error);
            lastSentRef.current = now;
        }
    };

    return (
        <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-text-primary">Rapid Trigger Mode</h3>
                    <p className="text-[10px] text-text-muted">Analog actuation</p>
                </div>
                <button
                    onClick={handleToggle}
                    className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-surface-highlight border border-text-muted'}`}
                >
                    <div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
                </button>
            </div>

            {enabled && (
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-mono text-text-secondary">
                        <span>0.1mm</span>
                        <span className="text-primary font-bold">{(sensitivity / 100).toFixed(1)}mm</span>
                        <span>4.0mm</span>
                    </div>
                    <input
                        type="range"
                        min="10" max="400"
                        value={sensitivity}
                        onChange={(e) => handleSensitivityChange(Number(e.target.value))}
                        className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-glow"
                    />
                    <p className="text-[10px] text-text-muted leading-tight border-l-2 border-primary/50 pl-2">
                        Dynamically resets the key based on travel distance rather than a fixed point.
                    </p>
                </div>
            )}
        </div>
    );
}
