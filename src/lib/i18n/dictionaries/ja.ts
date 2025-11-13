import type { Dictionary } from "../types";

export const ja: Dictionary = {
  metadata: {
    title: "NightBase | ナイトワークを次のステージへ", 
    description:
      "NightBaseはバー・ラウンジ・キャバクラなどのナイトワーク店舗向けに、キャスト・スタッフ・顧客・勤怠・給与・QRオーダーを一元管理できるクラウドSaaSです。"
  },
  navigation: {
    brandTagline: "夜を、もっとスマートに。",
    cta: "デモを予約",
    links: [
      { href: "/", label: "トップ" },
      { href: "/features", label: "機能" },
      { href: "/pricing", label: "料金" },
      { href: "/case-studies", label: "導入事例" },
      { href: "/blog", label: "ブログ" },
      { href: "/contact", label: "お問い合わせ" }
    ],
    localeSwitcherLabel: "言語",
    localeNames: {
      ja: "日本語",
      en: "English"
    }
  },
  footer: {
    description:
      "NightBaseは、ナイトワークビジネスに必要なすべてのオペレーションを統合し、チームの生産性と顧客体験を最大化するSaaSです。",
    links: [
      {
        title: "製品",
        items: [
          { href: "/features", label: "機能一覧" },
          { href: "/pricing", label: "料金プラン" },
          { href: "/security", label: "セキュリティ" }
        ]
      },
      {
        title: "会社情報",
        items: [
          { href: "/about", label: "NightBaseについて" },
          { href: "/company", label: "会社概要" },
          { href: "/contact", label: "お問い合わせ" }
        ]
      },
      {
        title: "リソース",
        items: [
          { href: "/case-studies", label: "導入事例" },
          { href: "/blog", label: "ブログ" },
          { href: "/privacy-policy", label: "プライバシー" }
        ]
      }
    ],
    legal: [
      { href: "/terms-of-service", label: "利用規約" },
      { href: "/privacy-policy", label: "プライバシー" }
    ],
    cta: {
      title: "NightBaseで夜の現場をアップデート",
      description: "最短3日で導入可能。専任チームが定着まで伴走します。",
      action: "デモを予約",
      href: "/contact"
    },
    copyright: "© 2025 NightBase Inc. All rights reserved."
  },
  home: {
    hero: {
      eyebrow: "Nightlife Operations OS",
      title: "ナイトワーク経営を、直感的に美しく。",
      description:
        "キャスト管理から売上分析まで、店舗運営に必要なあらゆるワークフローを一つのダッシュボードで。洗練されたUIで、現場も本部もストレスフリーに。",
      primaryCta: { label: "無料デモを申し込む", href: "/contact" },
      secondaryCta: { label: "機能を確認", href: "/features" },
      stats: [
        { label: "導入店舗数", value: "120+" },
        { label: "業務時間削減", value: "-43%" },
        { label: "顧客満足度", value: "4.9/5" }
      ]
    },
    beforeAfter: {
      title: "NightBaseで解決できる課題",
      problems: {
        title: "導入前",
        bullets: [
          "紙とExcelに分散したキャスト情報",
          "シフト調整と勤怠確認に毎週3時間",
          "売上速報が翌日までわからない"
        ]
      },
      solutions: {
        title: "導入後",
        bullets: [
          "キャスト・スタッフ情報をリアルタイム同期",
          "AIアシスタントが最適なシフトを自動提案",
          "売上・ランキングをリアルタイム分析"
        ]
      }
    },
    features: {
      title: "Appleのように美しい業務体験",
      description: "各機能は現場の声から設計。ミニマルなUIとモーションで、誰でも直感的に操作できます。",
      items: [
        {
          title: "キャスト & 顧客CRM",
          description: "プロフィール・出勤履歴・売上を一元管理。VIPランクや来店頻度も自動で可視化。",
          icon: "Users"
        },
        {
          title: "シフト・勤怠自動化",
          description: "AIが希望と売上予測を元に最適シフトを生成。打刻データと連携し、勤怠申請もスマートに。",
          icon: "CalendarRange"
        },
        {
          title: "給与・バック計算",
          description: "歩合・控除ルールを柔軟に設定。締め処理をクリック一つで完了。",
          icon: "Coins"
        },
        {
          title: "QRオーダー",
          description: "VIP席向けにカスタマイズ可能なQRオーダー。リアルタイムでキッチンと連携し、提供を高速化。",
          icon: "QrCode"
        }
      ]
    },
    uiPreview: {
      title: "統合ダッシュボードで即戦力",
      description:
        "Apple風の滑らかなアニメーションで、重要なデータが浮かび上がる。KPIカードやキャストのコンディションも一目で把握。",
      highlights: [
        "ドラッグ&ドロップでシフト調整",
        "AIサジェストでVIPフォローを提案",
        "スマホからもPC同様の操作性"
      ]
    },
    forWhom: {
      title: "ナイトワークに関わるすべての人へ",
      segments: [
        {
          title: "オーナー・経営層",
          description: "複数店舗の指標をリアルタイムで俯瞰し、意思決定を高速化。",
          benefits: ["店舗別損益レポート", "ランキングとKPI通知", "AI予測キャッシュフロー"]
        },
        {
          title: "店長・マネージャー",
          description: "シフト・勤怠・イベント運営をスムーズに。現場の負担を徹底的に削減。",
          benefits: ["ドラッグ&ドロップシフト", "勤怠アラート", "イベントテンプレート"]
        },
        {
          title: "キャスト・スタッフ",
          description: "スマホアプリで出勤・給与・顧客情報をリアルタイム確認。",
          benefits: ["給与明細の自動通知", "VIPカルテ共有", "モチベーションバッジ"]
        }
      ]
    },
    testimonials: {
      title: "現場が選ぶ理由",
      items: [
        {
          quote: "勤怠確認と売上集計にかかっていた時間が半分以下に。Appleのような操作感で、スタッフ全員がすぐに使いこなせました。",
          name: "BAR LUMINOUS",
          role: "ゼネラルマネージャー",
          avatarInitials: "BL"
        },
        {
          quote: "VIP管理の抜け漏れがゼロに。AIが次にアプローチすべき顧客を教えてくれるので、リピート率が25%向上しました。",
          name: "CLUB AURORA",
          role: "オーナー",
          avatarInitials: "CA"
        }
      ]
    },
    pricing: {
      title: "店舗規模に合わせた料金体系",
      description: "すべてのプランでセキュリティ・サポートは標準搭載。",
      plans: [
        {
          id: "starter",
          name: "Starter",
          price: "¥39,800/月",
          description: "1店舗向けの基本機能パッケージ",
          features: ["キャスト/顧客CRM", "シフト・勤怠管理", "レポートテンプレート"],
          ctaLabel: "相談する"
        },
        {
          id: "pro",
          name: "Pro",
          price: "¥79,800/月",
          description: "複数店舗と高度な自動化を求めるチームに",
          features: ["AIシフト最適化", "給与・バック自動計算", "VIP分析ダッシュボード"],
          ctaLabel: "デモを予約",
          badge: "人気"
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: "お見積もり",
          description: "大規模チェーンやカスタム要件に対応",
          features: ["専任オンボーディング", "API連携", "24/7プレミアムサポート"],
          ctaLabel: "相談する"
        }
      ]
    },
    security: {
      title: "堅牢なセキュリティ設計",
      bullets: [
        "AWS東京リージョンでの冗長構成",
        "通信はすべてTLS1.3で暗号化",
        "ロールベースアクセスと操作ログを標準搭載"
      ]
    },
    about: {
      title: "NightBaseのビジョン",
      mission: "テクノロジーでナイトワークの価値を最大化する",
      vision: "すべての夜の現場が、誇りを持てる働き方を実現する"
    },
    finalCta: {
      title: "まずは最短30分のオンラインデモから",
      description: "貴店の課題を伺いながら、最適な導入プランをご提案します。",
      primaryCta: { label: "デモを予約", href: "/contact" },
      secondaryCta: { label: "資料請求", href: "/contact" }
    }
  },
  features: {
    title: "機能一覧",
    description: "NightBaseはナイトワークの複雑なオペレーションを直感的なワークフローに再設計します。",
    sections: [
      {
        slug: "cast-crm",
        name: "キャスト & 顧客CRM",
        headline: "VIPカルテと売上トレンドをひとつの画面で",
        summary:
          "キャスト・顧客のプロフィール、来店履歴、売上貢献、VIPステータスを自動で整理。AIが次にアプローチすべき顧客を提示します。",
        highlights: [
          "顧客カルテ・タグ管理",
          "VIPリテンションスコア",
          "LINE公式との自動連携"
        ],
        metrics: [
          { label: "リピート率向上", value: "+25%" },
          { label: "入力時間削減", value: "-40%" }
        ]
      },
      {
        slug: "shift-automation",
        name: "シフト・勤怠自動化",
        headline: "AIが最適なシフトを数秒で提案",
        summary:
          "キャストの希望・売上予測・イベント予定を加味して、最適シフトを自動生成。承認フローと勤怠管理も統合されています。",
        highlights: ["AIシフトシミュレーション", "勤怠アラート", "イベント別シフトテンプレート"],
        metrics: [
          { label: "作成時間削減", value: "-3h/週" },
          { label: "残業申請削減", value: "-52%" }
        ]
      },
      {
        slug: "payroll-automation",
        name: "給与・バック管理",
        headline: "歩合・控除を自動計算し、支給をミスゼロへ",
        summary:
          "時間給・歩合・バックの複雑なルールをテンプレート化。締め処理と明細配信をワンクリックで完了。",
        highlights: ["多段階歩合の自動計算", "デジタル明細", "会計ソフト連携"],
        metrics: [
          { label: "締め処理時間", value: "-68%" },
          { label: "計算ミス", value: "0件" }
        ]
      },
      {
        slug: "qr-ordering",
        name: "QRオーダー",
        headline: "VIP席でもスマートにオーダー",
        summary:
          "座席専用のQRでオーダーを受け付け、キッチンとバックヤードに即時連携。売れ筋メニューを可視化しアップセルを促進します。",
        highlights: ["ブランドに合わせたデザイン", "オーダー進行のリアルタイム表示", "売上分析レポート"],
        metrics: [
          { label: "提供時間", value: "-35%" },
          { label: "客単価向上", value: "+18%" }
        ]
      }
    ]
  },
  pricing: {
    title: "料金プラン",
    description: "明瞭な料金体系でスムーズな導入をサポートします。",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "¥39,800/月",
        description: "1店舗向けの基本機能",
        features: ["キャスト/顧客CRM", "勤怠・シフト管理", "標準サポート"],
        ctaLabel: "相談する"
      },
      {
        id: "pro",
        name: "Pro",
        price: "¥79,800/月",
        description: "複数店舗と高度な自動化に",
        features: ["AIシフト最適化", "給与自動計算", "VIPダッシュボード"],
        ctaLabel: "デモを予約",
        badge: "人気"
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: "お見積もり",
        description: "チェーン展開やAPI連携が必要な企業に",
        features: ["専任オンボーディング", "API/BI連携", "24/7サポート"],
        ctaLabel: "相談する"
      }
    ],
    faq: [
      {
        question: "導入までの期間はどのくらいですか？",
        answer: "通常はお申し込みから最短3日、平均2週間で全店導入が完了します。既存データのインポートもサポートします。"
      },
      {
        question: "サポートはどのように提供されますか？",
        answer: "専任カスタマーサクセスがチャットとオンラインMTGで伴走。運用設計や研修資料も提供します。"
      }
    ],
    cta: {
      title: "貴店に最適なプランをご提案します",
      description: "詳細な料金や導入スケジュールはお気軽にお問い合わせください。",
      action: "専門家に相談",
      href: "/contact"
    }
  },
  caseStudies: {
    title: "導入事例",
    description: "ナイトワーク業界の先進店舗がNightBaseを選ぶ理由をご紹介します。",
    items: [
      {
        slug: "luminous",
        industry: "ラウンジ",
        title: "データドリブンな経営で売上20%アップ",
        summary:
          "NightBase導入後、VIP分析とAIシフト最適化により、売上20%アップと人件費15%削減を同時に達成。",
        quote: {
          text: "売上と勤怠がリアルタイムで連動し、意思決定が驚くほど早くなりました。",
          author: "BAR LUMINOUS",
          role: "オーナー"
        },
        metrics: [
          { label: "売上", value: "+20%" },
          { label: "人件費", value: "-15%" }
        ],
        result: "シフト自動化で残業がほぼゼロに。VIPフォローも漏れなく実施できるようになりました。"
      },
      {
        slug: "aurora",
        industry: "キャバクラ",
        title: "VIPフォロー率を25%向上",
        summary:
          "VIPカルテとアクション提案を活用し、リピート率と客単価を向上。現場のオペレーションもシンプルに。",
        quote: {
          text: "アプリのUIが洗練されていて、キャストも嫌がらず入力してくれます。",
          author: "CLUB AURORA",
          role: "マネージャー"
        },
        metrics: [
          { label: "VIP来店頻度", value: "+25%" },
          { label: "客単価", value: "+18%" }
        ],
        result: "顧客フォローの自動提案で、重要顧客へのアプローチを逃さなくなりました。"
      }
    ]
  },
  about: {
    title: "NightBaseについて",
    mission: {
      title: "Mission",
      description: "テクノロジーで夜の仕事をアップデートし、働く人の価値と時間を取り戻す。"
    },
    vision: {
      title: "Vision",
      description: "すべてのナイトワーカーが誇りと安心を持って働ける世界をつくる。"
    },
    team: [
      {
        name: "Yuji Uchiyama",
        role: "Founder / CEO",
        bio: "元ナイトワーク店舗経営者。現場知見とプロダクト開発の両輪でNightBaseを率いる。"
      },
      {
        name: "Mina Sato",
        role: "Head of Product",
        bio: "Appleや国内SaaSでのデザイン経験を活かし、洗練された体験を追求。"
      }
    ],
    company: {
      title: "Company",
      facts: [
        { label: "会社名", value: "NightBase株式会社" },
        { label: "所在地", value: "東京都渋谷区" },
        { label: "設立", value: "2022年" },
        { label: "資本金", value: "¥100,000,000" }
      ]
    }
  },
  security: {
    title: "セキュリティ",
    description:
      "NightBaseは金融機関レベルのセキュリティと運用体制で、大切なデータを守ります。",
    pillars: [
      {
        title: "技術基盤",
        items: [
          "AWS東京リージョンでのマルチAZ構成",
          "ゼロトラストネットワーク",
          "継続的な脆弱性診断"
        ]
      },
      {
        title: "データ保護",
        items: ["AES-256でのデータ暗号化", "自動バックアップとDR対策", "データマスキング"]
      },
      {
        title: "アクセス制御",
        items: ["SAML/SSO対応", "詳細な権限ロール", "監査ログとアラート"]
      }
    ],
    compliance: {
      title: "コンプライアンス",
      items: ["ISMS/Pマーク取得支援中", "個人情報保護法への準拠", "内部統制レポート"]
    }
  },
  blog: {
    title: "NightBaseブログ",
    description: "ナイトワークDXや業界ニュース、アップデート情報をお届けします。",
    posts: [
      {
        slug: "nightbase-product-update-2025",
        title: "2025年春アップデートまとめ",
        description: "AIシフト機能やUI改善など、最新アップデートをご紹介。",
        date: "2025-03-18"
      },
      {
        slug: "nightlife-dx-playbook",
        title: "ナイトワークDXプレイブック",
        description: "現場で使えるデジタル化の進め方と成功事例。",
        date: "2025-02-05"
      }
    ]
  },
  contact: {
    title: "お問い合わせ・デモ依頼",
    description: "NightBaseについてのご相談やデモのご依頼は以下のフォームからお寄せください。",
    successMessage: "送信が完了しました。担当者より2営業日以内にご連絡いたします。",
    submitLabel: "送信する",
    privacy: "送信によりプライバシーポリシーに同意したものとみなします。",
    fields: [
      {
        name: "company",
        label: "会社名 / 店舗名",
        placeholder: "NightBase株式会社",
        type: "text"
      },
      {
        name: "name",
        label: "ご担当者名",
        placeholder: "山田 太郎",
        type: "text"
      },
      {
        name: "email",
        label: "メールアドレス",
        placeholder: "name@example.com",
        type: "email"
      },
      {
        name: "message",
        label: "お問い合わせ内容",
        placeholder: "導入を検討しており、デモを希望しています。",
        type: "textarea"
      }
    ]
  },
  contactThanks: {
    title: "お問い合わせありがとうございます",
    description: "担当者が内容を確認のうえ、2営業日以内にご連絡いたします。",
    actionLabel: "トップへ戻る",
    actionHref: "/"
  },
  legal: {
    privacy: {
      title: "プライバシーポリシー",
      content: [
        "NightBase株式会社（以下「当社」）は、お客様の個人情報を適切に保護し、安心してサービスをご利用いただけるよう努めます。",
        "取得した個人情報は、サービス提供およびサポートの目的で利用し、第三者提供はお客様の同意または法令に基づく場合を除きません。",
        "当社は適切な安全管理措置を講じ、従業員および委託先に対しても必要な監督を行います。"
      ]
    },
    terms: {
      title: "利用規約",
      content: [
        "本規約は、NightBaseの各種サービス（以下「本サービス」）の利用条件を定めるものです。",
        "利用者は、本サービスを利用することにより、本規約に同意したものとみなされます。",
        "当社は、必要に応じて本規約を改定することができ、改定後の本規約は当社サイトに掲載した時点で効力を生じます。"
      ]
    },
    company: {
      title: "会社概要",
      facts: [
        { label: "会社名", value: "NightBase株式会社" },
        { label: "所在地", value: "東京都渋谷区" },
        { label: "代表取締役", value: "Yuji Uchiyama" },
        { label: "資本金", value: "¥100,000,000" }
      ]
    }
  }
};

export default ja;
