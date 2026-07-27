"use server";

import { requireUser } from "@/lib/auth/session";
import { pushEndpointParam } from "@/lib/validation/common";
import { pushSubscriptionInput } from "@/lib/validation/notifications";

export async function savePushSubscription(raw: unknown) {
  const input = pushSubscriptionInput.parse(raw);
  const { supabase, userId } = await requireUser();
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
  const ep = pushEndpointParam.parse(endpoint);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", ep);
  if (error) throw new Error(error.message);
}
