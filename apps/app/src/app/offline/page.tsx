import { Metadata } from 'next'
import { ReloadButton } from "./reload-button";

export const metadata: Metadata = {
    title: 'Offline | NightBase App',
}

export default function OfflinePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background text-foreground">
            <h1 className="text-2xl font-bold mb-4">オフラインです</h1>
            <p className="text-muted-foreground mb-4">
                インターネット接続を確認してください。
            </p>
            <ReloadButton />
        </div>
    )
}
