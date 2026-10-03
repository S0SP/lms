import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api';
import { sendPinReminderEmail } from '@/lib/email';
import { config } from '@/config/unifiedConfig';

const resendPinSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = resendPinSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message || 'Valid email required', 400);
    }

    const lowerEmail = parsed.data.email.toLowerCase().trim();

    // Look up user in database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        loginPin: users.loginPin,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, lowerEmail))
      .limit(1);

    if (!user) {
      return apiError('No account found with this email. Please contact UnboundYou administration.', 404);
    }

    if (!user.isActive) {
      return apiError('This account has been deactivated. Please contact support.', 403);
    }

    // If account is educator or parent, remind them to use Google SSO
    if (user.role === 'educator') {
      return apiError('Your educator account uses Google Sign In. Please click "Continue with Google".', 400);
    }

    if (user.role === 'parent') {
      return apiError('Your parent account uses Google Sign In. Please click "Continue with Google".', 400);
    }

    // Generate PIN if not set
    let pin = user.loginPin;
    if (!pin) {
      pin = Math.floor(1000 + Math.random() * 9000).toString();
      await db
        .update(users)
        .set({ loginPin: pin, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    // Send email with login PIN
    await sendPinReminderEmail({
      to: user.email,
      name: user.name,
      pin,
      loginUrl: `${config.appUrl}/login`,
    }).catch((err) => console.error('[resend-pin] Failed to send email:', err));

    return apiSuccess({
      success: true,
      message: 'Your 4-digit PIN has been emailed to you. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('[resend-pin] Error:', error);
    return apiError('Failed to process PIN request. Please try again.', 500);
  }
}
