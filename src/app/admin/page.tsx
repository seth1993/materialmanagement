'use client';

import { AuditLogViewer } from '@/components/admin';
import { Navigation } from '@/components/Navigation';

export default function AdminPage() {
  return (
    <>
      <Navigation />
      <AuditLogViewer />
    </>
  );
}
