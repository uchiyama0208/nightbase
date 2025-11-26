export type IndustrySlug =
  | "cabaret"
  | "lounge"
  | "club"
  | "girls-bar"
  | "concept-cafe"
  | "host"
  | "bar";

export type IndustryContent = {
  slug: IndustrySlug;
  name: string;
  shortLabel: string;
  heroTitle: string;
  heroLead: string;
  problemsTitle: string;
  problems: string[];
  solutionsTitle: string;
  solutions: string[];
  featureTitle: string;
  features: { title: string; description: string }[];
};

export const INDUSTRIES: IndustryContent[] = [
  {
    slug: "cabaret",
    name: "キャバクラ向け NightBase",
    shortLabel: "キャバクラ",
    heroTitle: "キャバクラ運営を、もっとスマートに。",
    heroLead:
      "出勤管理、指名・同伴管理、売上可視化。アナログ管理を減らして、キャストとお客様の時間にもっと集中できるキャバクラ運営を実現します。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "紙やLINEでのシフト管理がぐちゃぐちゃで、当日の出勤状況がすぐに分からない",
      "指名・同伴・場内など、売上区分ごとの集計に毎月時間がかかる",
      "新人〜売れっ子キャストまで、数字・目標・ランキングを見える化できていない"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "キャストの出勤申請〜承認〜確定シフトを一元管理。急な欠勤・遅刻の把握もスムーズに。",
      "指名・場内・ドリンクなどの売上区分を登録しておけば、日次・月次の成績を自動集計。",
      "キャストごとの売上・本数・同伴数をダッシュボードで可視化し、ランキング表示も可能。"
    ],
    featureTitle: "キャバクラ向けおすすめ機能",
    features: [
      {
        title: "キャスト出勤管理",
        description:
          "スマホから出勤申請ができ、店長は一覧で確認・調整。シフト表の共有も自動化できます。"
      },
      {
        title: "売上・バック自動集計",
        description:
          "売上区分とバック率を設定するだけで、日ごとの明細とキャスト別成績レポートを自動生成。"
      },
      {
        title: "顧客カルテと来店履歴",
        description:
          "常連様の好み・来店頻度・指名キャストを記録して、次の営業に活かせます。"
      }
    ]
  },
  {
    slug: "lounge",
    name: "ラウンジ向け NightBase",
    shortLabel: "ラウンジ",
    heroTitle: "大人ラウンジの「ちょうどいい」DX。",
    heroLead:
      "小規模〜中規模ラウンジの運営にフィットする、シンプルで使いやすい管理ツール。最低限ほしい機能だけを、洗練された画面で。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "アルバイトキャストの出勤・給与計算がエクセル管理でミスが出やすい",
      "お客様情報がママ・ボーイの頭の中にしかなく、引き継ぎが難しい",
      "売上・コストの全体像が把握しづらく、感覚経営になりがち"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "出勤・時給・各種バックを登録しておけば、キャスト別の給与見込みを自動で算出。",
      "ボトル情報や好きな会話ネタなど、お客様カルテをチームで共有。誰がついても一定以上のサービスに。",
      "日報ベースで売上と経費を入力すれば、月次の収支をグラフで把握できます。"
    ],
    featureTitle: "ラウンジ向けおすすめ機能",
    features: [
      {
        title: "出勤・給与計算ライト",
        description:
          "シフト承認と時給計算をまとめて処理。複雑なバック計算もテンプレート化できます。"
      },
      {
        title: "顧客カルテ共有",
        description:
          "担当・ボーイ・ママで顧客情報をシームレスに共有し、接客レベルを標準化。"
      },
      {
        title: "売上・コストダッシュボード",
        description:
          "日報入力だけで月次の損益状況をグラフ表示。感覚経営から数値経営へシフト。"
      }
    ]
  },
  {
    slug: "club",
    name: "クラブ向け NightBase",
    shortLabel: "クラブ",
    heroTitle: "クラブ運営を、数字でマネジメント。",
    heroLead:
      "大型クラブならではのキャスト数・卓数・イベント数を、データとオペレーションでコントロール。現場と本部の両方にとって見やすい管理画面を提供します。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "在籍キャストが多く、誰がどの卓に何分ついているか把握しづらい",
      "イベント日の売上・本数の検証ができず、企画の良し悪しが感覚になっている",
      "本部・店長・マネージャーで見たい数字がバラバラで、資料作成に時間がかかる"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "卓稼働とキャストアサインをリアルタイムに可視化し、フロア全体の最適配置を支援。",
      "イベント売上・本数・来店客層を自動で集計し、次の企画改善につなげられます。",
      "本部・店舗・現場向けに必要な指標をダッシュボードで切り替え、資料作成を省力化。"
    ],
    featureTitle: "クラブ向けおすすめ機能",
    features: [
      {
        title: "フロア稼働トラッキング",
        description:
          "卓ごとの稼働状況とキャスト滞在時間をリアルタイムに把握し、最適な付け回しを実現。"
      },
      {
        title: "イベント分析ダッシュボード",
        description:
          "イベント別に売上・本数・客層を自動比較し、投資対効果を可視化。"
      },
      {
        title: "本部レポート自動生成",
        description:
          "拠点・担当別のKPIをワンクリックで出力。週次・月次会議資料を大幅に時短します。"
      }
    ]
  },
  {
    slug: "girls-bar",
    name: "ガールズバー向け NightBase",
    shortLabel: "ガールズバー",
    heroTitle: "ガルバのカジュアルさはそのままに、裏側だけスマートに。",
    heroLead:
      "少人数・若いスタッフでも直感的に使える UI で、シフト管理と売上管理だけをきっちり。初めてのDXにちょうどいい導入ハードルです。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "掛け持ちスタッフが多く、シフトの穴が出やすい",
      "レジアプリだけでは、誰がどれだけ売っているか分かりにくい",
      "新人教育で、最低限やるべきことを伝える仕組みがない"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "シフト希望をアプリで受け付け、自動マッチングで欠員リスクを可視化。",
      "ドリンク本数や売上をスタッフ別に集計し、モチベーション向上につなげられます。",
      "新人向けのタスクチェックリストを共有し、教育の抜け漏れを防止。"
    ],
    featureTitle: "ガールズバー向けおすすめ機能",
    features: [
      {
        title: "シフト希望と自動調整",
        description:
          "スタッフがスマホで提出した希望をAIが調整し、穴のないシフトを自動生成。"
      },
      {
        title: "スタッフ別売上ダッシュボード",
        description:
          "売上・ドリンク本数・指名を一覧表示し、伸ばしたいポイントが一目で分かります。"
      },
      {
        title: "簡易マニュアル共有",
        description:
          "チェックリスト形式で教育コンテンツを共有し、初日から安心して働ける環境に。"
      }
    ]
  },
  {
    slug: "concept-cafe",
    name: "コンカフェ向け NightBase",
    shortLabel: "コンカフェ",
    heroTitle: "コンカフェの「世界観」を、数字でも支える。",
    heroLead:
      "推し活・イベント・チェキなど、コンカフェならではの売上構造を管理しやすくしつつ、キャストのモチベーションも上げられる設計に。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "チェキ・物販・イベント売上の管理が煩雑で、本当に利益が出ているか分かりづらい",
      "推しキャストごとの売れ方を把握しづらく、育成に活かせていない",
      "シフト・イベント情報をスタッフ全員に共有するのが大変"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "カテゴリ別（チェキ・物販・飲食）の売上を自動分類し、利益貢献度を見える化。",
      "推しキャストごとの指名・物販・イベント貢献度をスコア化し、育成施策に活用。",
      "イベントカレンダーとシフトを連動させ、共有・変更連絡を一つの画面で完結。"
    ],
    featureTitle: "コンカフェ向けおすすめ機能",
    features: [
      {
        title: "カテゴリ別売上管理",
        description:
          "チェキ・物販・飲食などのカテゴリを設定し、売上を自動仕分け。利益構造を明確に。"
      },
      {
        title: "推しキャスト分析レポート",
        description:
          "推し別の売上推移やイベント貢献度を可視化し、次のアクションに繋げます。"
      },
      {
        title: "イベントカレンダー連携",
        description:
          "イベント情報と出勤シフトをひとつの画面で共有し、告知から運用までを効率化。"
      }
    ]
  },
  {
    slug: "host",
    name: "ホストクラブ向け NightBase",
    shortLabel: "ホストクラブ",
    heroTitle: "ホストクラブの売上戦略を、一元管理。",
    heroLead:
      "ランキング・締め日・イベント…スピード感のあるホストクラブ運営を、リアルタイムな数字と顧客情報で支えます。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "締め日直前にしか数字が分からず、日々の動きの軌道修正がしにくい",
      "担当・ヘルプ・付け回しなど、役割が多くて売上配分が複雑",
      "イベントごとの売上検証や、長期的な指名維持率の分析ができていない"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "リアルタイムで売上とランキングを更新し、締め日前のアクションを迅速に。",
      "担当・ヘルプ・付け回しなどのロール設定に応じてバック配分を自動で計算。",
      "イベント別・期間別の指名継続率を分析し、個人戦略とチーム戦略を可視化。"
    ],
    featureTitle: "ホストクラブ向けおすすめ機能",
    features: [
      {
        title: "リアルタイム売上ダッシュボード",
        description:
          "締め日までの売上推移とランキングをリアルタイム更新し、チームの士気を高めます。"
      },
      {
        title: "ロール別売上配分管理",
        description:
          "担当・ヘルプ・付け回しの役割に応じたバック配分を自動計算。複雑な調整をゼロに。"
      },
      {
        title: "指名継続率レポート",
        description:
          "期間・イベント別に指名継続率を可視化し、リピート戦略をサポート。"
      }
    ]
  },
  {
    slug: "bar",
    name: "バー向け NightBase",
    shortLabel: "バー",
    heroTitle: "小さなバーの、頼れる「裏方スタッフ」に。",
    heroLead:
      "1〜2人で切り盛りするバーでも使える、シンプルな売上と常連管理。紙のノートから卒業しても、難しい操作は不要です。",
    problemsTitle: "こんなお悩みはありませんか？",
    problems: [
      "仕入れ・原価・売上のバランス感覚が曖昧",
      "常連さんの情報がマスターだけの頭の中にある",
      "SNSでの告知と、実際の来店状況を紐づけて見られない"
    ],
    solutionsTitle: "NightBase なら、ここまで自動化できます",
    solutions: [
      "日次売上と仕入れを入力するだけで、簡易損益を自動算出。",
      "常連カルテに好みやボトル情報を記録し、誰でも同じサービス品質に。",
      "SNSキャンペーン日を登録すると、来店データと紐づいて効果測定が可能。"
    ],
    featureTitle: "バー向けおすすめ機能",
    features: [
      {
        title: "簡易損益レポート",
        description:
          "売上と原価をシンプルに記録し、毎日の利益感覚を可視化。"
      },
      {
        title: "常連カルテとボトル管理",
        description:
          "ボトルキープ状況や好みを記録し、スタッフ交代時もスムーズに接客。"
      },
      {
        title: "キャンペーン効果測定",
        description:
          "SNS告知と来店データを紐づけ、集客施策の効果を定量的に把握。"
      }
    ]
  }
];

export const INDUSTRY_MAP: Record<IndustrySlug, IndustryContent> = INDUSTRIES.reduce(
  (acc, industry) => {
    acc[industry.slug] = industry;
    return acc;
  },
  {} as Record<IndustrySlug, IndustryContent>
);

export function getIndustryContentBySlug(slug: IndustrySlug): IndustryContent {
  return INDUSTRY_MAP[slug];
}
