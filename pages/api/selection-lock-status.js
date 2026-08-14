// pages/api/selection-lock-status.js
import { createClient } from '@supabase/supabase-js';

// Admin client to read override flag
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }
  // Fetch override flag from DB
  const { data: row, error } = await supabaseAdmin
    .from('selection_lock_override')
    .select('enabled')
    .eq('id', true)
    .single();
  const overrideEnabled = !error && row?.enabled;
  return res.status(200).json({ overrideEnabled });
}
