import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { db } from '@/lib/drizzle';
import { users, parentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import { config } from '@/config/unifiedConfig';
import { authConfig } from '@/lib/auth.config';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  pin: z.string().optional(),
});

export const DEMO_ROLES: Record<string, { role: 'learner' | 'educator' | 'parent' | 'admin'; name: string; defaultPin?: string }> = {
  'student@unboundyou.com': { role: 'learner', name: 'Sumit Chourasia', defaultPin: '1234' },
  'educator@unboundyou.com': { role: 'educator', name: 'Dr. Rajesh Kumar' },
  'parent@unboundyou.com': { role: 'parent', name: 'Priya Sharma' },
  'admin@unboundyou.com': { role: 'admin', name: 'Super Admin' },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // ─── Google SSO (Whitelisted accounts only) ──────────────────────────────
    Google({
      clientId: config.auth.googleClientId!,
      clientSecret: config.auth.googleClientSecret!,
    }),

    // ─── Email + PIN (Learners/Students) or Email + Password (Admins) ────────
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password or PIN', type: 'password' },
        pin: { label: 'PIN', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const lowerEmail = email.toLowerCase().trim();
        const demoConfig = DEMO_ROLES[lowerEmail];
        const rawInput = ((credentials as any).pin || password || '').trim();

        let [user] = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            avatarUrl: users.avatarUrl,
            passwordHash: users.passwordHash,
            loginPin: users.loginPin,
            isActive: users.isActive,
          })
          .from(users)
          .where(eq(users.email, lowerEmail))
          .limit(1);

        // Auto-provision demo account if configured
        if (!user && demoConfig) {
          const [created] = await db
            .insert(users)
            .values({
              email: lowerEmail,
              name: demoConfig.name,
              role: demoConfig.role,
              loginPin: demoConfig.defaultPin || null,
              isActive: true,
            })
            .returning({
              id: users.id,
              email: users.email,
              name: users.name,
              role: users.role,
              avatarUrl: users.avatarUrl,
              passwordHash: users.passwordHash,
              loginPin: users.loginPin,
              isActive: users.isActive,
            });
          user = created;
        }

        if (!user || !user.isActive) return null;

        // 1. PIN-based check (Primary authentication for Students/Learners)
        if (user.loginPin && (rawInput === user.loginPin || rawInput === String(user.loginPin).trim())) {
          await db
            .update(users)
            .set({ lastLoginAt: new Date(), updatedAt: new Date() })
            .where(eq(users.id, user.id));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatarUrl,
          };
        }

        // 2. Demo role login bypass
        if (demoConfig) {
          const validDemo =
            rawInput === '1234' ||
            rawInput === '8128' ||
            rawInput === 'demopassword123' ||
            (demoConfig.defaultPin && rawInput === demoConfig.defaultPin);

          if (validDemo) {
            await db
              .update(users)
              .set({ lastLoginAt: new Date(), updatedAt: new Date() })
              .where(eq(users.id, user.id));

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              image: user.avatarUrl,
            };
          }
        }

        // 3. Password hash check (e.g. for Admin or password-based credentials)
        if (user.passwordHash) {
          const valid = await verify(user.passwordHash, password);
          if (valid) {
            await db
              .update(users)
              .set({ lastLoginAt: new Date(), updatedAt: new Date() })
              .where(eq(users.id, user.id));

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              image: user.avatarUrl,
            };
          }
        }

        return null;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    // ─── Whitelist enforcement on Google Sign-In ──────────────────────────────
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        // 1. Check if user already exists in `users`
        const [existingUser] = await db
          .select({ id: users.id, role: users.role, isActive: users.isActive })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser) {
          if (!existingUser.isActive) return false;
          return true;
        }

        // 2. Check if parent email is registered in `parent_profiles`
        const [existingParent] = await db
          .select({ id: parentProfiles.id })
          .from(parentProfiles)
          .where(eq(parentProfiles.email, email))
          .limit(1);

        if (existingParent) {
          return true;
        }

        // 3. Allow predefined demo accounts
        if (DEMO_ROLES[email]) {
          return true;
        }

        // Email is not in system whitelist -> reject with friendly code
        return '/login?error=NotWhitelisted';
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        const avatar = (user as any).image || (user as any).avatarUrl;
        if (avatar) {
          token.picture = avatar;
        }
      }

      // For Google OAuth: sync existing user or provision linked parent
      if (account?.provider === 'google' && token.email) {
        const lowerEmail = token.email.toLowerCase().trim();

        const [existing] = await db
          .select({ id: users.id, role: users.role, avatarUrl: users.avatarUrl, name: users.name })
          .from(users)
          .where(eq(users.email, lowerEmail))
          .limit(1);

        if (existing) {
          token.id = existing.id;
          token.role = existing.role;
          if (token.picture && token.picture !== existing.avatarUrl) {
            await db
              .update(users)
              .set({ avatarUrl: token.picture, updatedAt: new Date() })
              .where(eq(users.id, existing.id));
          } else if (!token.picture && existing.avatarUrl) {
            token.picture = existing.avatarUrl;
          }
          if (!token.name && existing.name) {
            token.name = existing.name;
          }
        } else {
          // Check if whitelisted parent
          const [parentRecord] = await db
            .select({ id: parentProfiles.id, name: parentProfiles.name })
            .from(parentProfiles)
            .where(eq(parentProfiles.email, lowerEmail))
            .limit(1);

          if (parentRecord) {
            try {
              const [newParentUser] = await db
                .insert(users)
                .values({
                  email: lowerEmail,
                  name: parentRecord.name || (token.name as string) || lowerEmail.split('@')[0],
                  avatarUrl: (token.picture as string) || null,
                  role: 'parent',
                  isActive: true,
                })
                .returning({ id: users.id, role: users.role, avatarUrl: users.avatarUrl });

              if (newParentUser) {
                await db
                  .update(parentProfiles)
                  .set({ userId: newParentUser.id })
                  .where(eq(parentProfiles.id, parentRecord.id));

                token.id = newParentUser.id;
                token.role = 'parent';
              }
            } catch (err) {
              console.error('Error provisioning whitelisted parent user:', err);
            }
          }
        }
      }

      // Fallback: If token.picture is missing but we have an email, retrieve from DB
      if (!token.picture && token.email) {
        try {
          const [u] = await db
            .select({ avatarUrl: users.avatarUrl, name: users.name })
            .from(users)
            .where(eq(users.email, token.email.toLowerCase().trim()))
            .limit(1);
          if (u?.avatarUrl) {
            token.picture = u.avatarUrl;
          }
          if (!token.name && u?.name) {
            token.name = u.name;
          }
        } catch {
          // ignore
        }
      }

      if (!token.role) {
        token.role = 'learner';
      }

      return token;
    },
  },
});
