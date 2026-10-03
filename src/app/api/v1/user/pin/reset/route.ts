import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/v1/user/pin/reset
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    // Generate fresh 4-digit PIN
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();

    await db
      .update(users)
      .set({
        loginPin: newPin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return apiSuccess({
      success: true,
      loginPin: newPin,
      message: 'PIN successfully reset',
    });
  } catch (err: any) {
    console.error('Error resetting login PIN:', err);
    return apiError('Failed to reset login PIN', 500);
  }
}
