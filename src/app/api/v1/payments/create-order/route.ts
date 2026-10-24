import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { paymentTransactions } from '@/db/schema';
import { config } from '@/config/unifiedConfig';

const createOrderSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  courseId: z.string().uuid().optional(),
  enrollmentId: z.string().uuid().optional(),
  learnerId: z.string().uuid().optional(),
  purpose: z.string().default('course_purchase'),
  credits: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message, 400);
    }

    const { amount, currency, courseId, enrollmentId, learnerId, purpose, credits } = parsed.data;

    let razorpayOrderId = `order_sim_${Date.now()}`;

    // If real Razorpay keys are configured, create order via Razorpay REST API
    if (config.razorpay.enabled && config.razorpay.keyId && config.razorpay.keySecret) {
      try {
        const authHeader = Buffer.from(
          `${config.razorpay.keyId}:${config.razorpay.keySecret}`
        ).toString('base64');

        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${authHeader}`,
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100), // convert to paise
            currency: currency.toUpperCase(),
            receipt: `rcpt_${Date.now().toString().slice(-8)}`,
            notes: {
              userId: session.user.id,
              courseId: courseId || '',
              purpose,
            },
          }),
        });

        if (rzpRes.ok) {
          const rzpData = await rzpRes.json();
          razorpayOrderId = rzpData.id;
        } else {
          const errText = await rzpRes.text();
          console.warn('[Payments] Razorpay order creation failed, falling back to simulation:', errText);
        }
      } catch (rzpErr) {
        console.warn('[Payments] Razorpay network error, using simulation order:', rzpErr);
      }
    }

    // Record pending transaction in database
    const [tx] = await db
      .insert(paymentTransactions)
      .values({
        enrollmentId: enrollmentId || null,
        provider: 'razorpay',
        providerRefId: razorpayOrderId,
        amount: amount.toString(),
        currency: currency.toUpperCase(),
        status: 'created',
        rawPayloadJson: {
          userId: session.user.id,
          learnerId: learnerId || session.user.id,
          courseId,
          purpose,
          credits,
          isSimulated: !config.razorpay.enabled,
        },
      })
      .returning();

    return apiSuccess({
      orderId: razorpayOrderId,
      transactionId: tx.id,
      amount,
      currency: currency.toUpperCase(),
      keyId: config.razorpay.keyId || 'rzp_test_simulated_key',
      isSimulated: !config.razorpay.enabled,
    }, undefined, 201);
  } catch (err: any) {
    console.error('[Payments] Create order error:', err);
    return apiError(err.message || 'Failed to initialize payment order', 500);
  }
}
