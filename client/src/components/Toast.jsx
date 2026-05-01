import { CheckCircle2, XCircle } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      className={`fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-lg border p-3 text-sm shadow-lg ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100'
          : 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100'
      }`}
    >
      {isError ? <XCircle className="mt-0.5 shrink-0" size={18} /> : <CheckCircle2 className="mt-0.5 shrink-0" size={18} />}
      <p className="flex-1">{toast.message}</p>
      <button className="text-xs font-semibold opacity-70 hover:opacity-100" type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
