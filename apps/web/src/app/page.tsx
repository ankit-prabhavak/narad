import Link from 'next/link';
import { Eyebrow } from '@/components/eyebrow';

const primary =
  'inline-block rounded-md bg-btn px-5 py-2.5 font-medium text-btn-text transition-opacity hover:opacity-85';
const secondary =
  'inline-block rounded-md border border-border px-5 py-2.5 font-medium transition-colors hover:bg-bg-secondary';

const toc = [
  ['how', 'How it works'],
  ['today', 'Working today'],
  ['next', 'Coming next'],
  ['languages', 'Languages'],
  ['faq', 'Questions'],
];

const steps = [
  ['Create an account', 'Sign up with an email and pick a handle. Verify the email we send you.'],
  ['Make it yours', 'Add a bio in any script and decide whether your account is private.'],
  ['Follow people', 'Open a profile and follow it. Private accounts approve each follower.'],
];

const today = [
  ['Accounts', 'Email verification, password reset, and sessions you can end at any time.'],
  ['Profiles', 'A display name and a bio, written in any script.'],
  ['Following', 'Follow, unfollow, and approve requests on private accounts.'],
  ['Block and mute', 'Control who can see and reach you.'],
];

const next = [
  ['Posts', 'Write, reply, like and repost.'],
  ['Home feed', 'What the people you follow are saying, newest first.'],
  ['Search', 'People, posts and hashtags.'],
  ['Translation', 'Optional and clearly labelled. Your original words always stay.'],
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

const faq = [
  [
    'Can I post yet?',
    'Not yet. Accounts, profiles and following work today. Posting is the next thing being built.',
  ],
  [
    'Which languages work?',
    'Text in any script is stored and shown correctly. The interface is English for now, and Hindi is planned next.',
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

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14">
      <Eyebrow>{n}</Eyebrow>
      <h2 className="mt-2 text-3xl sm:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Cards({ items }: { items: string[][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([title, body]) => (
        <div key={title} className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-lg">{title}</h3>
          <p className="mt-1 text-text-muted">{body}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-5">
      <aside className="hidden w-44 shrink-0 lg:block">
        <nav aria-label="On this page" className="sticky top-24 py-14">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-muted">
            On this page
          </p>
          <ul className="space-y-2 border-l border-border text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a
                  href={'#' + id}
                  className="-ml-px block border-l border-transparent pl-4 text-text-muted transition-colors hover:border-text hover:text-text"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 max-w-2xl flex-1 pb-20">
        <section className="py-16 sm:py-24">
          <Eyebrow>A social network for India</Eyebrow>
          <h1 className="mt-4 text-5xl sm:text-6xl">Say it in the language you think in.</h1>
          <p className="mt-6 max-w-xl text-lg text-text-muted">
            NARAD lets people follow each other and talk in their own language. It is early, and
            this page says plainly what works and what does not.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={primary}>
              Create an account
            </Link>
            <Link href="/#how" className={secondary}>
              How it works
            </Link>
          </div>

          <figure className="mt-12 overflow-hidden rounded-lg border border-border bg-bg-secondary">
            <figcaption className="flex items-center justify-between border-b border-border px-4 py-2 font-mono text-xs text-text-muted">
              <span>Example post</span>
              <span>Demo content</span>
            </figcaption>
            <div className="space-y-4 p-5">
              <div>
                <p className="font-mono text-xs text-text-muted">@aarav_demo · हिन्दी</p>
                <p className="mt-1 text-lg">बारिश में चाय का मज़ा ही कुछ और है।</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="font-mono text-xs text-text-muted">@meera_demo · English</p>
                <p className="mt-1 text-lg">
                  Just moved to a new city. What is the one place I must eat at?
                </p>
              </div>
            </div>
          </figure>
          <p className="mt-2 text-xs text-text-muted">
            Illustration with fictional people. Posting is not available yet.
          </p>
        </section>

        <Section id="how" n="01 · How it works" title="Three steps to your first follow.">
          <ol className="space-y-3">
            {steps.map(([title, body], i) => (
              <li key={title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
                <span className="font-mono text-sm text-accent">0{i + 1}</span>
                <div>
                  <h3 className="text-lg">{title}</h3>
                  <p className="mt-1 text-text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="today" n="02 · Live" title="Working today.">
          <Cards items={today} />
        </Section>

        <Section id="next" n="03 · In development" title="Coming next.">
          <Cards items={next} />
        </Section>

        <Section id="languages" n="04 · Languages" title="Built for many scripts.">
          <p className="mb-6 text-text-muted">
            English and Hindi come first. The others follow, one at a time.
          </p>
          <ul className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <li key={l} className="rounded-md border border-border bg-card px-3.5 py-1.5 text-lg">
                {l}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="faq" n="05 · FAQ" title="Questions.">
          <div className="divide-y divide-border border-y border-border">
            {faq.map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 font-semibold">
                  {q}
                  <span className="font-mono text-text-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2 text-text-muted">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-muted">
            More in the{' '}
            <Link href="/guidelines" className="text-text underline underline-offset-4">
              community guidelines
            </Link>{' '}
            (draft).
          </p>
        </Section>
      </div>
    </div>
  );
}
