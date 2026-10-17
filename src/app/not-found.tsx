import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link
        href="/"
        className="flex min-h-11 items-center rounded-xl bg-indigo-600 px-5 font-semibold text-white"
      >
        Back to your list
      </Link>
    </main>
  );
}
