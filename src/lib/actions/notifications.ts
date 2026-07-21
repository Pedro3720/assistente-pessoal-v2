"use server";

import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionInput } from "@/lib/validation/notifications";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  return { supabase, userId: user.id };
}

export async function savePushSubscription(raw: unknown) {
  const input = pushSubscriptionInput.parse(raw);
  const { supabase, userId } = await ctx();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase } = await ctx();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
