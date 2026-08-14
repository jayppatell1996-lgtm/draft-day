import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user's JWT from the Authorization header
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    // Use anon key to get user info
    const supabaseAnon = createServerSupabaseClient(true);
    const {
      data: { user },
      error: userError,
    } = await supabaseAnon.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ message: 'User not found', userError });
    }

    // Use service role to delete from auth.users
    const supabase = createServerSupabaseClient(false);
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return res.status(500).json({ message: 'Failed to delete user', deleteErr });
    }

    return res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
