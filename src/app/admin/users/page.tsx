import { requireOwnerPage } from "@/lib/adminAuth";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  await requireOwnerPage();
  return <UsersManager />;
}
