import { db } from '@/lib/drizzle';
import { users, educatorProfiles, tags, educatorTags } from '@/db/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { inviteEducatorSchema } from '@/validators/educatorValidator';

export interface EducatorQueryFilters {
  q?: string;
  page?: number;
  perPage?: number;
}

export const educatorRepository = {
  async findMany(filters: EducatorQueryFilters) {
    const q = filters.q ?? '';
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const baseWhere = eq(users.role, 'educator');
    const whereClause = q
      ? and(baseWhere, or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
      : baseWhere;

    const [educatorsResult, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          isActive: users.isActive,
          tagline: educatorProfiles.tagline,
          payoutDefaultRate: educatorProfiles.payoutDefaultRate,
          payoutCurrency: educatorProfiles.payoutCurrency,
          calendarConnected: educatorProfiles.calendarConnected,
          zoomUserId: educatorProfiles.zoomUserId,
        })
        .from(users)
        .leftJoin(educatorProfiles, eq(users.id, educatorProfiles.userId))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);

    return {
      educators: educatorsResult,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async invite(data: z.infer<typeof inviteEducatorSchema>, orgId?: string | null) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, data.email.toLowerCase()))
      .limit(1);

    if (existing) throw new Error('A user with this email already exists.');

    return await db.transaction(async (tx) => {
      const tempPassword = Math.random().toString(36).slice(-12);
      const passwordHash = await hash(tempPassword);

      const [user] = await tx
        .insert(users)
        .values({
          orgId: orgId ?? null,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          role: 'educator',
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, name: users.name, phone: users.phone });

      if (!user) throw new Error('Failed to create user');

      await tx.insert(educatorProfiles).values({
        userId: user.id,
        payoutDefaultRate: String(data.payoutDefaultRate),
        payoutCurrency: data.payoutCurrency,
      });

      // Save tags and link to educator if provided
      if (data.tags && data.tags.length > 0 && orgId) {
        for (const rawTag of data.tags) {
          const tagName = rawTag.trim();
          if (!tagName) continue;

          let [existingTag] = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.orgId, orgId), eq(tags.name, tagName)))
            .limit(1);

          if (!existingTag) {
            const [createdTag] = await tx
              .insert(tags)
              .values({
                orgId,
                name: tagName,
                category: 'custom',
                colorHex: '#6366f1',
              })
              .returning({ id: tags.id });
            existingTag = createdTag;
          }

          if (existingTag?.id) {
            await tx
              .insert(educatorTags)
              .values({
                tagId: existingTag.id,
                educatorId: user.id,
              })
              .catch(() => {});
          }
        }
      }

      return { ...user, tempPassword };
    });
  }
};
