import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal-page';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" draft>
      <p>
        This describes what NARAD currently stores. It will be rewritten and reviewed by qualified
        Indian legal counsel, including against the Digital Personal Data Protection Act and Rules,
        before any public launch.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Your email address, handle, display name and bio.</li>
        <li>A secure hash of your password. Your password itself is never stored.</li>
        <li>Session records, including a browser description, so you can stay signed in.</li>
        <li>Your follows, blocks and mutes, and your privacy settings.</li>
      </ul>
      <p>
        Rights to export or delete your data will be provided, and the process will be described
        here.
      </p>
    </LegalPage>
  );
}
