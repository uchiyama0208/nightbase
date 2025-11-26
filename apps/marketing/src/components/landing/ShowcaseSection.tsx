import Image from "next/image";

export function ShowcaseSection() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        ITが苦手な方でも、<br className="md:hidden" />
                        直感的に使えるUI
                    </h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        マニュアルを見なくても使える、Apple製品のようなシンプルさ。<br />
                        現場のスタッフが「使いたくなる」デザインを追求しました。
                    </p>
                </div>

                <div className="relative">
                    {/* Background decoration */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-slate-50/0 via-slate-50/50 to-slate-50/0 -z-10 rounded-[100%] blur-3xl"></div>

                    <div className="grid md:grid-cols-3 gap-8 items-center">
                        {/* Left Card */}
                        <div className="relative group md:translate-y-12">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="p-4 border-b border-slate-50">
                                    <h3 className="font-bold text-slate-900">3タップで出勤登録</h3>
                                </div>
                                <div className="aspect-[9/16] bg-slate-50 relative">
                                    {/* Placeholder UI */}
                                    <div className="absolute inset-4 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
                                        <div className="w-full h-8 bg-blue-600 rounded-lg opacity-90"></div>
                                        <div className="w-full h-8 bg-slate-100 rounded-lg"></div>
                                        <div className="mt-auto w-full h-12 bg-blue-600 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Center Card (Main) */}
                        <div className="relative z-10">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl blur opacity-30"></div>
                            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform md:scale-110">
                                <div className="p-5 border-b border-slate-50">
                                    <h3 className="font-bold text-lg text-slate-900 text-center">リアルタイム売上分析</h3>
                                </div>
                                <div className="aspect-[9/16] bg-slate-50 relative">
                                    {/* Placeholder UI */}
                                    <div className="absolute inset-0 p-6 flex flex-col gap-4">
                                        <div className="w-full h-32 bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                                            <div className="w-20 h-4 bg-slate-100 rounded mb-2"></div>
                                            <div className="w-32 h-8 bg-slate-800 rounded"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                                            <div className="h-24 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                                        </div>
                                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Card */}
                        <div className="relative group md:translate-y-12">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                                <div className="p-4 border-b border-slate-50">
                                    <h3 className="font-bold text-slate-900">自動でバック計算</h3>
                                </div>
                                <div className="aspect-[9/16] bg-slate-50 relative">
                                    {/* Placeholder UI */}
                                    <div className="absolute inset-4 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-2">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                                                <div className="w-20 h-3 bg-slate-100 rounded"></div>
                                                <div className="w-12 h-3 bg-slate-200 rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
