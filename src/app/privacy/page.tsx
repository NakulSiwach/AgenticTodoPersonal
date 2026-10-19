import Link from "next/link";

export const metadata = { title: "Privacy policy · TaskFlow" };

// Public page (listed in PUBLIC_PREFIXES). Linked from the Google OAuth consent screen, which
// requires a privacy policy on the app's own domain. Keep it in step with what the code does.
const UPDATED = "20 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 leading-relaxed text-neutral-800 dark:text-neutral-200">
      <div>
        <h1 className="text-2xl font-bold">TaskFlow privacy policy</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Last updated {UPDATED}</p>
      </div>

      <p>
        TaskFlow is a personal to-do app. This page explains what it stores, why, and who can see it. TaskFlow has
        no ads, no analytics or tracking, and never sells or shares your data.
      </p>

      <Section title="What TaskFlow stores">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your account: email address and a password (stored hashed by our sign-in provider).</li>
          <li>
            Your tasks and settings: titles, notes, due dates, priorities, lists, tags, subtasks, display name,
            timezone and email preferences.
          </li>
          <li>
            If you connect Google Calendar: your Google account&apos;s email address, the id of the
            &quot;TaskFlow&quot; calendar the app creates, and an access token for it, stored encrypted.
          </li>
        </ul>
      </Section>

      <Section title="Google Calendar">
        <p>
          Connecting Google Calendar is optional. TaskFlow asks only for permission to create its own secondary
          calendar (named &quot;TaskFlow&quot;) and manage events in it. It cannot see, change or delete your other
          calendars or events.
        </p>
        <p>
          TaskFlow uses this access for one purpose: to copy your tasks that have a due date into that calendar and
          keep them up to date. It does not read events you add yourself, and Google data is never used for
          advertising, sold, or shared with anyone.
        </p>
        <p>
          TaskFlow&apos;s use and transfer of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="font-medium text-indigo-600 underline dark:text-indigo-400"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          You can disconnect at any time in Profile → Calendar, optionally deleting the TaskFlow calendar. This
          revokes TaskFlow&apos;s access and deletes the stored token. You can also remove access at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="font-medium text-indigo-600 underline dark:text-indigo-400"
          >
            myaccount.google.com/permissions
          </a>
          .
        </p>
      </Section>

      <Section title="Who processes your data">
        <p>TaskFlow runs on these services, which handle data only to provide the app:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase: database and sign-in.</li>
          <li>Vercel: hosting.</li>
          <li>Resend: sends the optional daily email, if you turn it on.</li>
          <li>Google: your calendar, if you connect it.</li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          Connections use HTTPS. Each account can only read its own data (enforced by the database). Google tokens are
          encrypted and are never sent to the browser.
        </p>
      </Section>

      <Section title="Deleting your data">
        <p>
          Deleting a task removes it, and its calendar event, straight away. To delete your whole account and
          everything in it, contact the person who runs this TaskFlow site.
        </p>
      </Section>

      <Link href="/" className="inline-block font-medium text-indigo-600 underline dark:text-indigo-400">
        Back to TaskFlow
      </Link>
    </main>
  );
}
