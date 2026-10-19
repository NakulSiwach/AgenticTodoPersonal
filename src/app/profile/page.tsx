import { redirect } from "next/navigation";
import { ProfileApp } from "@/components/ProfileApp";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile · TaskFlow" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <ProfileApp email={user.email ?? ""} />;
}
