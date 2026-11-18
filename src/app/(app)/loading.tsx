export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="h-40 rounded-xl bg-line" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-line" />)}</div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]"><div className="h-80 rounded-xl bg-line" /><div className="h-80 rounded-xl bg-line" /></div>
    </div>
  );
}