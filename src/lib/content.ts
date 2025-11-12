export const featureList = [
  {
    title: "店舗管理ダッシュボード",
    description: "売上・稼働・在庫を一元管理し、ナイトワーク経営をデータドリブンに。",
    icon: "💼"
  },
  {
    title: "勤怠・給与自動計算",
    description: "QR打刻とIP検証で不正を排除し、複雑な歩合計算を自動化。",
    icon: "🕓"
  },
  {
    title: "QRオーダー連携",
    description: "テーブルオーダーをリアルタイム連携し、オペレーションを高速化。",
    icon: "🧾"
  },
  {
    title: "キャスト/スタッフアプリ",
    description: "成果指標とランキングでモチベーションを可視化。",
    icon: "🧑‍💼"
  },
  {
    title: "顧客CRM & ランキング",
    description: "VIP顧客の来店管理から営業リストまで一元化。",
    icon: "🎯"
  }
] as const;

export type FeatureSlug = "attendance" | "order" | "crm" | "payroll" | "dashboard";

export const featureDetails: Record<FeatureSlug, {
  title: string;
  description: string;
  highlights: string[];
  metrics: { label: string; value: string }[];
}> = {
  dashboard: {
    title: "店舗管理ダッシュボード",
    description:
      "店舗運営に必要なKPIをリアルタイムに可視化し、意思決定スピードを飛躍的に高めます。",
    highlights: [
      "AI予測による売上シミュレーション",
      "キャスト別/セクション別パフォーマンス比較",
      "スマホ・タブレット完全対応"
    ],
    metrics: [
      { label: "平均売上向上", value: "+28%" },
      { label: "日次レポート工数削減", value: "-12h/月" },
      { label: "導入満足度", value: "4.9/5" }
    ]
  },
  attendance: {
    title: "勤怠・給与自動計算",
    description:
      "QRコードと位置情報で勤怠を正確に計測し、シフト承認から給与確定まで完全自動化。",
    highlights: [
      "キャストごとの歩合・指名料計算に対応",
      "タイムカード改ざんをゼロに",
      "給与明細をアプリで即時配信"
    ],
    metrics: [
      { label: "計算ミス削減", value: "-96%" },
      { label: "給与確定時間", value: "6時間→15分" },
      { label: "スタッフ満足度", value: "4.8/5" }
    ]
  },
  order: {
    title: "QRオーダー連携",
    description:
      "テーブルからのオーダーをリアルタイム連携し、提供時間と売上の最大化を支援します。",
    highlights: [
      "POS/キッチンディスプレイ連携",
      "在庫アラートと仕入れサジェスト",
      "ハイボリューム対応の高信頼性"
    ],
    metrics: [
      { label: "提供リードタイム", value: "-42%" },
      { label: "客単価", value: "+18%" },
      { label: "オーダーミス", value: "-90%" }
    ]
  },
  crm: {
    title: "顧客CRM & ランキング",
    description:
      "顧客の嗜好・来店履歴・ランクを一元管理し、キャストの営業活動を科学します。",
    highlights: [
      "VIP顧客の自動スコアリング",
      "来店予測とリマインダーメール",
      "LINE公式アカウント連携"
    ],
    metrics: [
      { label: "リピート率", value: "+35%" },
      { label: "営業リードタイム", value: "-55%" },
      { label: "顧客満足度", value: "4.8/5" }
    ]
  },
  payroll: {
    title: "給与ワークフロー",
    description:
      "社会保険・税金・歩合・控除の複雑な条件をテンプレート化し、監査ログも自動生成。",
    highlights: [
      "税率・控除の自動更新",
      "CSV/会計ソフト連携",
      "電子帳簿保存法に準拠"
    ],
    metrics: [
      { label: "給与確定スピード", value: "10x" },
      { label: "監査対応時間", value: "-70%" },
      { label: "コスト削減", value: "-25%" }
    ]
  }
};

export const caseStudies = [
  {
    slug: "luxe-lounge",
    title: "Luxe Lounge",
    industry: "ラウンジ",
    summary: "導入後6ヶ月でVIPリピート率が48%向上。",
    body:
      "夜間ピーク帯のオーダー遅延が課題だったLuxe Loungeは、NightBaseのQRオーダーと勤怠管理を導入。提供時間の短縮とキャストアサインの最適化により、顧客満足度が大幅に改善しました。"
  },
  {
    slug: "nocturne",
    title: "Club Nocturne",
    industry: "キャバクラ",
    summary: "給与計算の自動化でバックオフィス工数を80%削減。",
    body:
      "手作業の給与計算から解放されたClub Nocturneでは、給与締め処理が1日から30分に短縮。キャストアプリの導入で日報提出率も97%に。"
  },
  {
    slug: "stardust",
    title: "Stardust Bar",
    industry: "バー",
    summary: "データ活用により客単価が25%アップ。",
    body:
      "CRMとダッシュボードの導入で来店分析とキャンペーン施策が高速化。スタッフの営業効率が向上し、顧客獲得コストも削減されました。"
  }
] as const;

export const pricingPlans = [
  {
    name: "Starter",
    price: "¥39,800",
    description: "単店舗・スモールチーム向けの基本プラン",
    highlight: "最短1日で導入完了",
    features: [
      "キャスト/スタッフ管理",
      "勤怠・給与自動化",
      "QRオーダー連携 (最大5テーブル)",
      "メールサポート"
    ]
  },
  {
    name: "Pro",
    price: "¥79,800",
    description: "複数店舗運営と本部管理に対応",
    highlight: "人気No.1",
    features: [
      "マルチ店舗ダッシュボード",
      "CRM & ランキング",
      "アプリブランディング",
      "24/7チャットサポート"
    ],
    featured: true
  },
  {
    name: "Enterprise",
    price: "お見積り",
    description: "大規模チェーン・特別要件向け",
    highlight: "専任カスタマーサクセス",
    features: [
      "カスタムインテグレーション",
      "専用インフラオプション",
      "SLA 99.99%",
      "現地導入支援"
    ]
  }
] as const;

export const blogPosts = [
  {
    slug: "nightwork-dx-strategy",
    title: "ナイトワークDX戦略入門",
    excerpt: "NightBaseが提案する、データと現場をつなぐDXロードマップ。",
    date: "2024-05-18"
  },
  {
    slug: "cast-engagement",
    title: "キャストエンゲージメントを高める3つのポイント",
    excerpt: "歩合設計・評価指標・アプリ活用で成果を最大化。",
    date: "2024-04-25"
  },
  {
    slug: "night-industry-trends",
    title: "2024年ナイト業界トレンドレポート",
    excerpt: "顧客体験とオペレーションのハイブリッド化が加速。",
    date: "2024-03-30"
  }
] as const;

export const securityHighlights = [
  {
    title: "Supabase + Vercel + Stripe",
    description: "クラウドネイティブな信頼基盤と高速デリバリーを実現。"
  },
  {
    title: "SOC2 / ISO27001 対応",
    description: "第三者機関による監査に基づくセキュリティマネジメント。"
  },
  {
    title: "エンドツーエンド暗号化",
    description: "キャストや顧客のセンシティブデータをAES-256で保護。"
  } 
] as const;
