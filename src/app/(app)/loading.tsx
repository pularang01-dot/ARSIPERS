export default function Loading() {
  return (
    <div className="animate-pulse space-y-9" aria-busy="true" aria-label="Memuat">
      <div className="space-y-4">
        <div className="h-3 w-56 rounded bg-line" />
        <div className="h-11 w-2/3 max-w-xl rounded bg-line" />
        <div className="h-5 w-1/2 max-w-md rounded bg-line" />
        <div className="mt-6 h-[7px] border-y border-line-strong" />
      </div>
      <div className="grid gap-4 border-b border-line pb-6 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded bg-line" />)}</div>
      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr]"><div className="h-96 rounded-xl bg-line" /><div className="h-96 rounded-xl bg-line" /></div>
    </div>
  );
}