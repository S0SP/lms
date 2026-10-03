import { type NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/drizzle';
import { paymentTransactions, sessionAttendees, consultations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { config } from '@/config/unifiedConfig';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    const textBody = await req.text();

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret!)
      .update(textBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(textBody);

    if (event.event === 'payment.captured') {
      const paymentId = event.payload.payment.entity.id;
      const orderId = event.payload.payment.entity.order_id;
      
      // Update payment status
      await db
        .update(paymentTransactions)
        .set({ status: 'paid', providerRefId: paymentId, updatedAt: new Date() })
        .where(eq(paymentTransactions.id, orderId)); // Assuming orderId mapped to our tx id, adjust if needed

      // Fetch payment to get enrollment or other relations
      const [payment] = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, orderId))
        .limit(1);

      if (payment && payment.enrollmentId) {
        // Enrol learner logic would go here
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
