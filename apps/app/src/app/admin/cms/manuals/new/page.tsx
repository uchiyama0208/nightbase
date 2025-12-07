"use client";

import { CmsEditor } from "../../components/cms-editor";

export default function NewManualPage() {
    return (
        <CmsEditor
            entry={null}
            type="manual"
            typeLabel="マニュアル"
            backUrl="/admin/cms/manuals"
        />
    );
}
