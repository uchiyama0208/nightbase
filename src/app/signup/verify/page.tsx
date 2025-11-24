import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function SignupVerifyPage() {
    return (
        <div className="container mx-auto px-4 py-8 pt-24 flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4 w-16 h-16 flex items-center justify-center">
                        <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                        確認メールを送信しました
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                        ご登録いただいたメールアドレスに確認リンクを送信しました。<br />
                        メール内のリンクをクリックして、登録を完了してください。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                        <p>メールが届かない場合は、迷惑メールフォルダをご確認いただくか、しばらく待ってから再度お試しください。</p>
                    </div>

                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        <Link href="/login">
                            ログインページへ戻る
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
