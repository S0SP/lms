import { type NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { paymentTransactions, credits as creditsTable, creditLedger } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { config } from '@/config/unifiedConfig';
import { enrollStudentInClass } from '@/services/enrollmentService';

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().optional(),
  signature: z.string().optional(),
  courseId: z.string().uuid().optional(),
  learnerId: z.string().uuid().optional(),
  credits: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  try {
    const body = await req.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.message, 400);
    }

    const { orderId, paymentId, signature, courseId, learnerId, credits } = parsed.data;
    const finalPaymentId = paymentId || `pay_sim_${Date.now()}`;

    // Verify cryptographic signature if real keys are supplied
    if (config.razorpay.enabled && config.razorpay.keySecret && signature) {
      const generatedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${orderId}|${finalPaymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return apiError('Invalid payment signature', 400);
      }
    }

    // Find and update payment transaction
    const [existingTx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.providerRefId, orderId))
      .limit(1);

    if (existingTx) {
      await db
        .update(paymentTransactions)
        .set({
          status: 'paid',
          providerRefId: finalPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, existingTx.id));
    }

    const targetLearnerId = learnerId || (existingTx?.rawPayloadJson as any)?.learnerId || session.user.id;
    const targetCourseId = courseId || (existingTx?.rawPayloadJson as any)?.courseId;
    const targetCredits = credits ?? (existingTx?.rawPayloadJson as any)?.credits;

    // Auto-enroll in course if applicable
    let enrollment = null;
    if (targetCourseId && targetLearnerId) {
      try {
        enrollment = await enrollStudentInClass(targetLearnerId, targetCourseId);
        if (existingTx && enrollment?.enrollmentId) {
          await db
            .update(paymentTransactions)
            .set({ enrollmentId: enrollment.enrollmentId })
            .where(eq(paymentTransactions.id, existingTx.id));
        }
      } catch (enrollErr: any) {
        console.warn('[Payments] Course auto-enrollment note:', enrollErr?.message);
      }
    }

    // If credits were purchased, top up learner balance
    if (targetCredits && targetCredits > 0 && targetLearnerId && targetCourseId) {
      try {
        const [existingCredit] = await db
          .select()
          .from(creditsTable)
          .where(
            and(
              eq(creditsTable.learnerId, targetLearnerId),
              eq(creditsTable.courseId, targetCourseId)
            )
          )
          .limit(1);

        if (existingCredit) {
          const newTotal = (Number(existingCredit.total) + targetCredits).toFixed(2);
          const balanceAfter = (Number(newTotal) - Number(existingCredit.consumed)).toFixed(2);
          await db
            .update(creditsTable)
            .set({ total: newTotal, updatedAt: new Date() })
            .where(eq(creditsTable.id, existingCredit.id));

          await db.insert(creditLedger).values({
            courseId: targetCourseId,
            learnerId: targetLearnerId,
            delta: targetCredits.toString(),
            balanceAfter,
            note: `Online top-up (Payment ${finalPaymentId})`,
            source: 'system',
          });
        } else {
          const [newCred] = await db
            .insert(creditsTable)
            .values({
              learnerId: targetLearnerId,
              courseId: targetCourseId,
              total: targetCredits.toString(),
              consumed: '0',
            })
            .returning();

          if (newCred) {
            await db.insert(creditLedger).values({
              courseId: targetCourseId,
              learnerId: targetLearnerId,
              delta: targetCredits.toString(),
              balanceAfter: targetCredits.toString(),
              note: `Initial credit purchase (${finalPaymentId})`,
              source: 'system',
            });
          }
        }
      } catch (credErr) {
        console.error('[Payments] Failed to top up credits:', credErr);
      }
    }

    return apiSuccess({
      status: 'paid',
      orderId,
      paymentId: finalPaymentId,
      enrollment,
      message: 'Payment verified and processed successfully',
    });
  } catch (err: any) {
    console.error('[Payments] Verify error:', err);
    return apiError(err.message || 'Payment verification failed', 500);
  }
}
