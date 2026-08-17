import { useEffect, useState } from 'react';

export default function AdminSquadStructure({ disabled, onMessage, onError }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadStructure();
  }, []);

  async function loadStructure() {
    setLoading(true);
    onError('');
    try {
      const res = await fetch('/api/admin/squad-structure', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load squad structure');
      setSlots(data.slots || []);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateSlot(index, value) {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, requiredCount: value === '' ? '' : Number(value) } : slot
      )
    );
  }

  const playingTotal = slots
    .filter((s) => s.isPlaying)
    .reduce((sum, s) => sum + (Number(s.requiredCount) || 0), 0);
  const benchTotal = slots
    .filter((s) => !s.isPlaying)
    .reduce((sum, s) => sum + (Number(s.requiredCount) || 0), 0);

  async function saveStructure() {
    setBusy(true);
    onError('');
    onMessage('');
    try {
      const res = await fetch('/api/admin/squad-structure', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save squad structure');
      setSlots(data.slots || []);
      onMessage(data.message || 'Squad structure saved.');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="surface-card mt-6 p-4 text-sm text-zinc-400">Loading squad structure…</div>
    );
  }

  return (
    <div className="surface-card mt-6 p-4">
      <h2 className="text-sm font-semibold text-white">Squad structure</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Slot counts must total 12 playing + 4 bench. Existing squads may need manual fixes if counts change.
      </p>
      <div className="mt-4 space-y-2">
        {slots.map((slot, index) => (
          <label key={`${slot.slotType}-${slot.isPlaying}`} className="flex items-center justify-between gap-4 text-sm text-zinc-300">
            <span>
              {slot.slotType}
              <span className="ml-2 text-xs text-zinc-500">
                {slot.isPlaying ? 'Playing' : 'Bench'}
              </span>
            </span>
            <input
              type="number"
              min={0}
              value={slot.requiredCount}
              onChange={(e) => updateSlot(index, e.target.value)}
              className="w-20 rounded-lg border border-white/10 bg-surface-950 px-2 py-1 text-sm"
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Totals: {playingTotal} playing · {benchTotal} bench
      </p>
      <button type="button" disabled={disabled || busy} onClick={saveStructure} className="btn-primary mt-4">
        {busy ? 'Saving…' : 'Save squad structure'}
      </button>
    </div>
  );
}
