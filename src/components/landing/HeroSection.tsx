import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
            <div className="container relative z-10">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
                    <div className="flex flex-col items-start gap-6 text-left">
                        <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                            <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                            ナイトワーク専用クラウド管理システム
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:leading-tight">
                            夜のお店の管理、<br className="hidden md:block" />
                            <span className="text-blue-600">これひとつで。</span>
                        </h1>
                        <p className="text-lg text-slate-600 md:text-xl max-w-lg leading-relaxed">
                            顧客管理・シフト・売上・バック計算まで。<br />
                            煩雑な店舗運営をスマートに一元管理できる、<br className="md:hidden" />
                            ナイトワーク特化型SaaS。
                        </p>
                        <div className="flex flex-col w-full sm:flex-row gap-4 mt-2">
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 text-base shadow-lg shadow-blue-600/20" asChild>
                                <Link href="/contact">
                                    デモを予約する
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                            <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base border-slate-200 text-slate-600 hover:bg-slate-50" asChild>
                                <Link href="#features">
                                    機能を詳しく見る
                                </Link>
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden">
                                        {/* Placeholder for user avatars */}
                                        <div className="w-full h-full bg-slate-200" />
                                    </div>
                                ))}
                            </div>
                            <p>多くの店舗様にご利用いただいています</p>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[400px] perspective-1000">
                        {/* Mobile Mockup Container */}
                        <div className="relative z-10 rounded-[2.5rem] border-[8px] border-slate-900 bg-slate-900 shadow-2xl overflow-hidden aspect-[9/19]">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-6 bg-slate-900 rounded-b-xl z-20"></div>
                            <div className="w-full h-full bg-white overflow-hidden relative">
                                {/* Placeholder for App Screen */}
                                <div className="absolute inset-0 bg-slate-50 flex flex-col">
                                    <div className="h-14 bg-white border-b border-slate-100 flex items-center justify-center px-4">
                                        <div className="w-24 h-4 bg-slate-200 rounded-full"></div>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-24 h-20 bg-blue-50 rounded-xl flex-shrink-0 border border-blue-100"></div>
                                            ))}
                                        </div>
                                        <div className="h-32 bg-white rounded-xl border border-slate-100 shadow-sm p-3 space-y-2">
                                            <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
                                            <div className="w-full h-2 bg-slate-50 rounded"></div>
                                            <div className="w-full h-2 bg-slate-50 rounded"></div>
                                        </div>
                                        <div className="h-32 bg-white rounded-xl border border-slate-100 shadow-sm p-3 space-y-2">
                                            <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
                                            <div className="w-full h-2 bg-slate-50 rounded"></div>
                                            <div className="w-full h-2 bg-slate-50 rounded"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -z-10"></div>
                        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl -z-10"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
