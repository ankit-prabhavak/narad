import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" draft>
      <p>
        These terms are a placeholder. NARAD is in early development, and the final terms will be
        written and reviewed by qualified Indian legal counsel before public launch.
      </p>
    </LegalPage>
  );
}
