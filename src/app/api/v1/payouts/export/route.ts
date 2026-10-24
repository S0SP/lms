import { type NextRequest } from 'next/server';
import { requireAuth, apiError } from '@/lib/api';
import { payoutService } from '@/services/payoutService';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const role = (session.user as any).role as string;
  const userId = session.user.id as string;
  const { searchParams } = new URL(req.url);

  try {
    const result = await payoutService.getPayouts({
      role,
      userId,
      educatorId: searchParams.get('educatorId') || undefined,
      status: searchParams.get('status') || undefined,
      page: 1,
      perPage: 1000,
    });

    const payouts = result.payouts || [];

    const headers = ['Payout ID', 'Period', 'Status', 'Sessions Delivered', 'Amount', 'Currency', 'Paid At', 'Created At'];
    const rows = payouts.map((p: any) => [
      `"${p.id || ''}"`,
      `"${p.period || p.monthYear || 'Monthly'}"`,
      `"${p.status || 'pending'}"`,
      p.totalSessions || p.sessionCount || 0,
      p.amount || 0,
      `"${p.currency || 'INR'}"`,
      `"${p.paidAt ? new Date(p.paidAt).toISOString() : 'N/A'}"`,
      `"${p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="educator_payout_statement_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Export statement error:', err);
    return apiError('Failed to generate payout statement', 500);
  }
}
