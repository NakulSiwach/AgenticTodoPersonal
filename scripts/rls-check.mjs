// Verifies Row Level Security with two real accounts. Usage: node --env-file=.env.local scripts/rls-check.mjs
// Creates two throwaway accounts, then checks A's data is invisible and untouchable to B.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const stamp = Date.now();
const password = `Pw-${stamp}-x!`;
let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? ` (${extra})` : ""}`);
  if (!ok) failures++;
};

async function account(tag) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  const email = `rlscheck.${tag}.${stamp}@gmail.com`;
  const { data, error } = await c.auth.signUp({ email, password });
  if (error || !data.session) throw new Error(`signup ${tag}: ${error?.message ?? "no session"}`);
  return { c, id: data.user.id, email };
}

const a = await account("a");
const b = await account("b");

const { data: row, error: insErr } = await a.c
  .from("todos")
  .insert({ title: "A private todo", priority: 0 })
  .select()
  .single();
check("A can insert own todo", !insErr && row?.user_id === a.id, insErr?.message);

const { data: bList } = await b.c.from("todos").select("*");
check("B cannot read A's todo", bList?.length === 0, `rows=${bList?.length}`);

const { data: bUpd } = await b.c.from("todos").update({ title: "hacked" }).eq("id", row.id).select();
check("B cannot update A's todo", (bUpd?.length ?? 0) === 0);

const { data: bDel } = await b.c.from("todos").delete().eq("id", row.id).select();
check("B cannot delete A's todo", (bDel?.length ?? 0) === 0);

const { error: spoofErr } = await b.c
  .from("todos")
  .insert({ title: "spoof", user_id: a.id });
check("B cannot insert a row owned by A", !!spoofErr, spoofErr?.code);

const { data: aAfter } = await a.c.from("todos").select("*").eq("id", row.id).single();
check("A's todo is intact", aAfter?.title === "A private todo");

const { error: badPri } = await a.c.from("todos").insert({ title: "bad", priority: 9 });
check("DB rejects priority 9", !!badPri, badPri?.code);
const { error: badColor } = await a.c.from("todos").insert({ title: "bad", text_color: "neon" });
check("DB rejects unknown color", !!badColor, badColor?.code);

const { data: done } = await a.c.from("todos").update({ completed: true }).eq("id", row.id).select().single();
check("completed_at set by trigger", !!done?.completed_at);
const { data: undone } = await a.c.from("todos").update({ completed: false }).eq("id", row.id).select().single();
check("completed_at cleared on uncomplete", undone?.completed_at === null);

// google_calendar_links holds OAuth tokens: signed-in users get no access at all (server only).
const { data: gRead, error: gReadErr } = await a.c.from("google_calendar_links").select("*");
check(
  "Users cannot read google_calendar_links",
  gReadErr?.code === "42501" || (!gReadErr && gRead?.length === 0),
  gReadErr ? `${gReadErr.code}${gReadErr.code === "PGRST205" ? ": run migration 0004" : ""}` : `rows=${gRead?.length}`,
);
const { error: gInsErr } = await a.c
  .from("google_calendar_links")
  .insert({ user_id: a.id, calendar_id: "x", refresh_token_enc: "x" });
check("Users cannot write google_calendar_links", gInsErr?.code === "42501", gInsErr?.code);

await a.c.from("todos").delete().eq("id", row.id);
console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll RLS checks passed");
console.log(`(throwaway accounts left in Supabase Auth: ${a.email}, ${b.email})`);
process.exit(failures ? 1 : 0);
