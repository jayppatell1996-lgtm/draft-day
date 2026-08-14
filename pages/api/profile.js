import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session from cookie (SSR safe)
    // You may need to adjust this depending on your Supabase auth setup
    // For now, we assume JWT is sent in the Authorization header (Bearer)
    const token = req.headers['authorization']?.split(' ')[1];
    console.log('[API /profile] Token:', token);
    if (!token) return res.status(401).json({ session: null, profile: null, debug: 'No token' });

    // Use anon key and url for user session operations
    const supabase = createServerSupabaseClient(true);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    console.log('[API /profile] Supabase user:', user, 'Error:', error);
    if (error || !user) return res.status(401).json({ session: null, profile: null, debug: 'No user or error', user, error });

    // Fetch profile from users table
    const { data: profile, error: profErr } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();
    console.log('[API /profile] Profile:', profile, 'Profile error:', profErr);
    if (profErr || !profile) return res.status(401).json({ session: { user }, profile: null, debug: 'Profile not found', profErr });

    res.status(200).json({ session: { user }, profile, debug: 'Success' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
