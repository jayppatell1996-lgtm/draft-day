import { createServerSupabaseClient } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { mode, email, password, firstName, lastName } = req.body;
  const supabase = createServerSupabaseClient();

  try {
    if (mode === 'login') {
      // Login
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('[Login] signInWithPassword result:', data, error);
      if (error) throw error;
      // Log login
      await supabase.from('login_audit').insert([
        { user_id: data.user.id, email, status: 'LOGIN_SUCCESS', created_at: new Date().toISOString() },
      ]);
      return res.status(200).json({ user: data.user });
    } else if (mode === 'signup') {
      // Signup
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Optionally log signup (not required for user creation)
      await supabase.from('login_audit').insert([
        { user_id: data.user.id, email, status: 'SIGNUP_COMPLETE', created_at: new Date().toISOString() },
      ]);
      return res.status(200).json({ user: data.user });
    } else {
      return res.status(400).json({ message: 'Invalid mode' });
    }
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}
