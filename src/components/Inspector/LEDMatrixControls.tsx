import { useState } from 'react';
import { serial } from '../../services/SerialService';
import { Lightbulb, Play, Pause, Zap } from 'lucide-react';

export function LEDMatrixControls() {
    const [brightness, setBrightness] = useState(50);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleBrightnessChange = async (val: number) => {
        setBrightness(val);
        if (serial.isConnected) {
            await serial.setBrightness(Math.floor(val * 2.55)); // 0-100 to 0-255
        }
    };

    const toggleAnimate = async () => {
        const newState = !isAnimating;
        setIsAnimating(newState);
        if (serial.isConnected) {
            await serial.setAnimate(newState);
        }
    };

    const setPattern = async (id: number) => {
        if (serial.isConnected) {
            await serial.setPattern(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb size={14} />
                    Global Brightness
                </h3>
                <input
                    type="range"
                    min="0" max="100"
                    value={brightness}
                    onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                    className="w-full h-1 bg-surface-highlight rounded-full appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>OFF</span>
                    <span>{brightness}%</span>
                </div>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} />
                        Patterns
                    </h3>
                    <button
                        onClick={toggleAnimate}
                        className={`p-1.5 rounded hover:bg-surface-highlight transition-colors ${isAnimating ? 'text-primary' : 'text-text-secondary'}`}
                        title={isAnimating ? "Pause Animation" : "Play Animation"}
                    >
                        {isAnimating ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {[
                        { id: 0x01, label: 'Gradient' },
                        { id: 0x02, label: 'Double Grad' },
                        { id: 0x03, label: 'Lotus H' },
                        { id: 0x04, label: 'ZigZag' },
                        { id: 0x05, label: 'Full On' },
                        { id: 0x07, label: 'Lotus V' },
                    ].map((pat) => (
                        <button
                            key={pat.id}
                            onClick={() => setPattern(pat.id)}
                            className="text-xs py-2 px-3 rounded bg-surface-highlight hover:bg-primary/20 hover:text-primary transition-colors border border-transparent hover:border-primary/30 text-left"
                        >
                            {pat.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
