import { getServerSession } from 'next-auth/next';
import { authOptions } from './authOptions';

export async function getServerAuthSession(req, res) {
  return getServerSession(req, res, authOptions);
}
