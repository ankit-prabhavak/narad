import { CircleHelp, Lock, PenLine, ShieldOff, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

const primary =
  'inline-block rounded-md bg-btn px-5 py-2.5 font-medium text-btn-text transition-opacity hover:opacity-85';
const secondary =
  'inline-block rounded-md border border-border px-5 py-2.5 font-medium transition-colors hover:bg-bg-secondary';

const features: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: PenLine,
    title: 'Write in your language',
    body: 'Post in English or Hindi, with more languages on the way. Your original words are always kept.',
  },
  {
    icon: Users,
    title: 'Follow people',
    body: 'Follow the voices you care about and read what they share in your home feed.',
  },
  {
    icon: Lock,
    title: 'Private accounts',
    body: 'Approve every follower, and keep your follower lists to yourself.',
  },
  {
    icon: ShieldOff,
    title: 'Block and mute',
    body: 'Decide who can see you and whose posts you would rather not read.',
  },
];

const steps: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: UserPlus,
    title: 'Create your account',
    body: 'Sign up with an email and pick a handle. Verify the email we send you.',
  },
  { icon: PenLine, title: 'Share something', body: 'Write a post in the language you think in.' },
  {
    icon: Users,
    title: 'Follow people',
    body: 'Open a profile and follow it. Private accounts approve each follower.',
  },
];

const languages = [
  'English',
  'हिन्दी',
  'বাংলা',
  'தமிழ்',
  'తెలుగు',
  'मराठी',
  'ગુજરાતી',
  'ಕನ್ನಡ',
  'മലയാളം',
  'ਪੰਜਾਬੀ',
  'ଓଡ଼ିଆ',
  'অসমীয়া',
  'اردو',
];

const comingNext = [
  'Likes, replies and reposts',
  'Photos and profile pictures',
  'Search and hashtags',
  'Messages',
  'Optional translation',
];

const faq = [
  [
    'Can I post yet?',
    'Yes. You can write text posts in English or Hindi, and follow people to see theirs in your home feed. Likes, replies and images are being built next.',
  ],
  [
    'Which languages work?',
    'Text in any script is stored and shown correctly. The interface is in English for now, and Hindi is planned next.',
  ],
  [
    'Will there be images, video and messages?',
    'Photos and profile pictures are planned first, then messages. Video comes last, because it needs the most safety work.',
  ],
  [
    'Is my password stored?',
    'No. Only a salted Argon2id hash is stored, so the password itself cannot be read back.',
  ],
  [
    'Is NARAD run by the government?',
    'No. It is an independent project and is not affiliated with any government body.',
  ],
  [
    'How do I report a problem?',
    'Reporting is being built. There is no working complaint channel yet, and the grievance page will say when there is.',
  ],
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      <section className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-5xl sm:text-6xl">Say it in the language you think in.</h1>
          <p className="mt-6 max-w-md text-lg text-text-muted">
            NARAD is a social network for India. Follow people and talk in your own language.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={primary}>
              Create an account
            </Link>
            <Link href="/login" className={secondary}>
              Sign in
            </Link>
          </div>
        </div>

        <figure className="overflow-hidden rounded-lg border border-border bg-bg-secondary">
          <div className="space-y-4 p-5">
            <div>
              <p className="text-sm text-text-muted">@aarav_demo · हिन्दी</p>
              <p className="mt-1 text-lg">बारिश में चाय का मज़ा ही कुछ और है।</p>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-sm text-text-muted">@meera_demo · English</p>
              <p className="mt-1 text-lg">
                Just moved to a new city. What is the one place I must eat at?
              </p>
            </div>
          </div>
          <figcaption className="border-t border-border px-5 py-2 text-xs text-text-muted">
            Sample posts by fictional people.
          </figcaption>
        </figure>
      </section>

      <section className="border-t border-border py-14">
        <h2 className="text-3xl">What you can do</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-card p-6">
              <f.icon size={22} className="text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-lg">{f.title}</h3>
              <p className="mt-1 text-text-muted">{f.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-text-muted">On the way: {comingNext.join(', ')}.</p>
      </section>

      <section id="how" className="scroll-mt-24 border-t border-border py-14">
        <h2 className="text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li key={s.title} className="rounded-lg border border-border bg-card p-6">
              <s.icon size={22} className="text-accent" aria-hidden="true" />
              <h3 className="mt-3 text-lg">{s.title}</h3>
              <p className="mt-1 text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="languages" className="scroll-mt-24 border-t border-border py-14">
        <h2 className="text-3xl">Built for many scripts</h2>
        <p className="mt-2 text-text-muted">
          English and Hindi come first. The others follow, one at a time.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {languages.map((l) => (
            <li key={l} className="rounded-md border border-border bg-card px-3.5 py-1.5 text-lg">
              {l}
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="scroll-mt-24 border-t border-border py-14">
        <h2 className="text-3xl">Questions</h2>
        <div className="mt-8 grid items-start gap-4 sm:grid-cols-2">
          {faq.map(([q, a]) => (
            <details key={q} className="group rounded-lg border border-border bg-card p-6">
              <CircleHelp size={22} className="text-accent" aria-hidden="true" />
              <summary className="mt-3 flex items-start justify-between gap-4 text-lg font-bold">
                {q}
                <span className="text-text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-1 text-text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-16 text-center">
        <h2 className="text-3xl">Ready to say something?</h2>
        <div className="mt-6">
          <Link href="/register" className={primary}>
            Create an account
          </Link>
        </div>
      </section>
    </div>
  );
}
