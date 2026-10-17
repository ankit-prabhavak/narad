import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Community guidelines' };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community guidelines" draft>
      <ul className="list-disc space-y-2 pl-5">
        <li>Treat people with respect. Disagreement is welcome. Harassment is not.</li>
        <li>Do not threaten, abuse or target people, or encourage others to.</li>
        <li>Do not post hateful content aimed at a person or group.</li>
        <li>Do not spam or run deceptive accounts.</li>
        <li>Do not post other people&apos;s private information.</li>
      </ul>
      <p>
        Reports will be reviewed by people, and account decisions can be appealed. The full rules
        and process will be published after legal review.
      </p>
    </LegalPage>
  );
}
