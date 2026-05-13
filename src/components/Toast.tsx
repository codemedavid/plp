import { useEffect } from 'react';
import { X } from 'lucide-react';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  onClose: () => void;
  duration?: number; // ms; 0 = sticky
}

const variantClasses: Record<ToastVariant, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
};

export default function Toast({ message, variant = 'info', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (duration === 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [duration, onClose]);

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[90%] border rounded-lg shadow-lg px-4 py-3 flex items-start gap-3 ${variantClasses[variant]}`}
    >
      <span className="flex-1 text-sm leading-snug">{message}</span>
      <button onClick={onClose} aria-label="Dismiss" className="p-0.5 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
