import { AdminNav } from "./admin-nav";
import { requireAdmin } from "@/lib/auth";

// Admin is enforced here (404 for non-admins) AND in Postgres (assert_admin / is_admin()).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="grid gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
