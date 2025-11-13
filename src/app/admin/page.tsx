import { getSiteSettings } from "@/lib/settings";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export default async function AdminDashboardPage() {
  const settings = await getSiteSettings();

  async function updateSettings(formData: FormData) {
    "use server";
    const storeClosed = formData.get("store_closed") === "on";
    const message = String(formData.get("store_closed_message") ?? "").trim();
    await supabaseAdmin
      .from("settings")
      .update({
        store_closed: storeClosed,
        store_closed_message: message || null,
      })
      .eq("id", 1);
    revalidatePath("/"); // update homepage
    revalidatePath("/shop");
    revalidatePath("/product"); // product pages are dynamic; best-effort
    revalidatePath("/admin");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Dashboard</h2>
        <p className="text-zinc-600">Sales, orders, and revenue overview will appear here.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-lg font-semibold">Store Controls</h3>
        <form action={updateSettings} className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="store_closed"
              defaultChecked={settings.store_closed}
              className="h-4 w-4"
            />
            <span>Close store temporarily</span>
          </label>
          <div>
            <div className="mb-1 text-sm text-muted-foreground">Closure message</div>
            <textarea
              name="store_closed_message"
              defaultValue={
                settings.store_closed_message ??
                "We’re currently closed and will reopen once we restock in the new year!"
              }
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none ring-0 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            />
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition hover:opacity-90"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


