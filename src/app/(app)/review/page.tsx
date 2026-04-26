import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function ReviewEntryPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("user_review_responses")
    .select("topic_slug, reviewed_at")
    .eq("user_id", user.id)
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.topic_slug) {
    redirect(`/review/${data.topic_slug}`);
  }

  redirect("/topics");
}
