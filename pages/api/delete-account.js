import { getServerAuthSession } from '../../lib/getServerAuthSession';
import { deleteUserAccount } from '../../lib/users';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerAuthSession(req, res);
    if (!session?.user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const deleted = await deleteUserAccount(session.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
