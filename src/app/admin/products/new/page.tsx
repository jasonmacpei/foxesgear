import { requireAdminPage } from "@/lib/adminAuth";
import { ProductForm } from "../ProductForm";

export default async function AdminNewProductPage() {
  await requireAdminPage();
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">New product</h2>
      <ProductForm />
    </div>
  );
}


