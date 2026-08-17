import { useEffect, useState } from 'react';

function Field({ label, name, value, onChange, type = 'text', step, min, max }) {
  return (
    <label className="block text-sm text-zinc-300">
      {label}
      <input
        type={type}
        step={step}
        min={min}
        max={max}
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
      />
    </label>
  );
}

export default function AdminLeagueSettings({ disabled, onMessage, onError }) {
  const [form, setForm] = useState({
    name: '',
    seasonLabel: '',
    salaryCap: 120,
    maxTeams: 12,
    teamCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/league-settings', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load league settings');
      setForm({
        name: data.settings.name,
        seasonLabel: data.settings.seasonLabel,
        salaryCap: data.settings.salaryCap,
        maxTeams: data.settings.maxTeams,
        teamCount: data.settings.teamCount,
      });
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'name' || name === 'seasonLabel' ? value : Number(value),
    }));
  }

  async function saveSettings() {
    setBusy(true);
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/league-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save league settings');
      setForm((prev) => ({ ...prev, teamCount: data.settings.teamCount ?? prev.teamCount }));
      onMessage(data.message || 'League settings saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading league settings…</div>
    );
  }

  return (
    <div className="surface-card mt-6 p-4">
      <h2 className="text-sm font-semibold text-white">League settings</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Season label, team cap, and salary cap. Max teams cannot go below registered teams (
        {form.teamCount}).
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="League name" name="name" value={form.name} onChange={handleChange} />
        <Field label="Season label" name="seasonLabel" value={form.seasonLabel} onChange={handleChange} />
        <Field
          label="Salary cap (credits)"
          name="salaryCap"
          type="number"
          step="0.5"
          min={1}
          value={form.salaryCap}
          onChange={handleChange}
        />
        <Field
          label="Max teams (2–12)"
          name="maxTeams"
          type="number"
          min={2}
          max={12}
          value={form.maxTeams}
          onChange={handleChange}
        />
      </div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={saveSettings}
        className="btn-primary mt-4"
      >
        {busy ? 'Saving…' : 'Save league settings'}
      </button>
    </div>
  );
}
