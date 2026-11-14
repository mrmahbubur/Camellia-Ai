import React from 'react';
import { AlertTriangle, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { ModelCatalogItem } from '../types/chat';

interface PaidModelConfirmModalProps {
  isOpen: boolean;
  model: ModelCatalogItem | null;
  onConfirm: () => void;
  onSwitchToFree?: () => void;
  onCancel: () => void;
}

export const PaidModelConfirmModal: React.FC<PaidModelConfirmModalProps> = ({
  isOpen,
  model,
  onConfirm,
  onSwitchToFree,
  onCancel
}) => {
  if (!isOpen || !model) return null;

  const isPaid = model.pricingTier === 'paid';
  const tierLabel = isPaid ? 'Paid API model' : 'Price not verified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paid-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1522] border border-slate-200 dark:border-white/12 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="paid-confirm-title" className="text-base font-semibold tracking-tight">
                Confirm paid model request
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {model.name} · {model.provider} · {tierLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel paid model request"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2 border-y border-slate-200 dark:border-white/10 py-3.5">
          <p>
            This request will be processed by <strong className="text-slate-900 dark:text-white capitalize">{model.provider}</strong>{' '}
            using <strong className="text-slate-900 dark:text-white">{model.name}</strong> ({model.pricingNote}).
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            API usage may incur charges to the app owner account. Camellia never silently routes free selections to paid models.
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>

          {onSwitchToFree && (
            <button
              type="button"
              onClick={onSwitchToFree}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-teal-500/30 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Use Free Model</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Continue &amp; Send</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
