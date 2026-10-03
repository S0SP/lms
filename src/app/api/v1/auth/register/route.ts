import { NextRequest } from 'next/server';
import { z } from 'zod';
import { hash } from '@node-rs/argon2';
import { db } from '@/lib/drizzle';
import { users, learnerProfiles, educatorProfiles, parentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, apiSuccess } from '@/lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['learner', 'educator', 'parent', 'admin']).default('learner'),
  phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input data';
      return apiError(firstError, 400);
    }

    const { name, email, password, role, phone } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      return apiError('An account with this email address already exists.', 409);
    }

    // Hash password with Argon2id
    const passwordHash = await hash(password);

    // Create user in a transaction and create role profile
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role,
          phone: phone || null,
          isActive: true,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        });

      // Create corresponding role profile extension
      if (role === 'learner') {
        await tx.insert(learnerProfiles).values({
          userId: newUser.id,
          displayName: newUser.name,
        });
      } else if (role === 'educator') {
        await tx.insert(educatorProfiles).values({
          userId: newUser.id,
        });
      } else if (role === 'parent') {
        // Parent profile record will be linked to learner upon linking
      }

      return newUser;
    });

    return apiSuccess(result, undefined, 201);
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return apiError('Failed to register user account.', 500);
  }
}
