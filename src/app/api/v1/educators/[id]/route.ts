import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import {
  users,
  educatorProfiles,
  courseEducators,
  courses,
  sessions,
  payouts,
  educatorTags,
  tags,
} from '@/db/schema';
import { eq, and, sql, desc, gte, lte } from 'drizzle-orm';
import { z } from 'zod';

const updateEducatorSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  tagline: z.string().max(100).nullable().optional(),
  about: z.string().max(5000).nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  coverPhotoUrl: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  reviews: z.array(
    z.object({
      id: z.string(),
      studentName: z.string(),
      rating: z.number().min(1).max(5),
      comment: z.string(),
      date: z.string(),
    })
  ).optional(),
  payoutDefaultRate: z.string().optional(),
  payoutCurrency: z.string().optional(),
  payoutDetails: z.object({
    beneficiaryName: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    upiId: z.string().optional(),
    currency: z.string().optional(),
  }).optional(),
  bookingPreferences: z.object({
    minNotice: z.string().optional(),
    bufferTime: z.string().optional(),
    restrictAdjacent: z.boolean().optional(),
    limitFuture: z.string().optional(),
  }).optional(),
  subjectBadge: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;

  // 1. Fetch user & educator profile
  const [educator] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      tagline: educatorProfiles.tagline,
      about: educatorProfiles.about,
      youtubeUrl: educatorProfiles.youtubeUrl,
      coverPhotoUrl: educatorProfiles.coverPhotoUrl,
      tags: educatorProfiles.tags,
      reviews: educatorProfiles.reviews,
      payoutDefaultRate: educatorProfiles.payoutDefaultRate,
      payoutCurrency: educatorProfiles.payoutCurrency,
      payoutDetails: educatorProfiles.payoutDetails,
      bookingPreferences: educatorProfiles.bookingPreferences,
      calendarConnected: educatorProfiles.calendarConnected,
    })
    .from(users)
    .leftJoin(educatorProfiles, eq(users.id, educatorProfiles.userId))
    .where(and(eq(users.id, id), eq(users.role, 'educator')))
    .limit(1);

  if (!educator) {
    return apiError('Educator not found', 404);
  }

  // Generate consistent 4-digit key code from UUID
  const numericId = (parseInt(id.replace(/-/g, '').slice(0, 6), 16) % 9000 + 1000).toString();

  // 2. Fetch subject tags
  const educatorSubjectTags = await db
    .select({
      id: tags.id,
      name: tags.name,
      colorHex: tags.colorHex,
    })
    .from(educatorTags)
    .innerJoin(tags, eq(educatorTags.tagId, tags.id))
    .where(eq(educatorTags.educatorId, id));

  const subjectBadge = educatorSubjectTags[0]?.name || 'Maths';

  // 3. Assigned courses count
  const [coursesCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(courseEducators)
    .where(eq(courseEducators.educatorId, id));

  const coursesAssigned = coursesCountRow?.count ?? 0;

  // 4. Sessions statistics
  const now = new Date();
  const allSessionsRows = await db
    .select({
      id: sessions.id,
      durationMin: sessions.durationMin,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
    })
    .from(sessions)
    .where(eq(sessions.educatorId, id));

  const allSessionsCount = allSessionsRows.length;
  const totalDurationMin = allSessionsRows.reduce((acc, s) => acc + (s.durationMin || 0), 0);

  const upcomingSessionsCount = allSessionsRows.filter(
    (s) => new Date(s.scheduledAt) >= now && s.status !== 'cancelled'
  ).length;

  const pastSessionsCount = allSessionsRows.filter(
    (s) => new Date(s.scheduledAt) < now || s.status === 'completed'
  ).length;

  // Format total duration: e.g. "54m" or "2h 30m"
  const formattedDuration =
    totalDurationMin < 60
      ? `${totalDurationMin}m`
      : `${Math.floor(totalDurationMin / 60)}h ${totalDurationMin % 60 ? `${totalDurationMin % 60}m` : ''}`.trim();

  // 5. Monthly breakdown for charts & tables (Last 4 months: Jul, Aug, Sep, Oct)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();

  const monthsMap = new Map<string, { month: string; sessions: number; durationMin: number; year: number }>();

  for (let i = 3; i >= 0; i--) {
    const d = new Date(currentYear, currentMonthIdx - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthsMap.set(key, {
      month: monthNames[d.getMonth()],
      sessions: 0,
      durationMin: 0,
      year: d.getFullYear(),
    });
  }

  allSessionsRows.forEach((s) => {
    const d = new Date(s.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthsMap.has(key)) {
      const entry = monthsMap.get(key)!;
      entry.sessions += 1;
      entry.durationMin += s.durationMin || 0;
    }
  });

  const sessionMonthlyStats = Array.from(monthsMap.values()).map((m) => ({
    month: m.month,
    sessions: m.sessions,
    duration: m.durationMin > 0 ? (m.durationMin < 60 ? `${m.durationMin}m` : `${Math.floor(m.durationMin / 60)}h`) : '-',
  }));

  // 6. Payouts statistics
  const educatorPayouts = await db
    .select({
      id: payouts.id,
      amount: payouts.amount,
      currency: payouts.currency,
      status: payouts.status,
      cyclePeriod: payouts.cyclePeriod,
      payoutDate: payouts.payoutDate,
      createdAt: payouts.createdAt,
    })
    .from(payouts)
    .where(eq(payouts.educatorId, id));

  const totalPayoutsAmount = educatorPayouts.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const inReviewPayoutsAmount = educatorPayouts
    .filter((p) => p.status === 'in_review')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const approvedPayoutsAmount = educatorPayouts
    .filter((p) => p.status === 'approved' || p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

  const payoutMonthlyStats = Array.from(monthsMap.entries()).map(([key, m]) => {
    const periodPayouts = educatorPayouts.filter((p) => p.cyclePeriod === key);
    const approved = periodPayouts
      .filter((p) => p.status === 'approved' || p.status === 'paid')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
    const inReview = periodPayouts
      .filter((p) => p.status === 'in_review')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    return {
      month: m.month,
      paid: approved,
      inReview: inReview,
      currency: educator.payoutCurrency || 'INR',
    };
  });

  return apiSuccess({
    ...educator,
    numericId,
    subjectBadge,
    coursesAssigned,
    allSessionsCount,
    upcomingSessionsCount,
    pastSessionsCount,
    formattedDuration,
    sessionMonthlyStats,
    payoutSummary: {
      allSessions: allSessionsCount,
      allPayouts: totalPayoutsAmount,
      inReview: inReviewPayoutsAmount,
      approved: approvedPayoutsAmount,
      currency: educator.payoutCurrency || 'INR',
    },
    payoutMonthlyStats,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const parsed = updateEducatorSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const {
    name,
    phone,
    avatarUrl,
    tagline,
    about,
    youtubeUrl,
    coverPhotoUrl,
    tags: tagsList,
    reviews,
    payoutDefaultRate,
    payoutCurrency,
    payoutDetails,
    bookingPreferences,
    subjectBadge,
  } = parsed.data;

  // 1. Update users table if user fields provided
  const userUpdates: Record<string, any> = {};
  if (name !== undefined) userUpdates.name = name;
  if (phone !== undefined) userUpdates.phone = phone;
  if (avatarUrl !== undefined) userUpdates.avatarUrl = avatarUrl;

  if (Object.keys(userUpdates).length > 0) {
    await db.update(users).set(userUpdates).where(eq(users.id, id));
  }

  // 2. Ensure educator profile row exists, then update
  const profileUpdates: Record<string, any> = { updatedAt: new Date() };
  if (tagline !== undefined) profileUpdates.tagline = tagline;
  if (about !== undefined) profileUpdates.about = about;
  if (youtubeUrl !== undefined) profileUpdates.youtubeUrl = youtubeUrl;
  if (coverPhotoUrl !== undefined) profileUpdates.coverPhotoUrl = coverPhotoUrl;
  if (tagsList !== undefined) profileUpdates.tags = tagsList;
  if (reviews !== undefined) profileUpdates.reviews = reviews;
  if (payoutDefaultRate !== undefined) profileUpdates.payoutDefaultRate = payoutDefaultRate;
  if (payoutCurrency !== undefined) profileUpdates.payoutCurrency = payoutCurrency;
  if (payoutDetails !== undefined) profileUpdates.payoutDetails = payoutDetails;
  if (bookingPreferences !== undefined) profileUpdates.bookingPreferences = bookingPreferences;

  const [existingProfile] = await db
    .select({ userId: educatorProfiles.userId })
    .from(educatorProfiles)
    .where(eq(educatorProfiles.userId, id))
    .limit(1);

  if (existingProfile) {
    await db
      .update(educatorProfiles)
      .set(profileUpdates)
      .where(eq(educatorProfiles.userId, id));
  } else {
    await db.insert(educatorProfiles).values({
      userId: id,
      ...profileUpdates,
    });
  }

  // 3. Subject badge update if provided
  if (subjectBadge) {
    // Check if tag exists or create it
    const [existingTag] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.name, subjectBadge))
      .limit(1);

    let tagId = existingTag?.id;
    if (!tagId) {
      // Find org
      const [u] = await db.select({ orgId: users.orgId }).from(users).where(eq(users.id, id)).limit(1);
      if (u?.orgId) {
        const [newTag] = await db
          .insert(tags)
          .values({
            orgId: u.orgId,
            name: subjectBadge,
            colorHex: '#8b5cf6',
            category: 'core',
          })
          .returning();
        tagId = newTag.id;
      }
    }

    if (tagId) {
      await db.delete(educatorTags).where(eq(educatorTags.educatorId, id));
      await db.insert(educatorTags).values({
        educatorId: id,
        tagId,
      });
    }
  }

  return apiSuccess({ success: true });
}
