import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AvailabilityClientPage from '@/components/educator/AvailabilityClient';

export const dynamic = 'force-dynamic';

const EDUCATOR_ROLES = ['educator', 'owner', 'admin'];

export default async function EducatorAvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = (session.user as { role?: string }).role ?? '';
  if (!EDUCATOR_ROLES.includes(role)) redirect('/');

  // Auth is validated server-side; all data fetching happens in the client
  // component via the API routes (which re-verify auth on every request).
  return <AvailabilityClientPage />;
}
