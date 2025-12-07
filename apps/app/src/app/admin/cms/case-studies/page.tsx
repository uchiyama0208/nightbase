"use client";

import { CmsList } from "../components/cms-list";

export default function CaseStudiesListPage() {
    return (
        <CmsList
            type="case_study"
            typeLabel="導入事例"
            description="Nightbaseの導入事例を管理します"
            basePath="/admin/cms/case-studies"
        />
    );
}
