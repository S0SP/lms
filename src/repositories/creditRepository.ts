import { db } from '@/lib/drizzle';
import { credits, creditLedger, users } from '@/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { adjustCreditSchema } from '@/validators/creditValidator';

export const creditRepository = {
  async getCredit(courseId: string, learnerId: string) {
    const [credit] = await db
      .select()
      .from(credits)
      .where(and(eq(credits.courseId, courseId), eq(credits.learnerId, learnerId)))
      .limit(1);

    return credit;
  },

  async getCreditHistory(courseId: string, learnerId: string, limit = 50) {
    return await db
      .select({
        id: creditLedger.id,
        delta: creditLedger.delta,
        balanceAfter: creditLedger.balanceAfter,
        note: creditLedger.note,
        source: creditLedger.source,
        sessionId: creditLedger.sessionId,
        createdAt: creditLedger.createdAt,
        adjustedByName: users.name,
      })
      .from(creditLedger)
      .leftJoin(users, eq(creditLedger.adjustedBy, users.id))
      .where(and(eq(creditLedger.courseId, courseId), eq(creditLedger.learnerId, learnerId)))
      .orderBy(desc(creditLedger.createdAt))
      .limit(limit);
  },

  async adjustCredit(data: z.infer<typeof adjustCreditSchema>, adminId: string) {
    // 1. Upsert the credits balance
    await db
      .insert(credits)
      .values({
        courseId: data.courseId,
        learnerId: data.learnerId,
        total: String(Math.max(0, data.delta)),
        consumed: '0',
        adjustedBy: adminId,
        adjustedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [credits.courseId, credits.learnerId],
        set: {
          total: sql`credits.total + ${data.delta}`,
          adjustedBy: adminId,
          adjustedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // 2. Fetch the updated balance
    const updated = await this.getCredit(data.courseId, data.learnerId);
    const balanceAfter = parseFloat(updated?.total ?? '0');

    // 3. Append a ledger entry
    await db.insert(creditLedger).values({
      courseId: data.courseId,
      learnerId: data.learnerId,
      delta: String(data.delta),
      balanceAfter: String(balanceAfter),
      note: (data as any).note ?? data.reason ?? null,
      source: 'admin',
      adjustedBy: adminId,
    });

    return updated;
  },

  /**
   * Session-triggered deduction: called when a session is marked complete.
   * Silently skips if learner has no credit record.
   */
  async consumeSessionCredit(
    courseId: string,
    learnerId: string,
    sessionId: string,
    creditsToConsume = 1.0
  ) {
    const existing = await this.getCredit(courseId, learnerId);
    if (!existing) return null;

    // Deduct from both consumed and total (total is not changed — consumed tracks usage)
    await db
      .update(credits)
      .set({
        consumed: sql`credits.consumed + ${creditsToConsume}`,
        updatedAt: new Date(),
      })
      .where(and(eq(credits.courseId, courseId), eq(credits.learnerId, learnerId)));

    const updatedCredit = await this.getCredit(courseId, learnerId);
    const balanceAfter = parseFloat(updatedCredit?.total ?? '0') - parseFloat(updatedCredit?.consumed ?? '0');

    await db.insert(creditLedger).values({
      courseId,
      learnerId,
      delta: String(-creditsToConsume),
      balanceAfter: String(balanceAfter),
      note: 'Session completed',
      source: 'session',
      sessionId,
    });

    return updatedCredit;
  },
};
