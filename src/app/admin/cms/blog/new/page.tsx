import { AdminProtected } from "@/components/admin/AdminProtected";
import { BlogEditor } from "@/components/admin/cms/BlogEditor";

export default function AdminBlogCreatePage() {
  return (
    <AdminProtected>
      {() => <BlogEditor />}
    </AdminProtected>
  );
}
