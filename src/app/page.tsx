import { redirect } from "next/navigation";
import { TodoApp } from "@/components/TodoApp";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <TodoApp email={user.email ?? ""} />;
}
