import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Remove the Supabase auth cookie (if using cookies for session/JWT)
  // Adjust cookie name if you use a custom one
  res.setHeader('Set-Cookie', serialize('sb-access-token', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  }));
  res.setHeader('Set-Cookie', serialize('sb-refresh-token', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    sameSite: 'lax',
  }));

  // You may need to clear other cookies depending on your auth strategy

  res.status(200).json({ message: 'Logged out' });
}
