import { getServerAuthSession } from '../../lib/getServerAuthSession';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user) {
      return res.status(401).json({ user: null });
    }

    res.status(200).json({
      user: {
        id: session.user.id,
        email: session.user.email,
        teamId: session.user.teamId,
        teamName: session.user.teamName,
        isAdmin: session.user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
