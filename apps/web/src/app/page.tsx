export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">NARAD</h1>
      <p className="mt-2 text-text-muted">India&apos;s conversations, connected.</p>
      <div className="mt-6 rounded-md border border-border bg-card p-4">
        <p lang="hi">नमस्ते, यह एक परीक्षण वाक्य है।</p>
        <button className="mt-4 rounded-md bg-accent-strong px-4 py-2 text-white">
          Join NARAD
        </button>
      </div>
    </main>
  );
}
