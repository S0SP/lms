import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'development_secret_key_32_characters_minimum_lms_2026',
  providers: [], // Populated in auth.ts
  session: { strategy: 'jwt' },
  callbacks: {
    // Attach role and avatar/picture to JWT token
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        const avatar = (user as any).image || (user as any).avatarUrl;
        if (avatar) {
          token.picture = avatar;
        }
      }
      return token;
    },
    // Expose id, role, and avatar in the session object (accessible via useSession / auth())
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        const avatar = (token.picture as string) || (token as any).avatarUrl;
        if (avatar) {
          session.user.image = avatar;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
} satisfies NextAuthConfig;
