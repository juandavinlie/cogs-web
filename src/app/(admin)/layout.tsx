import { requireAdmin } from "@/lib/auth";
import AdminNav from "./AdminNav";

// Shared by /events, /members and /attendance_records. Non-admins get a 404.
// Pages and actions also check the role themselves, and RLS enforces it in the database.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
