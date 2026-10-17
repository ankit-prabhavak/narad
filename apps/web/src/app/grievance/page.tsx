import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Grievance' };

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance and complaints" draft>
      <p>
        Complaints will be acknowledged, tracked and answered within deadlines that are set after
        legal review. The way to reach the grievance officer, including their name and contact
        details, will be published here before launch.
      </p>
      <p>Until then, this page does not offer a working complaint channel.</p>
    </LegalPage>
  );
}
