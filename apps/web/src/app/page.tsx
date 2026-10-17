import Link from 'next/link';
import { HeroIllustration } from '@/components/hero-illustration';

const primary =
  'inline-block rounded-md bg-accent-strong px-5 py-2.5 font-medium text-white hover:opacity-90';
const secondary =
  'inline-block rounded-md border border-border bg-card px-5 py-2.5 font-medium hover:bg-bg-secondary';

const features = [
  {
    title: 'Conversations across Indian languages',
    body: 'Write in the language you think in. Read posts in the languages you choose.',
  },
  {
    title: 'Discover people and ideas beyond your region',
    body: 'Find voices from other states and communities, not just your own corner.',
  },
  {
    title: 'Follow topics and communities that matter',
    body: 'Follow people and topics, and keep the conversations you care about in one place.',
  },
  {
    title: 'Your account, your controls',
    body: 'Private accounts, blocking and muting are built in, and you decide who interacts with you.',
  },
];

const steps = [
  { n: '1', title: 'Create your account', body: 'Sign up with your email and pick a handle.' },
  {
    n: '2',
    title: 'Choose your languages',
    body: 'Tell NARAD which languages you read and write.',
  },
  { n: '3', title: 'Join the conversation', body: 'Follow people, share your thoughts and reply.' },
];

const principles = [
  'Respect people. Disagree with ideas, not with who someone is.',
  'No harassment, threats or hate.',
  'Report anything that breaks the rules. Reports are reviewed by people.',
  'Decisions can be appealed.',
];

const languages = [
  { name: 'English', native: 'English', live: true },
  { name: 'Hindi', native: 'हिन्दी', live: true },
  { name: 'Bengali', native: 'বাংলা', live: false },
  { name: 'Tamil', native: 'தமிழ்', live: false },
  { name: 'Telugu', native: 'తెలుగు', live: false },
  { name: 'Marathi', native: 'मराठी', live: false },
  { name: 'Gujarati', native: 'ગુજરાતી', live: false },
  { name: 'Kannada', native: 'ಕನ್ನಡ', live: false },
  { name: 'Malayalam', native: 'മലയാളം', live: false },
  { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', live: false },
  { name: 'Odia', native: 'ଓଡ଼ିଆ', live: false },
  { name: 'Assamese', native: 'অসমীয়া', live: false },
  { name: 'Urdu', native: 'اردو', live: false },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            India has a <span className="text-accent">lot</span> to say.
          </h1>
          <p className="text-lg text-text-muted">
            One place for ideas, conversations, and voices in the languages you call home.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className={primary}>
              Join NARAD
            </Link>
            <Link href="/explore" className={secondary}>
              Explore conversations
            </Link>
          </div>
        </div>
        <HeroIllustration />
      </section>

      <section className="border-y border-border bg-bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-md border border-border bg-card p-5">
                <h2 className="text-lg font-semibold">{f.title}</h2>
                <p className="mt-1 text-text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-text-muted">
            NARAD is in early development. Some of what is described here is still being built.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold">How NARAD works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n} className="rounded-md border border-border bg-card p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-strong font-semibold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="text-text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="languages" className="border-y border-border bg-bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="text-2xl font-semibold">Languages</h2>
          <p className="mt-2 max-w-2xl text-text-muted">
            NARAD starts with English and Hindi and will add more Indian languages step by step.
            Your original words are always kept exactly as you wrote them.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {languages.map((l) => (
              <li
                key={l.name}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm"
                title={l.live ? l.name : l.name + ' (planned)'}
              >
                <span>{l.native}</span>
                {l.live ? null : <span className="ml-2 text-xs text-text-muted">planned</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Safety principles</h2>
        <ul className="mt-4 list-disc space-y-1 pl-5">
          {principles.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-4">
          <Link href="/guidelines" className="text-accent-strong underline">
            Read the community guidelines (draft)
          </Link>
        </p>
      </section>

      <section className="border-t border-border bg-bg-secondary">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-14 text-center">
          <h2 className="text-3xl font-semibold">Ready to say something?</h2>
          <Link href="/register" className={primary}>
            Join NARAD
          </Link>
        </div>
      </section>
    </>
  );
}
