// pages/api/submit-selection.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const {
    user_id,
    fixture_id,
    fixture_starting_at,
    team_a_ids,
    team_a_names,
    team_b_ids,
    team_b_names
  } = req.body;

  if (
    !user_id ||
    !fixture_id ||
    !fixture_starting_at ||
    !Array.isArray(team_a_ids) ||
    !Array.isArray(team_b_ids)
  ) {
    return res.status(400).json({ message: 'Missing or invalid parameters' });
  }

  // Server-side lock check
  const now = new Date();
  // fetch manual override flag from DB
  const { data: overrideRow, error: overrideErr } = await supabaseAdmin
    .from('selection_lock_override')
    .select('enabled')
    .eq('id', true)
    .single();
  const overrideEnabled = !overrideErr && overrideRow?.enabled;

  if (!overrideEnabled && new Date(fixture_starting_at) <= now) {
    return res.status(400).json({ message: 'Match has already started. Selections are closed.' });
  }

  try {
    // Check existing selection
    const { data: existing, error: selErr } = await supabaseAdmin
      .from('player_selections')
      .select('id')
      .eq('user_id', user_id)
      .eq('fixture_id', fixture_id);

    if (selErr) throw selErr;

    // Treat first selection as final: block resubmission
    if (existing && existing.length > 0) {
      return res.status(400).json({ message: 'Selection already submitted. Selections cannot be changed.' });
    }

    // Insert new selection
    const { data: insertData, error: insertErr } = await supabaseAdmin
      .from('player_selections')
      .insert([
        {
          user_id,
          fixture_id,
          team_a_ids,
          team_a_names,
          team_b_ids,
          team_b_names,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (insertErr) throw insertErr;
    return res.status(200).json({ data: insertData[0] });
  } catch (error) {
    console.error('Error in submit-selection:', error);
    return res.status(500).json({ message: error.message });
  }
}
