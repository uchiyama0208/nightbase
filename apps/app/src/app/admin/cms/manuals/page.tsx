"use client";

import { CmsList } from "../components/cms-list";

export default function ManualsListPage() {
    return (
        <CmsList
            type="manual"
            typeLabel="マニュアル"
            description="Nightbaseの使い方マニュアルを管理します"
            basePath="/admin/cms/manuals"
        />
    );
}
