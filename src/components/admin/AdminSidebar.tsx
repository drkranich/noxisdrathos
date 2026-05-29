import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export function AdminSidebar() {

  const {
    isSuperAdmin,
    rolesLoading,
  } = useAuth();

  if (rolesLoading) {
    return null;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <Link to="/app/admin/content">
        CMS
      </Link>

      <Link to="/app/admin/media">
        Media
      </Link>

      <Link to="/app/admin/uploads">
        Uploads
      </Link>

      <Link to="/app/admin/members">
        Members
      </Link>

      <Link to="/app/admin/collections">
        Collections
      </Link>
    </>
  );
}
