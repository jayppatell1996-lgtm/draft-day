import { useEffect, useState } from 'react';
import { defaultTradeRulesForm } from '../lib/tradeRulesDefaults';

function Field({ label, name, value, onChange }) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type="number"
        min={0}
        step={1}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function AdminTradeRules({ disabled, onMessage, onError, initialData }) {
  const [form, setForm] = useState(defaultTradeRulesForm());
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(!initialData);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm(initialData.form);
      setIsDefault(Boolean(initialData.isDefault));
      setLoading(false);
      return;
    }
    loadRules();
  }, [initialData]);

  async function loadRules() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/trade-rules', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load trade rules');
      setForm(data.form);
      setIsDefault(Boolean(data.isDefault));
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
  }

  async function saveRules() {
    setBusy('save');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/trade-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save trade rules');
      setForm(data.form);
      setIsDefault(Boolean(data.isDefault));
      onMessage(data.message || 'Trade rules saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function resetDefaults() {
    if (!window.confirm('Reset trade rules to defaults?')) return;
    setBusy('reset');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/trade-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset trade rules');
      setForm(data.form);
      setIsDefault(true);
      onMessage(data.message || 'Trade rules reset.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading trade rules…</div>
    );
  }

  return (
    <div className="surface-card mt-6 p-4">
      <h2 className="text-sm font-semibold text-white">Trade rules</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Free trades per H2H round, banking cap, and playoff allowances.
      </p>
      {isDefault ? (
        <p className="mt-2 text-xs text-zinc-500">Using default rules (3 free / 10 banked / 8 playoff).</p>
      ) : (
        <p className="mt-2 text-xs text-accent-400">Custom trade rules active.</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Free trades per round" name="freeTradesPerRound" value={form.freeTradesPerRound} onChange={handleChange} />
        <Field label="Max banked free trades" name="maxBankedFreeTrades" value={form.maxBankedFreeTrades} onChange={handleChange} />
        <Field label="Playoff trade allowance" name="playoffTradeAllowance" value={form.playoffTradeAllowance} onChange={handleChange} />
        <Field label="Playoff free trades" name="playoffFreeTrades" value={form.playoffFreeTrades} onChange={handleChange} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={disabled || Boolean(busy)} onClick={saveRules} className="btn-primary">
          {busy === 'save' ? 'Saving…' : 'Save trade rules'}
        </button>
        <button type="button" disabled={disabled || Boolean(busy)} onClick={resetDefaults} className="btn-ghost">
          {busy === 'reset' ? 'Resetting…' : 'Restore defaults'}
        </button>
      </div>
    </div>
  );
}
