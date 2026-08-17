import { getServerAuthSession } from './getServerAuthSession';

export async function requireAdmin(req, res) {
  const session = await getServerAuthSession(req, res);
  if (!session?.user?.teamId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  if (!session.user.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return session;
}
