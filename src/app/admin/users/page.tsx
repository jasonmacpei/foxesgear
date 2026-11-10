import { requireAdminPage } from "@/lib/adminAuth";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  await requireAdminPage();
  return <UsersManager />;
}
