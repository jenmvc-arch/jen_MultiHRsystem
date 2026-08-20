import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  X,
} from 'lucide-react';

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';
export type DialogTone = 'danger' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: FeedbackTone;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  type?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | boolean | Promise<void | boolean>;
}

export interface InfoOptions {
  title: string;
  message: string;
  acknowledgeLabel?: string;
}

export interface FeedbackSystem {
  showToast: (options: ToastOptions) => string;
  showSuccess: (message: string, title?: string) => string;
  showError: (message: string, title?: string) => string;
  showWarning: (message: string, title?: string) => string;
  showInfo: (message: string, title?: string) => string;
  dismissToast: (id: string) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
  showWarningDialog: (options: Omit<ConfirmOptions, 'type'>) => Promise<boolean>;
  showInfoModal: (options: InfoOptions) => Promise<void>;
}

interface ToastRecord {
  id: string;
  title: string;
  message: string;
  type: FeedbackTone;
}

type DialogState =
  | {
      kind: 'confirm';
      options: ConfirmOptions;
      resolve: (confirmed: boolean) => void;
    }
  | {
      kind: 'info';
      options: InfoOptions;
      resolve: () => void;
    };

const FeedbackContext = createContext<FeedbackSystem | null>(null);

const DEFAULT_TOAST_DURATION = 4_000;

const toneConfig: Record<FeedbackTone, {
  label: string;
  icon: typeof CheckCircle2;
  iconClass: string;
  borderClass: string;
  accentClass: string;
}> = {
  success: {
    label: 'Success',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    borderClass: 'border-emerald-200',
    accentClass: 'bg-emerald-500',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    iconClass: 'text-red-600',
    borderClass: 'border-red-200',
    accentClass: 'bg-red-500',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    borderClass: 'border-amber-200',
    accentClass: 'bg-amber-500',
  },
  info: {
    label: 'Information',
    icon: Info,
    iconClass: 'text-blue-600',
    borderClass: 'border-blue-200',
    accentClass: 'bg-blue-500',
  },
};

const dialogToneConfig: Record<DialogTone, {
  icon: typeof AlertCircle;
  iconClass: string;
  iconSurfaceClass: string;
  confirmClass: string;
}> = {
  danger: {
    icon: AlertCircle,
    iconClass: 'text-red-600',
    iconSurfaceClass: 'bg-red-50',
    confirmClass: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    iconSurfaceClass: 'bg-amber-50',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-300',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-600',
    iconSurfaceClass: 'bg-blue-50',
    confirmClass: 'bg-primary hover:bg-primary-container focus-visible:ring-red-200',
  },
};

const titleForTone = (type: FeedbackTone) => toneConfig[type].label;

const normalizeErrorMessage = (error: unknown) => (
  error instanceof Error ? error.message : String(error || 'The action could not be completed.')
);

const getFocusableElements = (root: HTMLElement) => (
  Array.from(root.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ))
);

