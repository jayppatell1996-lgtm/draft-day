import { useEffect, useState } from 'react';

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminLockTimes({ disabled, onMessage, onError, initialData }) {
  const [lockTimes, setLockTimes] = useState(initialData?.lockTimes ?? []);
  const [fixtures, setFixtures] = useState(initialData?.fixtures ?? []);
  const [form, setForm] = useState({
    fixtureId: initialData?.fixtures?.[0]?.id ?? '',
    franchiseExternalId: '',
    franchiseName: '',
    locksAt: '',
  });
  const [loading, setLoading] = useState(!initialData);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    if (initialData) {
      setLockTimes(initialData.lockTimes || []);
      setFixtures(initialData.fixtures || []);
      if (initialData.fixtures?.[0]) {
        setForm((prev) => ({ ...prev, fixtureId: initialData.fixtures[0].id }));
      }
      setLoading(false);
      return;
    }
    loadData();
  }, [initialData]);

  async function loadData() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/lock-times', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load lock times');
      setLockTimes(data.lockTimes || []);
      setFixtures(data.fixtures || []);
      if (data.fixtures?.[0] && !form.fixtureId) {
        setForm((prev) => ({ ...prev, fixtureId: data.fixtures[0].id }));
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFixtureChange(fixtureId) {
    const fixture = fixtures.find((f) => f.id === fixtureId);
    setForm((prev) => ({
      ...prev,
      fixtureId,
      franchiseExternalId: fixture?.localTeamExternalId ?? '',
      franchiseName: fixture?.localTeamName ?? '',
      locksAt: fixture?.startsAt ? toLocalInputValue(fixture.startsAt) : prev.locksAt,
    }));
  }

  async function saveLockTime(payload) {
    setBusy('save');
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/lock-times', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lock time');
      onMessage(data.message || 'Lock time saved.');
      await loadData();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function removeLockTime(id) {
    if (!window.confirm('Delete this lock time?')) return;
    setBusy(`delete-${id}`);
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/lock-times', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete lock time');
      onMessage(data.message || 'Lock time deleted.');
      await loadData();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading lock times…</div>
    );
  }

  return (
    <div className="surface-card mt-6 p-4">
      <h2 className="text-sm font-semibold text-white">Lock times</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Override franchise lock deadlines per fixture. Requires fixtures in the database (Phase 9 sync or manual seed).
      </p>

      {fixtures.length === 0 ? (
        <p className="mt-4 text-sm text-amber-300">No fixtures found — add fixtures before setting lock times.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Fixture
            <select
              value={form.fixtureId}
              onChange={(e) => handleFixtureChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
            >
              {fixtures.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.label} · {new Date(fixture.startsAt).toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">
            Franchise external ID
            <input
              type="number"
              value={form.franchiseExternalId}
              onChange={(e) => setForm((prev) => ({ ...prev, franchiseExternalId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Franchise name
            <input
              type="text"
              value={form.franchiseName}
              onChange={(e) => setForm((prev) => ({ ...prev, franchiseName: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm text-zinc-300 sm:col-span-2">
            Locks at
            <input
              type="datetime-local"
              value={form.locksAt}
              onChange={(e) => setForm((prev) => ({ ...prev, locksAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-surface-950 px-3 py-2 text-sm"
            />
          </label>
        </div>
      )}

      {fixtures.length > 0 && (
        <button
          type="button"
          disabled={disabled || busy === 'save'}
          onClick={() =>
            saveLockTime({
              fixtureId: form.fixtureId,
              franchiseExternalId: form.franchiseExternalId || null,
              franchiseName: form.franchiseName,
              locksAt: form.locksAt ? new Date(form.locksAt).toISOString() : null,
            })
          }
          className="btn-primary mt-4"
        >
          {busy === 'save' ? 'Saving…' : 'Add / update lock time'}
        </button>
      )}

      <div className="mt-6 table-scroll rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Franchise</th>
              <th className="px-3 py-2">Fixture</th>
              <th className="px-3 py-2">Locks at</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {lockTimes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-zinc-500">
                  No lock times configured.
                </td>
              </tr>
            ) : (
              lockTimes.map((lock) => (
                <tr key={lock.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-zinc-200">{lock.franchiseName}</td>
                  <td className="px-3 py-2 text-zinc-400">{lock.fixtureLabel}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {new Date(lock.locksAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={disabled || busy === `delete-${lock.id}`}
                      onClick={() => removeLockTime(lock.id)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
