import { db } from '@/lib/drizzle';
import { storeSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { storeSettingsSchema } from '@/validators/storeValidator';

export const storeRepository = {
  async findByOrgId(orgId: string) {
    const [settings] = await db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.orgId, orgId))
      .limit(1);

    return settings ?? null;
  },

  async upsert(data: z.infer<typeof storeSettingsSchema>) {
    const { orgId, ...fields } = data;

    await db
      .insert(storeSettings)
      .values({ orgId, ...fields, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [storeSettings.orgId],
        set: { ...fields, updatedAt: new Date() },
      });

    return await this.findByOrgId(orgId);
  }
};
