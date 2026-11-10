import { requireAdminPage } from "@/lib/adminAuth";
import { getSeasons } from "@/lib/seasons";
import { SeasonsManager } from "./SeasonsManager";

export const dynamic = "force-dynamic";
export default async function SeasonsPage() {
  await requireAdminPage();
  return <SeasonsManager seasons={await getSeasons()} />;
}
