import { useEffect, useState } from 'react';
import { formBadgeClass } from '../lib/playerForm';

function formatCountdown(ms) {
  if (ms == null || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function LockCountdown({ lock, className = '' }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!lock) {
      setLabel('');
      return undefined;
    }

    function tick() {
      if (lock.locked) {
        setLabel('Locked');
        return;
      }
      if (!lock.nextLockAt) {
        setLabel('');
        return;
      }
      const ms = new Date(lock.nextLockAt).getTime() - Date.now();
      if (ms <= 0) {
        setLabel('Locked');
        return;
      }
      setLabel(`Locks in ${formatCountdown(ms)}`);
    }

    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lock]);

  if (!label) return null;

  return (
    <span
      className={`text-xs ${lock?.locked ? 'text-red-400' : 'text-amber-300/90'} ${className}`}
    >
      {label}
    </span>
  );
}

export function OverseasBadge({ isOverseas, className = '' }) {
  if (!isOverseas) return null;
  return (
    <span
      className={`rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 ${className}`}
    >
      OS
    </span>
  );
}

export function FormBadge({ form, label, className = '' }) {
  if (!form || form === 'unknown') return null;
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${formBadgeClass(form)} ${className}`}
    >
      {label || form.replace(/_/g, ' ')}
    </span>
  );
}
