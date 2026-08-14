import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session from cookie or header (SSR safe)
    // You may need to adjust this depending on your Supabase auth setup
    // For now, we assume JWT is sent in the Authorization header (Bearer)
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ user: null });

    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ user: null });

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
