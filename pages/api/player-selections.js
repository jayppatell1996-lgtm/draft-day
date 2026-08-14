import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    // Get a user's selection for a fixture
    const { user_id, fixture_id } = req.query;
    if (!user_id || !fixture_id) {
      return res.status(400).json({ message: 'Missing user_id or fixture_id' });
    }
    const { data, error } = await supabase
      .from('player_selections')
      .select('*')
      .eq('user_id', user_id)
      .eq('fixture_id', fixture_id);
    if (error) return res.status(500).json({ message: error.message });
    return res.status(200).json({ selection: data && data.length > 0 ? data[0] : null });
  }

  res.status(405).json({ message: 'Method not allowed' });
}