function FeedbackDialog({
  state,
  onCancel,
  onConfirm,
}: {
  state: DialogState;
  onCancel: () => void;
  onConfirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isInfo = state.kind === 'info';
  const tone = isInfo ? 'info' : state.options.type || 'danger';
  const config = dialogToneConfig[tone];
  const Icon = config.icon;
  const title = isInfo ? state.options.title : state.options.title;
  const message = isInfo ? state.options.message : state.options.message;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = getFocusableElements(dialog);
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isProcessing) {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;
      const elements = getFocusableElements(dialog);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, onCancel]);

  const handleConfirm = async () => {
    if (isProcessing || isInfo) return;
    setIsProcessing(true);
    const shouldClose = await onConfirm(state.options);
    if (!shouldClose) setIsProcessing(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-border bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby="feedback-dialog-description"
      >
        <div className="flex items-start gap-3 border-b border-neutral-border px-5 py-4">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconSurfaceClass}`}>
            <Icon className={`h-5 w-5 ${config.iconClass}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="feedback-dialog-title" className="text-base font-bold text-on-background">
              {title}
            </h2>
            <p id="feedback-dialog-description" className="mt-1 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-neutral-border bg-surface-container-lowest px-5 py-4 sm:flex-row sm:justify-end">
          {isInfo ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
            >
              {state.options.acknowledgeLabel || 'Understood'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                autoFocus
                className="rounded-lg border border-neutral-border bg-white px-4 py-2.5 text-sm font-semibold text-on-background transition-colors hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state.options.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isProcessing}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${config.confirmClass}`}
              >
                {isProcessing && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isProcessing ? 'Processing...' : (state.options.confirmLabel || 'Confirm')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function GlobalFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const toastKeysRef = useRef(new Set<string>());
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => {
      const removed = current.find((toast) => toast.id === id);
      if (removed) {
        toastKeysRef.current.delete(`${removed.type}:${removed.title}:${removed.message}`);
      }
      return current.filter((toast) => toast.id !== id);
    });
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const type = options.type || 'info';
    const title = options.title || titleForTone(type);
    const message = options.message.trim();
    if (!message) return '';

    const key = `${type}:${title}:${message}`;
    if (toastKeysRef.current.has(key)) return '';

    toastKeysRef.current.add(key);
    const id = `feedback-toast-${toastIdRef.current++}`;
    setToasts((current) => [...current, { id, title, message, type }]);

    window.setTimeout(() => dismissToast(id), options.duration || DEFAULT_TOAST_DURATION);
    return id;
  }, [dismissToast]);

  const showSuccess = useCallback((message: string, title?: string) => (
    showToast({ message, title, type: 'success' })
  ), [showToast]);

  const showError = useCallback((message: string, title?: string) => (
    showToast({ message, title, type: 'error' })
  ), [showToast]);

  const showWarning = useCallback((message: string, title?: string) => (
    showToast({ message, title, type: 'warning' })
  ), [showToast]);

  const showInfo = useCallback((message: string, title?: string) => (
    showToast({ message, title, type: 'info' })
  ), [showToast]);

  const confirmAction = useCallback((options: ConfirmOptions) => (
    new Promise<boolean>((resolve) => {
      setDialog({
        kind: 'confirm',
        options,
        resolve,
      });
    })
  ), []);

  const showWarningDialog = useCallback((options: Omit<ConfirmOptions, 'type'>) => (
    confirmAction({ ...options, type: 'warning' })
  ), [confirmAction]);

  const showInfoModal = useCallback((options: InfoOptions) => (
    new Promise<void>((resolve) => {
      setDialog({
        kind: 'info',
        options,
        resolve,
      });
    })
  ), []);

  const handleDialogCancel = useCallback(() => {
    setDialog((current) => {
      if (!current) return null;
      current.resolve(current.kind === 'confirm' ? false : undefined);
      return null;
    });
  }, []);

  const handleDialogConfirm = useCallback(async (options: ConfirmOptions) => {
    try {
      const result = await options.onConfirm?.();
      if (result === false) return false;
      setDialog((current) => {
        if (current?.kind === 'confirm') current.resolve(true);
        return null;
      });
      return true;
    } catch (error) {
      showError(normalizeErrorMessage(error), 'Action Failed');
      return false;
    }
  }, [showError]);

  const feedbackValue: FeedbackSystem = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    confirmAction,
    showWarningDialog,
    showInfoModal,
  };

  return (
    <FeedbackContext.Provider value={feedbackValue}>
      {children}

      <div
        className="pointer-events-none fixed right-4 top-4 z-[110] flex w-[min(24rem,calc(100vw-2rem))] max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const config = toneConfig[toast.type];
          const Icon = config.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative overflow-hidden rounded-xl border bg-white p-4 pr-10 shadow-xl ${config.borderClass} animate-in slide-in-from-right-4 duration-200`}
              role={toast.type === 'error' ? 'alert' : 'status'}
            >
              <div className={`absolute inset-y-0 left-0 w-1 ${config.accentClass}`} />
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold leading-tight text-on-background">{toast.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{toast.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="absolute right-3 top-3 rounded-md p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-background"
                aria-label={`Close ${toast.title} notification`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {dialog && (
        <FeedbackDialog
          state={dialog}
          onCancel={handleDialogCancel}
          onConfirm={handleDialogConfirm}
        />
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside GlobalFeedbackProvider');
  }
  return context;
}
