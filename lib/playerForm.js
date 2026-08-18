/**
 * Form badge from recent scores vs season baseline.
 * Recent = average of last RECENT_MATCHES scored fixtures.
 */

export const RECENT_MATCHES = 3;

export const FORM_THRESHOLDS = {
  inFormRatio: 1.15,
  outOfFormRatio: 0.85,
};

export function computeFormBadge({ matches, averagePoints, recentAverage }) {
  if (!matches || matches === 0) {
    return { form: 'unknown', label: 'No data', score: 0 };
  }

  const seasonAvg = Number(averagePoints) || 0;
  const recent = recentAverage != null ? Number(recentAverage) : null;

  if (recent == null || matches < 2) {
    return { form: 'average', label: 'Average', score: 0 };
  }

  if (seasonAvg <= 0) {
    if (recent > 0) return { form: 'in_form', label: 'In form', score: 1 };
    return { form: 'average', label: 'Average', score: 0 };
  }

  const ratio = recent / seasonAvg;
  if (ratio >= FORM_THRESHOLDS.inFormRatio) {
    return { form: 'in_form', label: 'In form', score: 1 };
  }
  if (ratio <= FORM_THRESHOLDS.outOfFormRatio) {
    return { form: 'out_of_form', label: 'Out of form', score: -1 };
  }
  return { form: 'average', label: 'Average', score: 0 };
}

export function formBadgeClass(form) {
  switch (form) {
    case 'in_form':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'out_of_form':
      return 'border-red-500/30 bg-red-500/10 text-red-300';
    case 'average':
      return 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400';
    default:
      return 'border-zinc-600/30 bg-zinc-800/50 text-zinc-500';
  }
}
