import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function UnregisteredPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-md p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        アカウントが見つかりません
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        このLINEアカウントに紐付いたユーザーが見つかりませんでした。
                        <br />
                        アカウントをお持ちでない場合は、新規登録を行ってください。
                    </p>
                </div>

                <div className="space-y-3 pt-2">
                    <Link href="/signup" className="block w-full">
                        <Button className="w-full">
                            新規アカウント作成
                        </Button>
                    </Link>

                    <Link href="/login" className="block w-full">
                        <Button variant="outline" className="w-full border-gray-300 dark:border-gray-600">
                            ログイン画面に戻る
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
