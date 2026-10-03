import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessions, courses, users, sessionReports, timelinePosts, polls, pollOptions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { config } from '@/config/unifiedConfig';

type RouteParams = { params: Promise<{ id: string }> };

function isAiConfigured(): boolean {
  return Boolean(
    config.gemini.apiKey ||
    process.env.GEMINI_API_KEY ||
    config.anthropic.apiKey ||
    process.env.ANTHROPIC_API_KEY
  );
}

async function callAiModel(systemPrompt: string, userPrompt: string): Promise<string> {
  const geminiKey = config.gemini.apiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const model = config.gemini.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  const anthropicKey = config.anthropic.apiKey || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: config.anthropic.model || 'claude-sonnet-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error('No AI API key configured.');
}

// ─── GET /api/v1/sessions/[id]/ai ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const [sess] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!sess) return apiError('Session not found', 404);

  // Check if reports exist
  const [report] = await db
    .select()
    .from(sessionReports)
    .where(eq(sessionReports.sessionId, id))
    .limit(1);

  // Check if timeline quiz exists
  const quizPosts = await db
    .select({
      id: timelinePosts.id,
      body: timelinePosts.bodyRichtext,
      pollId: polls.id,
    })
    .from(timelinePosts)
    .innerJoin(polls, eq(polls.postId, timelinePosts.id))
    .where(
      and(
        eq(timelinePosts.courseId, sess.courseId),
        eq(polls.isQuizMode, true)
      )
    )
    .orderBy(desc(timelinePosts.createdAt))
    .limit(5);

  return apiSuccess({
    hasAiKey: isAiConfigured(),
    aiSummary: sess.aiSummary,
    hasTranscript: Boolean(sess.transcriptText),
    hasQuiz: quizPosts.length > 0,
    recentQuizCount: quizPosts.length,
    hasNotes: Boolean(report?.aiDraft || report?.editedContent),
    notesContent: report?.editedContent || report?.aiDraft || null,
  });
}

// ─── POST /api/v1/sessions/[id]/ai ────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { session: authSession, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const [sess] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!sess) return apiError('Session not found', 404);

  const [course] = await db.select().from(courses).where(eq(courses.id, sess.courseId)).limit(1);
  const currentUserId = authSession!.user!.id as string;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // empty body defaults to summary
  }
  const action = body.action || 'summary'; // 'quiz' | 'notes' | 'summary'

  // STRICT CHECK: Fail honestly if no AI key configured!
  if (!isAiConfigured()) {
    return apiError(
      'AI API key is not configured. Please add GEMINI_API_KEY or ANTHROPIC_API_KEY to your .env file to enable real AI generation.',
      400
    );
  }

  const contextMaterial = sess.transcriptText
    ? `SESSION TRANSCRIPT:\n${sess.transcriptText.slice(0, 8000)}`
    : `SESSION TOPIC: ${sess.topic || sess.title}\nCOURSE: ${course?.name || 'Academic Course'}\nGRADE/BOARD: ${course?.grade || ''} ${course?.board || ''}`;

  try {
    // ── 1. GENERATE QUIZ ──
    if (action === 'quiz') {
      const systemPrompt = `You are an expert curriculum evaluator. Create 3 multiple choice quiz questions based on the session material.
Output strictly a valid JSON object matching this structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Brief explanation"
    }
  ]
}
Do not include any markdown wrappers or commentary, only raw JSON.`;

      const rawAiResponse = await callAiModel(systemPrompt, contextMaterial);
      let parsed: any;
      try {
        const cleaned = rawAiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch (pErr) {
        return apiError('Failed to parse AI quiz response. Please try again.', 500);
      }

      const questions = parsed.questions || [];
      if (questions.length === 0) {
        return apiError('AI generated an empty questions list.', 500);
      }

      // Automatically post the primary question as an interactive quiz to the course timeline
      const primaryQ = questions[0];
      const [newPost] = await db
        .insert(timelinePosts)
        .values({
          courseId: sess.courseId,
          authorId: currentUserId,
          bodyRichtext: `📝 Post-Session AI Quiz: ${sess.title}\n\n${primaryQ.question}`,
          commentsDisabled: false,
        })
        .returning();

      if (newPost) {
        const [newPoll] = await db
          .insert(polls)
          .values({
            postId: newPost.id,
            isQuizMode: true,
            showResultsImmediately: true,
          })
          .returning();

        if (newPoll && Array.isArray(primaryQ.options)) {
          for (let i = 0; i < primaryQ.options.length; i++) {
            await db.insert(pollOptions).values({
              pollId: newPoll.id,
              body: primaryQ.options[i],
              isCorrect: i === (primaryQ.correctOptionIndex ?? 0),
              sortOrder: i,
            });
          }
        }
      }

      return apiSuccess({
        message: 'Quiz generated and posted to Course Timeline',
        questions,
        timelinePostId: newPost?.id,
      });
    }

    // ── 2. GENERATE REVISION NOTES ──
    if (action === 'notes') {
      const systemPrompt = `You are a world-class academic tutor. Write structured revision notes in clean Markdown for this session.
Structure:
# Revision Notes: [Session Title]
### Key Concepts Covered
- ...
### Core Definitions & Formulas
- ...
### Practice Exercises & Problem Breakdown
- ...
### Action Items & Next Steps
- ...`;

      const notesMarkdown = await callAiModel(systemPrompt, contextMaterial);

      // Save into sessionReports
      // Find learner
      const [attendee] = await db
        .select({ learnerId: sessions.educatorId })
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);

      await db
        .insert(sessionReports)
        .values({
          sessionId: id,
          learnerId: currentUserId,
          aiDraft: notesMarkdown,
          publishedAt: new Date(),
          publishedBy: currentUserId,
        })
        .catch(async () => {
          // If already exists, update
          await db
            .update(sessionReports)
            .set({ aiDraft: notesMarkdown })
            .where(eq(sessionReports.sessionId, id));
        });

      // Post revision notes summary to timeline so student can view
      await db
        .insert(timelinePosts)
        .values({
          courseId: sess.courseId,
          authorId: currentUserId,
          bodyRichtext: `📚 Revision Notes Generated: ${sess.title}\n\n${notesMarkdown.slice(0, 500)}...\n\n(Full notes available in Session Details)`,
        })
        .catch(() => {});

      return apiSuccess({
        message: 'Revision notes generated successfully',
        notes: notesMarkdown,
      });
    }

    // ── 3. GENERATE SUMMARY ──
    const summaryPrompt = `You are an educational assistant. Provide a concise 2-3 paragraph pedagogical summary of the tutoring session.
Highlight concepts discussed, student understanding, problem solving practiced, and areas for upcoming revision.`;

    const summaryText = await callAiModel(summaryPrompt, contextMaterial);

    await db
      .update(sessions)
      .set({
        aiSummary: summaryText,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));

    return apiSuccess({
      message: 'AI Summary generated successfully',
      summary: summaryText,
    });
  } catch (err: any) {
    console.error('[sessions/ai/POST] Generation error:', err);
    return apiError(err?.message || 'AI generation failed', 500);
  }
}
