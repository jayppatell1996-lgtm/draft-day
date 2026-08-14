import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyUserCredentials } from './users';
import { normalizeEmail, validateEmail, validatePassword } from './authValidation';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const emailResult = validateEmail(credentials?.email || '');
        if (!emailResult.ok) return null;

        const passwordResult = validatePassword(credentials?.password || '');
        if (!passwordResult.ok) return null;

        const user = await verifyUserCredentials(
          normalizeEmail(emailResult.value),
          passwordResult.value
        );
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          teamId: user.teamId,
          teamName: user.teamName,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.teamId = user.teamId;
        token.teamName = user.teamName;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub;
        session.user.teamId = token.teamId;
        session.user.teamName = token.teamName;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
