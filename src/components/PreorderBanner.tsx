import { supabase } from "@/lib/supabaseClient";

type Settings = {
  preorder_start: string | null;
  preorder_end: string | null;
  pickup_info: string | null;
};

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function PreorderBanner() {
  const { data } = await supabase.from("settings").select("preorder_start, preorder_end, pickup_info").single<Settings>();
  const start = data?.preorder_start ? new Date(data.preorder_start) : null;
  const end = data?.preorder_end ? new Date(data.preorder_end) : null;
  const now = new Date();

  if (!start && !end) return null;

  let message: string | null = null;
  let tone: "info" | "warn" = "info";

  if (start && now < start) {
    message = `Pre-order opens in ${formatTimeRemaining(start.getTime() - now.getTime())}.`;
    tone = "info";
  } else if (end && now <= end) {
    message = `Pre-order closes in ${formatTimeRemaining(end.getTime() - now.getTime())}.`;
    tone = "warn";
  } else if (end && now > end) {
    message = "Pre-order is closed.";
    tone = "info";
  }

  if (!message) return null;

  return (
    <div className={tone === "warn" ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"}>
      <div className="container flex items-center justify-between gap-4 py-2 text-sm">
        <div className="font-medium">{message}</div>
        {data?.pickup_info ? (
          <div className="hidden text-xs text-muted-foreground sm:block">{data.pickup_info}</div>
        ) : null}
      </div>
    </div>
  );
}


