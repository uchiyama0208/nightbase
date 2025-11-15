import { BlogEditor } from "@/components/admin/cms/BlogEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminBlogCreatePage() {
  return <BlogEditor />;
}
