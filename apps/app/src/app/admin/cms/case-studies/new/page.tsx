"use client";

import { CmsEditor } from "../../components/cms-editor";

export default function NewCaseStudyPage() {
    return (
        <CmsEditor
            entry={null}
            type="case_study"
            typeLabel="導入事例"
            backUrl="/admin/cms/case-studies"
        />
    );
}
