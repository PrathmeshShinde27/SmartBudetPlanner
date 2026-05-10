import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api.js';

export default function PaymentTypesManager({ paymentTypes = [], onChanged, onToast }) {
  const [name, setName] = useState('');

  function notify(message, type = 'success') {
    if (onToast) onToast(message, type);
  }

  async function addPaymentType(event) {
    event.preventDefault();
    try {
      await api.post('/payment-types', { name });
      setName('');
      await onChanged?.();
      notify('Payment type added');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not add payment type', 'error');
    }
  }

  async function deletePaymentType(type) {
    try {
      await api.delete(`/payment-types/${type.id}`);
      await onChanged?.();
      notify('Payment type deleted');
    } catch (error) {
      notify(error.response?.data?.message || 'Could not delete payment type', 'error');
    }
  }

  return (
    <section className="panel p-4">
      <h3 className="font-semibold">Payment Types</h3>
      <p className="mt-1 text-sm text-zinc-500">Add payment options such as HDFC Credit Card, ICICI Debit Card, Wallet, or Bank Transfer.</p>
      <form onSubmit={addPaymentType} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="input"
          placeholder="Example: HDFC Credit Card"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn-primary" type="submit">Add payment type</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {paymentTypes.map((type) => (
          <span key={type.id} className="inline-flex items-center gap-2 rounded-md border border-sky-100 px-3 py-2 text-sm dark:border-sky-900/50">
            {type.name}
            <button
              className="inline-flex text-coral disabled:cursor-not-allowed disabled:opacity-40"
              disabled={type.isProtected}
              onClick={() => deletePaymentType(type)}
              title={type.isProtected ? 'Cash and UPI cannot be deleted' : `Delete ${type.name}`}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}
