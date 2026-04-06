import { useState, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = '确认', cancelLabel = '取消', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded text-white ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook for confirm dialogs */
export function useConfirm() {
  const [state, setState] = useState<{ open: boolean; title: string; message: string; variant: 'danger' | 'default'; resolver: ((v: boolean) => void) | null }>({
    open: false, title: '', message: '', variant: 'default', resolver: null,
  });

  const confirm = (title: string, message: string, variant: 'danger' | 'default' = 'default') => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, title, message, variant, resolver: resolve });
    });
  };

  const handleConfirm = () => {
    state.resolver?.(true);
    setState({ open: false, title: '', message: '', variant: 'default', resolver: null });
  };

  const handleCancel = () => {
    state.resolver?.(false);
    setState({ open: false, title: '', message: '', variant: 'default', resolver: null });
  };

  const dialog = state.open ? (
    <ConfirmDialog open={state.open} title={state.title} message={state.message} variant={state.variant} onConfirm={handleConfirm} onCancel={handleCancel} />
  ) : null;

  return { confirm, dialog };
}
