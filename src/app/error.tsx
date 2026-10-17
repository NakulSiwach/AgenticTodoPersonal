"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <button
        type="button"
        onClick={reset}
        className="min-h-11 rounded-xl bg-indigo-600 px-5 font-semibold text-white"
      >
        Try again
      </button>
    </main>
  );
}
