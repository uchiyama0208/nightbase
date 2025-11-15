import { CaseStudyEditor } from "@/components/admin/cms/CaseStudyEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCaseStudyCreatePage() {
  return <CaseStudyEditor />;
}
