import { supabaseAdmin } from "./supabaseAdmin";

export type SiteSettings = {
  store_closed: boolean;
  store_closed_message: string | null;
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("store_closed, store_closed_message")
    .eq("id", 1)
    .maybeSingle();
  return {
    store_closed: Boolean(data?.store_closed ?? false),
    store_closed_message: (data?.store_closed_message as string | null) ?? null,
  };
}


