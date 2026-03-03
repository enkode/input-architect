import { clsx } from 'clsx';
import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';

interface LayerSelectorProps {
    selectedLayer: number;
    onLayerSelect: (layer: number) => void;
}

export function LayerSelector({ selectedLayer, onLayerSelect }: LayerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const layers = [0, 1, 2, 3, 4, 5];

    return (
        <div className="border-t border-border p-4">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 block">
                Active Layer
            </label>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-12 bg-surface-highlight border border-border rounded-lg flex items-center justify-between px-4 hover:border-primary transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Layers size={18} className="text-primary" />
                        <div className="flex flex-col items-start leading-none">
                            <span className="font-bold text-sm">Layer {selectedLayer}</span>
                            <span className="text-[10px] text-text-muted">{selectedLayer === 0 ? 'Base Layer' : `Custom Layer ${selectedLayer}`}</span>
                        </div>
                    </div>
                    <ChevronDown size={16} className={clsx("text-text-muted transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                    <div className="absolute bottom-full mb-2 left-0 w-full bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-20">
                        {layers.map((layer) => (
                            <button
                                key={layer}
                                onClick={() => {
                                    onLayerSelect(layer);
                                    setIsOpen(false);
                                }}
                                className={clsx(
                                    "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-surface-highlight",
                                    selectedLayer === layer ? "text-primary bg-surface-highlight/50" : "text-text-muted"
                                )}
                            >
                                <span className={clsx(
                                    "w-2 h-2 rounded-full",
                                    selectedLayer === layer ? "bg-primary" : "bg-transparent border border-text-muted"
                                )} />
                                <span className="text-sm font-medium">Layer {layer}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
