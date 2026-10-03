import { db } from '@/lib/drizzle';
import { users, learnerProfiles } from '@/db/schema';
import { eq, ilike, or, and, desc, sql } from 'drizzle-orm';
import { LearnersTable } from '@/components/admin/LearnersTable';

// Force dynamic — page depends on searchParams
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function LearnersPage({ searchParams }: PageProps) {
  const { q = '', page: pageStr = '1' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const perPage = 20;

  const baseWhere = eq(users.role, 'learner');
  const searchWhere = q
    ? and(baseWhere, or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)))
    : baseWhere;

  const [learnerRows, totalRow] = await Promise.all([
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

    db.select({ count: sql<number>`count(*)::int` }).from(users).where(searchWhere),
  ]);

  // Serialize dates for client component (Next.js can't pass Date objects across server/client boundary)
  const learners = learnerRows.map((l) => ({
    ...l,
    createdAt: l.createdAt?.toISOString() ?? new Date().toISOString(),
    enrollmentCount: 0,
  }));

  return (
    <LearnersTable
      learners={learners}
      total={totalRow[0]?.count ?? 0}
      page={page}
      perPage={perPage}
      q={q}
    />
  );
}
