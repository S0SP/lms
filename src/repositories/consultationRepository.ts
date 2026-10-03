import { db } from '@/lib/drizzle';
import { consultations, courses, orgs } from '@/db/schema';
import { eq, and, ilike, or, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createConsultationSchema, updateConsultationSchema } from '@/validators/consultationValidator';

export interface ConsultationQueryFilters {
  q?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

export const consultationRepository = {
  async findMany(filters: ConsultationQueryFilters) {
    const q = filters.q ?? '';
    const status = filters.status;
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const conditions = [
      status ? eq(consultations.status, status as any) : undefined,
      q
        ? or(
            ilike(consultations.prospectName, `%${q}%`),
            ilike(consultations.prospectEmail, `%${q}%`),
            ilike(consultations.notes, `%${q}%`)
          )
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result, totalResult] = await Promise.all([
      db
        .select({
          id: consultations.id,
          orgId: consultations.orgId,
          prospectName: consultations.prospectName,
          prospectEmail: consultations.prospectEmail,
          prospectPhone: consultations.prospectPhone,
          courseId: consultations.courseId,
          courseName: courses.name,
          slotAt: consultations.slotAt,
          status: consultations.status,
          notes: consultations.notes,
          convertedToLearnerId: consultations.convertedToLearnerId,
          convertedAt: consultations.convertedAt,
          createdAt: consultations.createdAt,
        })
        .from(consultations)
        .leftJoin(courses, eq(consultations.courseId, courses.id))
        .where(whereClause)
        .orderBy(desc(consultations.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db.select({ count: sql<number>`count(*)::int` }).from(consultations).where(whereClause),
    ]);

    return {
      consultations: result,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async findById(id: string) {
    const [consultation] = await db
      .select({
        id: consultations.id,
        orgId: consultations.orgId,
        prospectName: consultations.prospectName,
        prospectEmail: consultations.prospectEmail,
        prospectPhone: consultations.prospectPhone,
        courseId: consultations.courseId,
        courseName: courses.name,
        slotAt: consultations.slotAt,
        status: consultations.status,
        notes: consultations.notes,
        convertedToLearnerId: consultations.convertedToLearnerId,
        convertedAt: consultations.convertedAt,
        createdAt: consultations.createdAt,
      })
      .from(consultations)
      .leftJoin(courses, eq(consultations.courseId, courses.id))
      .where(eq(consultations.id, id))
      .limit(1);

    return consultation ?? null;
  },

  async create(data: z.infer<typeof createConsultationSchema>) {
    let orgId = data.orgId;
    if (!orgId) {
      const [existingOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const [newOrg] = await db
          .insert(orgs)
          .values({
            name: 'UnboundYou Academy',
            subdomain: 'unboundyou',
          })
          .returning();
        orgId = newOrg.id;
      }
    }

    const [consultation] = await db
      .insert(consultations)
      .values({
        orgId,
        prospectName: data.prospectName,
        prospectEmail: data.prospectEmail.toLowerCase(),
        prospectPhone: data.prospectPhone,
        courseId: data.courseId,
        slotAt: data.slotAt ? new Date(data.slotAt) : undefined,
        notes: data.notes,
      })
      .returning();

    return consultation;
  },

  async update(id: string, data: z.infer<typeof updateConsultationSchema>) {
    const [updated] = await db
      .update(consultations)
      .set({
        ...data,
        slotAt: data.slotAt ? new Date(data.slotAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, id))
      .returning();

    return updated ?? null;
  },
};
