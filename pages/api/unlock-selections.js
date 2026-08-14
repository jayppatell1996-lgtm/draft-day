// pages/api/unlock-selections.js
import { createClient } from '@supabase/supabase-js';
import { unlockSelections } from '../../lib/selectionLockOverride';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }
  // update overrideEnabled = true in DB
  const { data, error } = await supabaseAdmin
    .from('selection_lock_override')
    .update({ enabled: true, updated_at: new Date().toISOString() })
    .eq('id', true);
  // apply in-memory override
  unlockSelections();
  if (error) {
    console.error('Error unlocking selections:', error);
    return res.status(500).json({ message: error.message });
  }
  return res.status(200).json({ message: 'Selections unlocked.' });
}
