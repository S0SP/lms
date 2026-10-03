import { db } from '@/lib/drizzle';
import { users, learnerProfiles, parentProfiles, tags, learnerTags } from '@/db/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { createLearnerSchema } from '@/validators/learnerValidator';

export interface LearnerQueryFilters {
  q?: string;
  page?: number;
  perPage?: number;
}

export const learnerRepository = {
  async findMany(filters: LearnerQueryFilters) {
    const q = filters.q ?? '';
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const baseWhere = eq(users.role, 'learner');
    const searchWhere = q
      ? and(baseWhere, or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`), ilike(users.phone ?? sql`''`, `%${q}%`)))
      : baseWhere;

    const [learnersResult, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          isActive: users.isActive,
          board: learnerProfiles.board,
          grade: learnerProfiles.grade,
        })
        .from(users)
        .leftJoin(learnerProfiles, eq(users.id, learnerProfiles.userId))
        .where(searchWhere)
        .orderBy(desc(users.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(searchWhere),
    ]);

    return {
      learners: learnersResult,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async create(data: z.infer<typeof createLearnerSchema>, orgId?: string | null) {
    const lowerEmail = data.email.toLowerCase().trim();
    const [existing] = await db
      .select({
        id: users.id,
        role: users.role,
        name: users.name,
        email: users.email,
        phone: users.phone,
        loginPin: users.loginPin,
      })
      .from(users)
      .where(eq(users.email, lowerEmail))
      .limit(1);

    if (existing) {
      // If user already exists as an educator or other role, convert/add them as a learner!
      // "or lets say i add any educator as a learner then a pin based login system will be used"
      return await db.transaction(async (tx) => {
        const loginPin = data.loginPin || existing.loginPin || Math.floor(1000 + Math.random() * 9000).toString();
        const tempPassword = Math.random().toString(36).slice(-10);

        const [updatedUser] = await tx
          .update(users)
          .set({
            role: 'learner',
            loginPin,
            phone: data.phone || existing.phone,
            name: data.name || existing.name,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning({ id: users.id, email: users.email, name: users.name, phone: users.phone, loginPin: users.loginPin });

        // Upsert learner profile
        const [profile] = await tx
          .select({ userId: learnerProfiles.userId })
          .from(learnerProfiles)
          .where(eq(learnerProfiles.userId, existing.id))
          .limit(1);

        if (profile) {
          await tx
            .update(learnerProfiles)
            .set({
              board: data.board,
              grade: data.grade,
              dob: data.dob ? new Date(data.dob) : undefined,
              privateNote: data.privateNote,
              updatedAt: new Date(),
            })
            .where(eq(learnerProfiles.userId, existing.id));
        } else {
          await tx.insert(learnerProfiles).values({
            userId: existing.id,
            board: data.board,
            grade: data.grade,
            dob: data.dob ? new Date(data.dob) : undefined,
            privateNote: data.privateNote,
          });
        }

        if (data.parentEmail) {
          await tx.insert(parentProfiles).values({
            learnerId: existing.id,
            name: data.parentName ?? 'Parent',
            email: data.parentEmail.toLowerCase().trim(),
            phone: data.parentPhone,
          });
        }

        return { ...updatedUser, tempPassword, loginPin };
      });
    }

    return await db.transaction(async (tx) => {
      const loginPin = data.loginPin || Math.floor(1000 + Math.random() * 9000).toString();
      const tempPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await hash(tempPassword);

      const [newUser] = await tx
        .insert(users)
        .values({
          orgId: orgId ?? null,
          name: data.name,
          email: lowerEmail,
          phone: data.phone,
          role: 'learner',
          loginPin,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, name: users.name, phone: users.phone, loginPin: users.loginPin });

      if (!newUser) throw new Error('Failed to create user');

      await tx.insert(learnerProfiles).values({
        userId: newUser.id,
        board: data.board,
        grade: data.grade,
        dob: data.dob ? new Date(data.dob) : undefined,
        privateNote: data.privateNote,
      });

      if (data.parentEmail) {
        await tx.insert(parentProfiles).values({
          learnerId: newUser.id,
          name: data.parentName ?? 'Parent',
          email: data.parentEmail.toLowerCase().trim(),
          phone: data.parentPhone,
        });
      }

      // Save tags and link to learner if provided
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
                colorHex: '#10b981',
              })
              .returning({ id: tags.id });
            existingTag = createdTag;
          }

          if (existingTag?.id) {
            await tx
              .insert(learnerTags)
              .values({
                tagId: existingTag.id,
                learnerId: newUser.id,
              })
              .catch(() => {});
          }
        }
      }

      return { ...newUser, tempPassword, loginPin };
    });
  },

  async findById(id: string, includePrivateNote: boolean = false) {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        isActive: users.isActive,
        board: learnerProfiles.board,
        grade: learnerProfiles.grade,
        dob: learnerProfiles.dob,
        displayName: learnerProfiles.displayName,
        ...(includePrivateNote ? { privateNote: learnerProfiles.privateNote } : {}),
      })
      .from(users)
      .leftJoin(learnerProfiles, eq(users.id, learnerProfiles.userId))
      .where(and(eq(users.id, id), eq(users.role, 'learner')))
      .limit(1);
    
    return user;
  }
};

