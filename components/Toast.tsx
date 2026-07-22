import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
    id: string;
    text: string;
    type: ToastType;
}

interface ToastContainerProps {
    toasts: ToastMessage[];
    onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">
            {toasts.map((toast) => {
                const isSuccess = toast.type === 'success';
                const isError = toast.type === 'error';
                const isWarning = toast.type === 'warning';

                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
                            isSuccess
                                ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-100'
                                : isError
                                ? 'border-red-500/30 bg-red-950/90 text-red-100'
                                : isWarning
                                ? 'border-amber-500/30 bg-amber-950/90 text-amber-100'
                                : 'border-indigo-500/30 bg-slate-900/90 text-indigo-100'
                        }`}
                    >
                        <div className="mt-0.5 shrink-0">
                            {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                            {isError && <XCircle className="h-5 w-5 text-red-400" />}
                            {isWarning && <AlertTriangle className="h-5 w-5 text-amber-400" />}
                            {!isSuccess && !isError && !isWarning && <Info className="h-5 w-5 text-indigo-400" />}
                        </div>

                        <div className="flex-1 text-xs font-medium leading-relaxed">
                            {toast.text}
                        </div>

                        <button
                            onClick={() => onClose(toast.id)}
                            className="shrink-0 rounded p-1 text-gray-400 hover:text-white hover:bg-white/10 transition"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
