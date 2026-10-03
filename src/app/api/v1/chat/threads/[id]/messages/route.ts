import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { listMessages, sendMessage } from '@/repositories/chatRepository';
import { z } from 'zod';

const sendMessageSchema = z.object({
  body: z.string().default(''),
  kind: z.enum(['text', 'file', 'system']).default('text'),
  attachment: z
    .object({
      key: z.string(),
      url: z.string(),
      name: z.string(),
      size: z.number(),
      mime: z.string(),
    })
    .nullish(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const { id: threadId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100')));

  try {
    const messages = await listMessages(threadId, session.user.id, { limit });
    return apiSuccess(messages);
  } catch (err: any) {
    console.error('Failed to list messages:', err);
    return apiError(err.message || 'Failed to list messages', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const { id: threadId } = await params;
  const { data, error: parseError } = await parseBody(req, sendMessageSchema);
  if (parseError || !data) return parseError || apiError('Invalid request body', 400);

  if (!data.body?.trim() && !data.attachment) {
    return apiError('Message body or attachment is required', 400);
  }

  try {
    const message = await sendMessage({
      threadId,
      senderId: session.user.id,
      body: data.body,
      kind: data.kind,
      attachment: data.attachment,
    });

    return apiSuccess(message, undefined, 201);
  } catch (err: any) {
    console.error('Failed to send message:', err);
    if (err.message.includes('Forbidden')) {
      return apiError(err.message, 403);
    }
    return apiError(err.message || 'Failed to send message', 500);
  }
}
