import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Explore' };

export default function ExplorePage() {
  return (
    <LegalPage title="Explore">
      <p>
        Public conversations will appear here once posting is built, which is the next phase of
        NARAD.
      </p>
    </LegalPage>
  );
}
