'use client';

import { SettingsWorkspaceClient } from '@/components/settings/SettingsWorkspaceClient';

/**
 * Backwards-compatible alias for the shared, role-aware settings workspace.
 * The single implementation now lives in
 * src/components/settings/SettingsWorkspaceClient.tsx so every portal
 * (student, parent, educator, admin) renders the same real workspace.
 */
export function SettingsClient() {
  return <SettingsWorkspaceClient role="student" />;
}

export default SettingsClient;
