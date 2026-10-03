import { courseRepository, CourseQueryFilters } from '@/repositories/courseRepository';
import { z } from 'zod';
import { createCourseSchema } from '@/validators/courseValidator';
import { db } from '@/lib/drizzle';
import { orgs } from '@/db/schema';

/**
 * Resolves the tenant for a write. Falls back to the first org, auto-provisioning
 * one for a fresh install, and throws rather than persisting an orphan course.
 */
async function resolveOrgId(requested?: string): Promise<string> {
  if (requested) return requested;

  const [existing] = await db.select({ id: orgs.id }).from(orgs).limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(orgs)
    .values({ name: 'UnboundYou Academy', subdomain: 'unboundyou' })
    .returning({ id: orgs.id });

  if (!created) throw new Error('Could not resolve an organisation for this course');
  return created.id;
}

export const courseService = {
  async getCourses(filters: CourseQueryFilters) {
    return await courseRepository.findMany(filters);
  },

  async getCourseById(id: string) {
    return await courseRepository.findById(id);
  },

  async createCourse(data: z.infer<typeof createCourseSchema>, userId: string) {
    const shortCode = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const orgId = await resolveOrgId(data.orgId);

    return await courseRepository.createWithEducators(
      {
        ...data,
        orgId,
        createdBy: userId,
        shortCode,
      },
      data.educatorIds
    );
  },

  async updateCourse(id: string, data: any) {
    return await courseRepository.update(id, data);
  },

  async updateCurriculum(courseId: string, sections: any[]) {
    return await courseRepository.syncCurriculum(courseId, sections);
  },

  async getPublicCatalog(filters: { category?: string; q?: string; page?: number; perPage?: number }) {
    return await courseRepository.findPublicCatalog(filters);
  },

  async getTemplates(filters: { q?: string; page?: number; perPage?: number }) {
    return await courseRepository.findMany({
      ...filters,
      isTemplate: true,
    });
  },

  async createTemplate(
    data: {
      name: string;
      description?: string;
      board?: string;
      grade?: string;
      thumbnailUrl?: string;
      defaultSessionDurationMin?: number;
      sellingPageJson?: any;
      educatorIds?: string[];
      sections?: any[];
      orgId?: string;
    },
    userId: string
  ) {
    const orgId = await resolveOrgId(data.orgId);
    return await courseRepository.createTemplate({
      ...data,
      orgId,
      createdBy: userId,
    });
  },

  async createCourseFromTemplate(
    templateId: string,
    overrides: {
      name?: string;
      board?: string;
      grade?: string;
      educatorIds?: string[];
    },
    userId: string
  ) {
    const orgId = await resolveOrgId();
    return await courseRepository.createCourseFromTemplate(templateId, {
      ...overrides,
      orgId,
      createdBy: userId,
    });
  },

  async duplicateTemplate(templateId: string, userId: string) {
    return await courseRepository.duplicateTemplate(templateId, userId);
  },

  async deleteTemplate(templateId: string) {
    return await courseRepository.deleteTemplate(templateId);
  },
};
