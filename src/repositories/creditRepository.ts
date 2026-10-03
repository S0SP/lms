import { db } from '@/lib/drizzle';
import { credits } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
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

  async adjustCredit(data: z.infer<typeof adjustCreditSchema>, adminId: string) {
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

    return await this.getCredit(data.courseId, data.learnerId);
  }
};
