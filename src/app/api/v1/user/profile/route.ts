import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users, learnerProfiles, educatorProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/v1/user/profile
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
        loginPin: users.loginPin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return apiError('User not found', 404);
    }

    let userPin = user.loginPin;
    if (!userPin && (user.role === 'educator' || user.role === 'learner')) {
      // Generate a consistent 4-digit PIN if not assigned yet
      userPin = Math.floor(1000 + Math.random() * 9000).toString();
      await db
        .update(users)
        .set({ loginPin: userPin, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    let extraProfile: any = {};

    if (user.role === 'learner') {
      const [learner] = await db
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, userId))
        .limit(1);
      if (learner) extraProfile = learner;
    } else if (user.role === 'educator') {
      const [educator] = await db
        .select()
        .from(educatorProfiles)
        .where(eq(educatorProfiles.userId, userId))
        .limit(1);
      if (educator) {
        extraProfile = educator;
      } else {
        // Create default educator profile record if not present
        const defaultPrefs = {
          minNotice: '1 hour',
          bufferTime: '0 mins',
          restrictAdjacent: false,
          limitFuture: '30 days',
        };
        const [inserted] = await db
          .insert(educatorProfiles)
          .values({
            userId,
            bookingPreferences: defaultPrefs,
          })
          .returning();
        extraProfile = inserted || {};
      }
    }

    return apiSuccess({
      ...user,
      loginPin: userPin,
      profileDetails: extraProfile,
      tagline: extraProfile.tagline || '',
      about: extraProfile.about || '',
      youtubeUrl: extraProfile.youtubeUrl || '',
      bookingPreferences: extraProfile.bookingPreferences || {
        minNotice: '1 hour',
        bufferTime: '0 mins',
        restrictAdjacent: false,
        limitFuture: '30 days',
      },
    });
  } catch (err: any) {
    console.error('Error fetching profile:', err);
    return apiError('Failed to fetch profile', 500);
  }
}

// PATCH /api/v1/user/profile
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    const body = await req.json();
    const {
      name,
      phone,
      avatarUrl,
      loginPin,
      tagline,
      about,
      youtubeUrl,
      bookingPreferences,
      tags,
    } = body;

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (loginPin !== undefined) updateData.loginPin = loginPin;

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        role: users.role,
        loginPin: users.loginPin,
      });

    // If educator profile fields were provided, update educator_profiles table
    let updatedEducatorProfile = null;
    if (
      updatedUser.role === 'educator' &&
      (tagline !== undefined ||
        about !== undefined ||
        youtubeUrl !== undefined ||
        bookingPreferences !== undefined ||
        tags !== undefined)
    ) {
      const profileUpdates: Record<string, any> = { updatedAt: new Date() };
      if (tagline !== undefined) profileUpdates.tagline = tagline;
      if (about !== undefined) profileUpdates.about = about;
      if (youtubeUrl !== undefined) profileUpdates.youtubeUrl = youtubeUrl;
      if (bookingPreferences !== undefined) profileUpdates.bookingPreferences = bookingPreferences;
      if (tags !== undefined) profileUpdates.tags = tags;

      const [existing] = await db
        .select({ userId: educatorProfiles.userId, bookingPreferences: educatorProfiles.bookingPreferences })
        .from(educatorProfiles)
        .where(eq(educatorProfiles.userId, userId))
        .limit(1);

      if (existing) {
        if (bookingPreferences !== undefined) {
          profileUpdates.bookingPreferences = {
            ...(existing.bookingPreferences || {}),
            ...bookingPreferences,
          };
        }
        const [p] = await db
          .update(educatorProfiles)
          .set(profileUpdates)
          .where(eq(educatorProfiles.userId, userId))
          .returning();
        updatedEducatorProfile = p;
      } else {
        const [p] = await db
          .insert(educatorProfiles)
          .values({
            userId,
            ...profileUpdates,
          })
          .returning();
        updatedEducatorProfile = p;
      }

      // Sync timezone to availability_profiles table if provided in bookingPreferences
      const tzString = bookingPreferences?.timezone;
      if (tzString) {
        // e.g. "Asia/Kolkata (GMT +05:30)" -> "Asia/Kolkata"
        const cleanTz = tzString.split(' ')[0] || tzString;
        const { availabilityProfiles } = await import('@/db/schema');
        const [existingAvail] = await db
          .select({ id: availabilityProfiles.id })
          .from(availabilityProfiles)
          .where(eq(availabilityProfiles.educatorId, userId))
          .limit(1);

        if (existingAvail) {
          await db
            .update(availabilityProfiles)
            .set({ timezone: cleanTz, updatedAt: new Date() })
            .where(eq(availabilityProfiles.educatorId, userId));
        } else {
          await db
            .insert(availabilityProfiles)
            .values({
              educatorId: userId,
              timezone: cleanTz,
              name: 'Default',
              isDefault: true,
              scheduleJson: {
                monday: [{ start: '09:00', end: '17:00' }],
                tuesday: [{ start: '09:00', end: '17:00' }],
                wednesday: [{ start: '09:00', end: '17:00' }],
                thursday: [{ start: '09:00', end: '17:00' }],
                friday: [{ start: '09:00', end: '17:00' }],
              },
            });
        }
      }
    }

    // If learner profile fields were provided, update learner_profiles table
    let updatedLearnerProfile = null;
    if (
      (updatedUser.role === 'learner' || (updatedUser as any).role === 'student') &&
      (body.board !== undefined || body.grade !== undefined || body.displayName !== undefined || body.dob !== undefined)
    ) {
      const learnerUpdates: Record<string, any> = { updatedAt: new Date() };
      if (body.board !== undefined) learnerUpdates.board = body.board;
      if (body.grade !== undefined) learnerUpdates.grade = body.grade;
      if (body.displayName !== undefined) learnerUpdates.displayName = body.displayName;
      if (body.dob !== undefined) learnerUpdates.dob = new Date(body.dob);

      const [existingL] = await db
        .select({ userId: learnerProfiles.userId })
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, userId))
        .limit(1);

      if (existingL) {
        const [l] = await db
          .update(learnerProfiles)
          .set(learnerUpdates)
          .where(eq(learnerProfiles.userId, userId))
          .returning();
        updatedLearnerProfile = l;
      } else {
        const [l] = await db
          .insert(learnerProfiles)
          .values({
            userId,
            ...learnerUpdates,
          })
          .returning();
        updatedLearnerProfile = l;
      }
    }

    return apiSuccess({
      ...updatedUser,
      profileDetails: updatedEducatorProfile || updatedLearnerProfile,
    });
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return apiError('Failed to update profile', 500);
  }
}
