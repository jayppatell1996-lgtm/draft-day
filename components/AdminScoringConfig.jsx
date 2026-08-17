import { useEffect, useState } from 'react';
import { defaultScoringForm } from '../lib/scoringDefaults';

function Field({ label, name, value, onChange, step = 1 }) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type="number"
        step={step}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function AdminScoringConfig({ disabled, onMessage, onError }) {
  const [form, setForm] = useState(defaultScoringForm());
  const [isDefault, setIsDefault] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/scoring-config', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load scoring config');
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

  async function saveConfig() {
    setBusy('save');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/scoring-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save scoring config');
      setForm(data.form);
      setIsDefault(Boolean(data.isDefault));
      onMessage(data.message || 'Scoring rules saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function resetDefaults() {
    if (!window.confirm('Reset all scoring rules to CPL defaults?')) return;
    setBusy('reset');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/scoring-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset scoring config');
      setForm(data.form);
      setIsDefault(true);
      onMessage(data.message || 'Scoring rules reset.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading scoring rules…</div>
    );
  }

  return (
    <div className="surface-card mt-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Scoring rules</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Adjust how player stats convert to fantasy points. After saving, use
            <strong className="font-medium text-zinc-300"> Recalculate round</strong> below to
            apply changes to existing fixture data.
          </p>
          {isDefault ? (
            <p className="mt-2 text-xs text-zinc-500">Using CPL defaults.</p>
          ) : (
            <p className="mt-2 text-xs text-accent-400">Custom scoring rules active.</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Batting</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Points per run" name="pointsPerRun" value={form.pointsPerRun} onChange={handleChange} step="0.5" />
            <Field label="Points per four" name="pointsPerFour" value={form.pointsPerFour} onChange={handleChange} step="0.5" />
            <Field label="Points per six" name="pointsPerSix" value={form.pointsPerSix} onChange={handleChange} step="0.5" />
            <Field label="SR bonus min runs" name="srMinRuns" value={form.srMinRuns} onChange={handleChange} />
            <Field label="50-run milestone" name="milestone50" value={form.milestone50} onChange={handleChange} />
            <Field label="100-run milestone" name="milestone100" value={form.milestone100} onChange={handleChange} />
            <Field label="125-run milestone" name="milestone125" value={form.milestone125} onChange={handleChange} />
            <Field label="SR 170+ bonus" name="srBonus170" value={form.srBonus170} onChange={handleChange} />
            <Field label="SR 160+ bonus" name="srBonus160" value={form.srBonus160} onChange={handleChange} />
            <Field label="SR 150+ bonus" name="srBonus150" value={form.srBonus150} onChange={handleChange} />
            <Field label="SR 140+ bonus" name="srBonus140" value={form.srBonus140} onChange={handleChange} />
            <Field label="SR 120+ bonus" name="srBonus120" value={form.srBonus120} onChange={handleChange} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bowling</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Points per wicket" name="pointsPerWicket" value={form.pointsPerWicket} onChange={handleChange} />
            <Field label="Points per maiden" name="pointsPerMaiden" value={form.pointsPerMaiden} onChange={handleChange} />
            <Field label="3-wicket haul bonus" name="threeWicketBonus" value={form.threeWicketBonus} onChange={handleChange} />
            <Field label="5-wicket haul bonus" name="fiveWicketBonus" value={form.fiveWicketBonus} onChange={handleChange} />
            <Field label="Economy under 4" name="economyUnder4" value={form.economyUnder4} onChange={handleChange} />
            <Field label="Economy under 5" name="economyUnder5" value={form.economyUnder5} onChange={handleChange} />
            <Field label="Economy under 6" name="economyUnder6" value={form.economyUnder6} onChange={handleChange} />
            <Field label="Economy 8–10 penalty" name="economyUnder8" value={form.economyUnder8} onChange={handleChange} />
            <Field label="Economy 10+ penalty" name="economyOver10" value={form.economyOver10} onChange={handleChange} />
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Fielding & multipliers</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Catch" name="catch" value={form.catch} onChange={handleChange} />
            <Field label="Stumping" name="stumping" value={form.stumping} onChange={handleChange} />
            <Field label="Direct run out" name="runOutDirect" value={form.runOutDirect} onChange={handleChange} />
            <Field label="Indirect run out" name="runOutIndirect" value={form.runOutIndirect} onChange={handleChange} />
            <Field label="Man of the Match bonus" name="manOfMatchBonus" value={form.manOfMatchBonus} onChange={handleChange} />
            <Field label="Captain multiplier" name="captainMultiplier" value={form.captainMultiplier} onChange={handleChange} step="0.5" />
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={saveConfig}
          className="btn-primary"
        >
          {busy === 'save' ? 'Saving…' : 'Save scoring rules'}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(busy)}
          onClick={resetDefaults}
          className="btn-ghost"
        >
          {busy === 'reset' ? 'Resetting…' : 'Restore CPL defaults'}
        </button>
      </div>
    </div>
  );
}
