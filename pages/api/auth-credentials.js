export default async function handler(req, res) {
  return res.status(410).json({
    message: 'Deprecated. Use NextAuth at /api/auth/signin and /api/auth/signup instead.',
  });
}
