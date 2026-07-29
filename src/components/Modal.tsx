import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export function Modal({
  open, onClose, title, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx('relative z-10 w-full card shadow-pop animate-scale-in my-auto', width)}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
            <h3 className="text-lg text-cream-50">{title}</h3>
            <button className="btn-ghost -mr-2 !px-2" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-700 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
