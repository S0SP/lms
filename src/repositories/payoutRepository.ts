import { db } from '@/lib/drizzle';
import { payouts, payoutSessionLinks, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createPayoutSchema } from '@/validators/payoutValidator';

export interface PayoutQueryFilters {
  educatorId?: string;
  status?: string;
  page?: number;
  perPage?: number;
  role: string;
  userId: string;
}

export const payoutRepository = {
  async findMany(filters: PayoutQueryFilters) {
    const { role, userId, educatorId, status } = filters;
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const conditions = [
      role === 'educator' ? eq(payouts.educatorId, userId) : undefined,
      role !== 'educator' && educatorId ? eq(payouts.educatorId, educatorId) : undefined,
      status ? eq(payouts.status, status as any) : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result, totalResult] = await Promise.all([
      db
        .select({
          id: payouts.id,
          educatorId: payouts.educatorId,
          educatorName: users.name,
          cyclePeriod: payouts.cyclePeriod,
          amount: payouts.amount,
          currency: payouts.currency,
          status: payouts.status,
          payoutDate: payouts.payoutDate,
          notes: payouts.notes,
          createdAt: payouts.createdAt,
        })
        .from(payouts)
        .leftJoin(users, eq(payouts.educatorId, users.id))
        .where(whereClause)
        .orderBy(desc(payouts.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db.select({ count: sql<number>`count(*)::int` }).from(payouts).where(whereClause),
    ]);

    return {
      payouts: result,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async create(data: z.infer<typeof createPayoutSchema>, processedBy: string) {
    return await db.transaction(async (tx) => {
      const [payout] = await tx
        .insert(payouts)
        .values({
          educatorId: data.educatorId,
          cyclePeriod: data.cyclePeriod,
          amount: String(data.amount),
          currency: data.currency,
          notes: data.notes,
          processedBy,
        })
        .returning();

      if (data.sessionIds && data.sessionIds.length > 0) {
        await tx.insert(payoutSessionLinks).values(
          data.sessionIds.map((sessionId) => ({
            payoutId: payout.id,
            sessionId,
            rateApplied: '0',
            creditsOrHours: '1',
          }))
        );
      }

      return payout;
    });
  }
};
