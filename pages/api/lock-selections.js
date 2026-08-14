// pages/api/lock-selections.js
import { createClient } from '@supabase/supabase-js';
import { lockSelections } from '../../lib/selectionLockOverride';

// Uses db override table selection_lock_override
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }
  // update overrideEnabled = false in DB
  const { data, error } = await supabaseAdmin
    .from('selection_lock_override')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('id', true)
    .single();
  if (error) {
    console.error('Error locking selections:', error);
    return res.status(500).json({ message: error.message });
  }
  // apply in-memory override
  lockSelections();
  return res.status(200).json({ message: 'Selections locked.' });
}
