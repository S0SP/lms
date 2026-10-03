import { db } from '@/lib/drizzle';
import { availabilityProfiles, leaves } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { saveAvailabilitySchema } from '@/validators/availabilityValidator';

export const availabilityRepository = {
  async findByEducatorId(educatorId: string) {
    const [profile] = await db
      .select()
      .from(availabilityProfiles)
      .where(eq(availabilityProfiles.educatorId, educatorId))
      .limit(1);

    const upcomingLeaves = await db
      .select()
      .from(leaves)
      .where(and(eq(leaves.educatorId, educatorId), gte(leaves.startDate, new Date())));

    return { profile: profile ?? null, leaves: upcomingLeaves };
  },

  async upsert(educatorId: string, data: z.infer<typeof saveAvailabilitySchema>) {
    await db
      .insert(availabilityProfiles)
      .values({
        educatorId,
        timezone: data.timezone,
        scheduleJson: data.scheduleJson,
        overridesJson: data.overridesJson,
        isDefault: true,
      })
      .onConflictDoUpdate({
        target: [availabilityProfiles.educatorId],
        set: {
          timezone: data.timezone,
          scheduleJson: data.scheduleJson,
          overridesJson: data.overridesJson,
          updatedAt: new Date(),
        },
      });
  }
};
