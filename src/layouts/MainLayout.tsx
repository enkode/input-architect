import React, { useState } from 'react';
import { PanelLeft, PanelRight, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface MainLayoutProps {
    children?: React.ReactNode;
    sidebarLeft?: React.ReactNode;
    sidebarRight?: React.ReactNode;
}

export function MainLayout({ children, sidebarLeft, sidebarRight }: MainLayoutProps) {
    const [leftOpen, setLeftOpen] = useState(true);
    const [rightOpen, setRightOpen] = useState(true);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-background text-text-primary">
            {/* Left Sidebar */}
            <aside
                className={clsx(
                    "flex-shrink-0 border-r border-border bg-surface transition-all duration-300 ease-in-out relative flex flex-col",
                    leftOpen ? "w-80 translate-x-0" : "w-12 -translate-x-0"
                )}
            >
                <div className="h-12 border-b border-border flex items-center justify-between px-3">
                    {leftOpen && <span className="text-xs font-bold tracking-widest text-text-muted uppercase">Modules</span>}
                    <button onClick={() => setLeftOpen(!leftOpen)} className="p-1 hover:text-primary transition-colors">
                        <PanelLeft size={16} />
                    </button>
                </div>
                <div className={clsx("flex-1 overflow-auto opacity-100 transition-opacity", !leftOpen && "opacity-0 invisible")}>
                    {sidebarLeft}
                </div>
                {!leftOpen && (
                    <div className="absolute top-14 bottom-0 left-0 right-0 flex flex-col items-center py-4 gap-4">
                        {/* Collapsed icons could go here */}
                        <div className="w-1 h-8 bg-border rounded-full" />
                    </div>
                )}
            </aside>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col min-w-0 bg-background relative z-0">
                <header className="h-12 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold tracking-tight text-text-primary">FRAMEWORK INPUT ARCHITECT</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-surface rounded text-text-secondary hover:text-primary transition-colors">
                            <Settings size={18} />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-hidden relative bg-[url('/grid.svg')] bg-cyber-grid bg-fixed">
                    <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background/80 pointer-events-none" />
                    {children}
                </div>
            </main>

            {/* Right Sidebar */}
            <aside
                className={clsx(
                    "flex-shrink-0 border-l border-border bg-surface transition-all duration-300 ease-in-out flex flex-col",
                    rightOpen ? "w-96 translate-x-0" : "w-12 translate-x-0"
                )}
            >
                <div className="h-12 border-b border-border flex items-center justify-between px-3">
                    <button onClick={() => setRightOpen(!rightOpen)} className="p-1 hover:text-primary transition-colors">
                        <PanelRight size={16} />
                    </button>
                    {rightOpen && <span className="text-xs font-bold tracking-widest text-text-muted uppercase">Inspector</span>}
                </div>
                <div className={clsx("flex-1 overflow-auto opacity-100 transition-opacity", !rightOpen && "opacity-0 invisible")}>
                    {sidebarRight}
                </div>
            </aside>
        </div>
    );
}
