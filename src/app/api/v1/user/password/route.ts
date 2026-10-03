import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verify, hash } from '@node-rs/argon2';

// POST /api/v1/user/password
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return apiError('New password must be at least 6 characters long');
    }

    if (newPassword !== confirmPassword) {
      return apiError('New passwords do not match');
    }

    // Retrieve active user password hash
    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return apiError('User not found', 404);
    }

    // If existing password hash exists, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return apiError('Current password is required');
      }
      const isValid = await verify(user.passwordHash, currentPassword);
      if (!isValid) {
        return apiError('Current password is incorrect', 400);
      }
    }

    // Hash new password using Argon2id
    const newHash = await hash(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return apiSuccess({ message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Error changing password:', err);
    return apiError('Failed to change password', 500);
  }
}
