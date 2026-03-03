import { Keyboard, Cpu, Calculator, Grid } from 'lucide-react';
import { clsx } from 'clsx';

interface ModuleListProps {
    onSelect?: (id: string, type: string) => void;
}

export function ModuleList({ onSelect }: ModuleListProps) {
    const modules = [
        { id: 'mkb', name: 'Main Keyboard', type: 'keyboard', status: 'connected', icon: Keyboard },
        { id: 'pad', name: 'Numpad', type: 'numpad', status: 'connected', icon: Calculator },
        { id: 'led-matrix-l', name: 'LED Matrix L', type: 'led-matrix', status: 'active', icon: Grid },
        { id: 'led-matrix-r', name: 'LED Matrix R', type: 'led-matrix', status: 'disconnected', icon: Grid },
        { id: 'mac', name: 'Macropad', type: 'macropad', status: 'disconnected', icon: Cpu },
    ];

    const handleModuleClick = async (mod: typeof modules[0]) => {
        // Notify parent
        if (onSelect) onSelect(mod.id, mod.type);

        if (mod.status === 'active') return;

        if (mod.type === 'keyboard' || mod.type === 'numpad') {
            // Trigger Generic HID connection/selection
            // In real app, we might want to specifically target this device
            console.log("Select/Connect HID", mod.id);
        } else {
            // Input Module (LED Matrix, etc)
            try {
                const { serial } = await import('../../services/SerialService');
                if (!serial.isConnected) {
                    const connected = await serial.requestPort();
                    if (connected) {
                        // Force refresh or state update (simplified)
                        console.log("Connected to Serial Module");
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
    };

    return (
        <div className="p-4 space-y-2">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest px-1 mb-2">Modules</h3>
            {modules.map((mod) => (
                <div
                    key={mod.id}
                    onClick={() => handleModuleClick(mod)}
                    className={clsx(
                        "p-3 rounded-md border flex items-center gap-3 cursor-pointer transition-all",
                        mod.status === 'active'
                            ? "bg-surface-highlight border-primary/50 shadow-glow"
                            : "bg-surface border-border hover:border-text-muted opacity-80 hover:opacity-100",
                        mod.status === 'disconnected' && "opacity-40 grayscale"
                    )}
                >
                    <div className={clsx("p-2 rounded bg-background", mod.status === 'active' ? "text-primary" : "text-text-muted")}>
                        <mod.icon size={18} />
                    </div>
                    <div>
                        <div className={clsx("text-sm font-semibold", mod.status === 'active' ? "text-text-primary" : "text-text-secondary")}>
                            {mod.name}
                        </div>
                        <div className="text-[10px] text-text-muted uppercase font-mono">
                            {mod.status === 'active' ? 'Active' : mod.status === 'connected' ? 'Connected' : 'Click to Pair'}
                        </div>
                    </div>
                    {mod.status === 'active' && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow" />
                    )}
                </div>
            ))}
        </div>
    );
}
