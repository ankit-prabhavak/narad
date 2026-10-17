import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <LegalPage title="About NARAD">
      <p>
        In Indian tradition, Narada is the messenger who carries news and connects people across
        distances. NARAD is a social network built in that spirit, with Indian languages at the
        center.
      </p>
      <p>
        NARAD is an independent project. It is not affiliated with any government institution. It is
        in early development, and features are being added in stages.
      </p>
    </LegalPage>
  );
}
