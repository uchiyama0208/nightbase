"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
    Image as ImageIcon,
    UtensilsCrossed,
    Camera,
    Zap,
    History,
    ChevronLeft,
    Wand2,
    Loader2,
    Upload,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import type { StoreCredits, GeneratedImage, ReferenceImage, ImageUsageMode } from "./actions";
import { generateImage, getGeneratedImages, purchaseCredits } from "./actions";
import { formatJSTDateTime } from "@/lib/utils";
import { VercelTabs } from "@/components/ui/vercel-tabs";

// クレジット購入プラン
const creditPlans = [
    { id: "plan-10", credits: 10, price: 500, label: "10クレジット", description: "お試しプラン" },
    { id: "plan-30", credits: 30, price: 1200, label: "30クレジット", description: "1クレジットあたり¥40", popular: true },
    { id: "plan-100", credits: 100, price: 3500, label: "100クレジット", description: "1クレジットあたり¥35" },
];

interface AICreateContentProps {
    initialCredits: StoreCredits | null;
    initialHistory: GeneratedImage[];
    canEdit?: boolean;
}

type CardType = "poster" | "menu" | "photo" | "signboard" | null;

interface MenuCard {
    id: CardType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    imageUrl?: string;
}

const menuCards: MenuCard[] = [
    {
        id: "poster",
        title: "ポスター",
        description: "イベントや告知用のポスターを生成",
        icon: <ImageIcon className="h-8 w-8" />,
        color: "text-pink-600 dark:text-pink-400",
        bgColor: "bg-pink-50 dark:bg-pink-900/20",
        imageUrl: "/images/templates/halloween.webp",
    },
    {
        id: "menu",
        title: "メニュー表",
        description: "おしゃれなメニュー表を生成",
        icon: <UtensilsCrossed className="h-8 w-8" />,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
        imageUrl: undefined,
    },
    {
        id: "photo",
        title: "宣材写真",
        description: "プロモーション用の写真を生成",
        icon: <Camera className="h-8 w-8" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        imageUrl: undefined,
    },
    {
        id: "signboard",
        title: "看板",
        description: "店舗看板・サイネージを生成",
        icon: <ImageIcon className="h-8 w-8" />,
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-50 dark:bg-purple-900/20",
        imageUrl: undefined,
    },
];

const sizePresets = [
    { id: "square", name: "正方形", width: 2048, height: 2048, ratio: "1:1" },
    { id: "portrait", name: "縦長", width: 1536, height: 2048, ratio: "3:4" },
    { id: "landscape", name: "横長", width: 2048, height: 1536, ratio: "4:3" },
    { id: "story", name: "ストーリー", width: 1152, height: 2048, ratio: "9:16" },
    { id: "wide", name: "ワイド", width: 2048, height: 1152, ratio: "16:9" },
    { id: "custom", name: "カスタム", width: 1024, height: 1024, ratio: "自由" },
];

// ポスター用デザインプリセット（雰囲気・スタイルのみ）
const designPresets = [
    {
        id: "luxury-gold",
        name: "黒×ゴールド",
        prompt: "ゴールドとブラックを基調とした高級感のあるデザイン。シャンデリアのような輝き、キラキラと光るパーティクル効果。豪華で洗練された雰囲気。"
    },
    {
        id: "sexy-pink",
        name: "ピンク×パープル",
        prompt: "ピンクとパープルのセクシーなグラデーション。グリッターエフェクト、妖艶で魅惑的な雰囲気、大人の色気漂うデザイン。"
    },
    {
        id: "cool-silver",
        name: "黒×シルバー",
        prompt: "ブラックとシルバーを基調としたクールなデザイン。メタリックな質感、シャープなライン、モダンでスタイリッシュな印象。"
    },
    {
        id: "neon-night",
        name: "ネオン",
        prompt: "ネオンカラーが輝くデザイン。ピンクとブルーのネオングロー効果、ダークな背景に映える都会的でクールな雰囲気。"
    },
    {
        id: "elegant-rose",
        name: "ローズ＆フラワー",
        prompt: "深紅の薔薇とローズゴールドの上品なデザイン。花びらが舞う演出、フェミニンで美しい雰囲気。"
    },
    {
        id: "sparkle-glitter",
        name: "キラキラ",
        prompt: "キラキラと輝くグリッターエフェクト。スパークリングな演出、華やかで煌びやかな雰囲気。宝石のような輝き。"
    },
    {
        id: "japanese-modern",
        name: "和モダン",
        prompt: "日本の粋を現代風にアレンジ。金箔、和柄のモチーフ。黒と金と赤の配色で、高級感と和の美しさを融合。"
    },
    {
        id: "pastel-soft",
        name: "パステル",
        prompt: "柔らかいパステルカラーのデザイン。ピンク、ラベンダー、ミントなど優しい色合い。ふんわりと可愛らしい雰囲気。"
    },
    {
        id: "custom",
        name: "カスタム",
        prompt: ""
    },
];

interface Template {
    id: string;
    name: string;
    prompt: string;
    imageUrl?: string;
    // ポスター用の構造化データ
    posterData?: {
        title: string;
        subtitle?: string;
        body?: string;
        footer?: string;
        designPresetId: string;
        customDesign?: string;
    };
}

const templatesByCategory: Record<string, Template[]> = {
    poster: [
        // ===== イベント系 =====
        {
            id: "poster-1",
            name: "シャンパンタワー",
            prompt: "",
            imageUrl: "/images/templates/champagne-tower.webp",
            posterData: {
                title: "CHAMPAGNE TOWER NIGHT",
                subtitle: "12.25 SAT / OPEN 21:00",
                body: "最高級シャンパンで乾杯\n特別な夜をあなたに",
                footer: "CLUB ELEGANCE",
                designPresetId: "custom",
                customDesign: "シャンパンタワーがそびえ立つ豪華絢爛なデザイン。ゴールドとブラックを基調に、シャンパンの泡が舞い上がるエフェクト。シャンデリアの輝き、高級クラブの華やかな雰囲気。"
            }
        },
        {
            id: "poster-2",
            name: "周年イベント",
            prompt: "",
            imageUrl: "/images/templates/anniversary.webp",
            posterData: {
                title: "5th ANNIVERSARY",
                subtitle: "Thank you for 5 years",
                body: "日頃のご愛顧に感謝を込めて\nスペシャルイベント開催",
                footer: "2024.1.20 SAT / CLUB LUXE",
                designPresetId: "custom",
                customDesign: "周年記念の格式高いデザイン。王冠やティアラのモチーフ、紙吹雪とバルーン、ゴールドのリボン装飾。感謝と祝福を込めた豪華で記念碑的な雰囲気。"
            }
        },
        {
            id: "poster-3",
            name: "バースデーイベント",
            prompt: "",
            imageUrl: "/images/templates/birthday.webp",
            posterData: {
                title: "MISAKI BIRTHDAY",
                subtitle: "♕ 1.15 SAT ♕",
                body: "一緒にお祝いしてください",
                footer: "シャンパンタワー開催",
                designPresetId: "custom",
                customDesign: "バースデーの華やかなお祝いデザイン。シャンパンタワーとバースデーケーキ、バルーンと紙吹雪、ゴールドとピンクの配色。パーティークラッカーのエフェクト。"
            }
        },
        {
            id: "poster-4",
            name: "カウントダウン",
            prompt: "",
            posterData: {
                title: "COUNTDOWN PARTY",
                subtitle: "2024 → 2025",
                body: "年越しは当店で\nシャンパンで乾杯",
                footer: "12.31 / OPEN 21:00",
                designPresetId: "custom",
                customDesign: "カウントダウンパーティーの華やかなデザイン。時計と花火、シャンパングラス、ゴールドとネイビーの配色。新年を迎える特別感とパーティー感。"
            }
        },
        {
            id: "poster-5",
            name: "フリードリンク",
            prompt: "",
            posterData: {
                title: "ALL DRINKS FREE",
                subtitle: "飲み放題イベント",
                body: "2時間飲み放題\n¥5,000",
                footer: "毎週水曜開催",
                designPresetId: "custom",
                customDesign: "ドリンクフリーの賑やかなデザイン。カクテルグラスやボトルが並ぶ、ネオンカラーとブラックの配色。お得感と楽しさを感じるポップな雰囲気。"
            }
        },
        {
            id: "poster-6",
            name: "コスプレイベント",
            prompt: "",
            posterData: {
                title: "COSPLAY NIGHT",
                subtitle: "なりきり Night",
                body: "コスプレ来店で\nドリンク1杯無料",
                footer: "毎月最終土曜開催",
                designPresetId: "custom",
                customDesign: "コスプレイベントのポップで華やかなデザイン。カラフルな配色、星やキラキラエフェクト、アニメ風の装飾。楽しくて非日常感のある雰囲気。"
            }
        },
        // ===== 季節イベント =====
        {
            id: "poster-7",
            name: "ハロウィンナイト",
            prompt: "",
            imageUrl: "/images/templates/halloween.webp",
            posterData: {
                title: "HALLOWEEN NIGHT",
                subtitle: "10.31 THU",
                body: "仮装コンテスト開催\n優勝賞金10万円",
                footer: "CLUB NOIR",
                designPresetId: "custom",
                customDesign: "ハロウィンのミステリアスなデザイン。パープルとオレンジの妖艶な配色、かぼちゃとコウモリのモチーフ、月明かりと霧のエフェクト。セクシーで妖しい雰囲気。"
            }
        },
        {
            id: "poster-8",
            name: "クリスマスパーティー",
            prompt: "",
            posterData: {
                title: "CHRISTMAS PARTY",
                subtitle: "12.24 TUE / Holy Night",
                body: "キャストと過ごす\n特別なクリスマス",
                footer: "シャンパンで乾杯",
                designPresetId: "custom",
                customDesign: "クリスマスの華やかなデザイン。赤とゴールドの配色、クリスマスツリーとイルミネーション、雪の結晶とキラキラした装飾。温かみのある聖夜の雰囲気。"
            }
        },
        {
            id: "poster-9",
            name: "バレンタイン",
            prompt: "",
            posterData: {
                title: "VALENTINE NIGHT",
                subtitle: "2.14 FRI",
                body: "キャストから\nチョコのプレゼント",
                footer: "甘いひとときを",
                designPresetId: "custom",
                customDesign: "バレンタインのロマンチックなデザイン。ピンクと赤のグラデーション、ハートモチーフと薔薇の花びら、チョコレートのような甘く上品な雰囲気。"
            }
        },
        {
            id: "poster-11",
            name: "浴衣イベント",
            prompt: "",
            posterData: {
                title: "浴衣 NIGHT",
                subtitle: "夏の特別企画",
                body: "浴衣で来店\n料金20%OFF",
                footer: "7月・8月限定",
                designPresetId: "custom",
                customDesign: "夏祭りの和モダンなデザイン。打ち上げ花火と提灯、浴衣をイメージした涼しげなブルーと鮮やかな赤。金魚や風鈴のモチーフ、日本の夏の風情。"
            }
        },
        {
            id: "poster-13",
            name: "お正月",
            prompt: "",
            posterData: {
                title: "NEW YEAR",
                subtitle: "謹賀新年",
                body: "新年会のご予約\n承り中",
                footer: "1月限定特典あり",
                designPresetId: "custom",
                customDesign: "お正月の華やかな和デザイン。紅白と金の配色、鶴や松竹梅のモチーフ、御来光のイメージ。おめでたく格式高い新年の雰囲気。"
            }
        },
        // ===== キャスト関連 =====
        {
            id: "poster-14",
            name: "新人デビュー",
            prompt: "",
            posterData: {
                title: "NEW FACE",
                subtitle: "新人デビュー",
                body: "MISAKI\n毎週金曜出勤",
                footer: "会いに来てね♡",
                designPresetId: "custom",
                customDesign: "新人デビューの清楚で期待感あるデザイン。柔らかいパステルピンクとホワイト、花びらと光のエフェクト、フレッシュで可愛らしい印象。初々しさと輝き。"
            }
        },
        {
            id: "poster-16",
            name: "昇格発表",
            prompt: "",
            posterData: {
                title: "昇格",
                subtitle: "Congratulations",
                body: "MISAKI\n副主任に昇格",
                footer: "今後ともよろしくお願いします",
                designPresetId: "custom",
                customDesign: "昇格発表の格式高いデザイン。ゴールドの装飾、王冠やリボンのモチーフ、紙吹雪エフェクト。祝福と期待感のある豪華な雰囲気。"
            }
        },
        {
            id: "poster-17",
            name: "ラスト出勤",
            prompt: "",
            posterData: {
                title: "LAST DAY",
                subtitle: "ありがとうございました",
                body: "YUKI\n3年間の感謝を込めて",
                footer: "12.28 SAT / 最後の夜",
                designPresetId: "custom",
                customDesign: "卒業・ラスト出勤の感動的なデザイン。花束とリボン、淡いピンクとゴールドの配色。感謝と寂しさを込めた、温かみのある雰囲気。"
            }
        },
        {
            id: "poster-18",
            name: "キャスト募集",
            prompt: "",
            posterData: {
                title: "CAST募集",
                subtitle: "一緒に働きませんか？",
                body: "未経験OK\n日払い可能",
                footer: "詳しくはお問い合わせください",
                designPresetId: "custom",
                customDesign: "求人募集のおしゃれなデザイン。ピンクとゴールドの配色、キラキラしたエフェクト、女性らしく華やかな雰囲気。働きたくなるような魅力的な印象。"
            }
        },
        // ===== 店舗告知 =====
        {
            id: "poster-19",
            name: "VIPルーム",
            prompt: "",
            posterData: {
                title: "VIP ROOM",
                subtitle: "Premium Private Space",
                body: "完全個室\nご予約承り中",
                footer: "特別な夜をあなたに",
                designPresetId: "custom",
                customDesign: "VIPルームの重厚で高級感あるデザイン。ブラックレザーとゴールドの配色、シャンデリアと高級ソファ、プライベート空間の特別感。選ばれた者だけの贅沢な雰囲気。"
            }
        },
        {
            id: "poster-20",
            name: "グランドオープン",
            prompt: "",
            posterData: {
                title: "GRAND OPEN",
                subtitle: "新規オープン",
                body: "オープン記念\n初回料金50%OFF",
                footer: "2024.4.1 OPEN",
                designPresetId: "custom",
                customDesign: "グランドオープンの華やかなデザイン。紙吹雪とバルーン、ゴールドとレッドの配色、リボンカット演出。お祝いムード全開の賑やかな雰囲気。"
            }
        },
        {
            id: "poster-21",
            name: "リニューアル",
            prompt: "",
            posterData: {
                title: "RENEWAL OPEN",
                subtitle: "生まれ変わりました",
                body: "店内全面改装\nさらに豪華に",
                footer: "リニューアル記念イベント開催",
                designPresetId: "custom",
                customDesign: "リニューアルオープンのモダンなデザイン。シルバーとブルーの洗練された配色、新しさを感じるクリーンなエフェクト。期待感のある爽やかな雰囲気。"
            }
        },
        {
            id: "poster-22",
            name: "システム紹介",
            prompt: "",
            posterData: {
                title: "SYSTEM",
                subtitle: "料金システム",
                body: "セット料金 ¥5,000\n指名料 ¥2,000\n延長30分 ¥3,000",
                footer: "初回限定割引あり",
                designPresetId: "custom",
                customDesign: "料金システム紹介のシンプルで見やすいデザイン。ブラックとゴールドの配色、エレガントなフォント、わかりやすいレイアウト。高級感のある上品な雰囲気。"
            }
        },
        // ===== 特典・サービス =====
        {
            id: "poster-23",
            name: "初回割引",
            prompt: "",
            posterData: {
                title: "初回限定",
                subtitle: "WELCOME CAMPAIGN",
                body: "セット料金\n50% OFF",
                footer: "ご新規様限定",
                designPresetId: "custom",
                customDesign: "初回割引キャンペーンの目を引くデザイン。ゴールドと赤の配色、大きく目立つ数字、お得感を感じるポップな雰囲気。来店したくなる印象。"
            }
        },
        {
            id: "poster-26",
            name: "SNSフォロー特典",
            prompt: "",
            posterData: {
                title: "FOLLOW US",
                subtitle: "SNSフォローで特典",
                body: "Instagram フォローで\nドリンク1杯無料",
                footer: "@club_example",
                designPresetId: "custom",
                customDesign: "SNSキャンペーンのモダンなデザイン。グラデーションカラー、スマートフォンやSNSアイコン風の装飾。若々しくトレンド感のある雰囲気。"
            }
        },
        // ===== コンカフェ・ガルバ向け =====
        {
            id: "poster-27",
            name: "メイドカフェ風",
            prompt: "",
            posterData: {
                title: "おかえりなさいませ",
                subtitle: "ご主人様♡お嬢様♡",
                body: "萌え萌えキュン♡\nチェキ会開催中",
                footer: "MAID CAFE",
                designPresetId: "custom",
                customDesign: "メイドカフェ風の可愛らしいデザイン。パステルピンクとホワイト、リボンとフリルの装飾、ハートと星のエフェクト。ファンシーで萌え感のある雰囲気。"
            }
        },
    ],
    menu: [
        { id: "menu-1", name: "カクテルメニュー", prompt: "おしゃれなカクテルメニュー表。カラフルなカクテルグラスのイラスト、モダンでスタイリッシュなレイアウト、黒背景にネオンカラーのアクセント" },
        { id: "menu-2", name: "ボトルメニュー", prompt: "高級ボトルメニュー表。シャンパンやウイスキーのボトルイメージ、ゴールドとブラックの高級感あるデザイン、価格帯別にセクション分け" },
        { id: "menu-3", name: "フードメニュー", prompt: "フードメニュー表。美味しそうな料理写真風イラスト、温かみのあるデザイン、食欲をそそる暖色系の配色" },
        { id: "menu-4", name: "季節限定メニュー", prompt: "季節限定メニュー表。旬のフルーツを使ったカクテルイメージ、季節感のある装飾、特別感を演出するデザイン" },
        { id: "menu-5", name: "ノンアルメニュー", prompt: "ノンアルコールドリンクメニュー表。フレッシュなフルーツジュースやモクテルのイメージ、爽やかでヘルシーな雰囲気、パステルカラー" },
        { id: "menu-6", name: "シャンパンタワー料金", prompt: "シャンパンタワー料金表。豪華なタワーのイラスト、サイズ別の料金表示、ゴールドを基調とした華やかなデザイン" },
    ],
    photo: [
        { id: "photo-1", name: "プロフィール写真", prompt: "キャバクラキャストのプロフィール写真風画像。美しい女性のポートレート、柔らかいライティング、高級感のある背景、プロフェッショナルな仕上がり" },
        { id: "photo-2", name: "ドレス姿", prompt: "エレガントなドレスを着た女性の宣材写真。豪華なシャンデリアのある背景、グラマラスでセクシーな雰囲気、高級クラブのイメージ" },
        { id: "photo-3", name: "和装スタイル", prompt: "着物や振袖を着た女性の宣材写真。和モダンな背景、上品で凛とした雰囲気、伝統と現代の融合" },
        { id: "photo-4", name: "カジュアルスタイル", prompt: "カジュアルな私服姿の宣材写真。親しみやすい雰囲気、明るい自然光、カフェや街中の背景" },
        { id: "photo-5", name: "グループショット", prompt: "複数のキャストが並んだグループ写真。統一感のあるドレスコード、チームワークを感じさせる雰囲気、店舗の華やかさを演出" },
        { id: "photo-6", name: "バースデー演出", prompt: "バースデーケーキとシャンパンを持つ女性の写真。お祝いムード、キラキラしたデコレーション、幸せそうな表情" },
        { id: "photo-7", name: "接客シーン", prompt: "お客様をおもてなしするキャストの写真。ソファに座って会話する様子、温かみのある照明、プロフェッショナルな接客イメージ" },
        { id: "photo-8", name: "シャンパンコール", prompt: "シャンパンボトルを持ち上げるシャンパンコールの瞬間。華やかなライティング、盛り上がった雰囲気、パーティー感" },
    ],
    signboard: [
        // ===== 店名看板 =====
        { id: "signboard-storename-maid", name: "店名看板（メイド）", prompt: "メイドカフェ風の可愛らしい店名看板。パステルピンクとホワイト、リボンとフリルの装飾、ハートと星のキラキラエフェクト。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-gakuen", name: "店名看板（学園）", prompt: "学園風の青春感ある店名看板。セーラー服やブレザーをイメージした紺とホワイトの配色、桜や校舎のモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-hospital", name: "店名看板（病院）", prompt: "ナース・病院風の清潔感ある店名看板。白とピンクの配色、注射器やハートの心電図モチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-sister", name: "店名看板（シスター）", prompt: "シスター・教会風の神聖な店名看板。深い紫とゴールドの配色、ステンドグラスや十字架のモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-police", name: "店名看板（ポリス）", prompt: "ポリス・警察風のクールな店名看板。ネイビーとゴールドの配色、警察バッジや手錠のモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-idol", name: "店名看板（アイドル）", prompt: "アイドル風のキラキラした店名看板。ピンクと水色のグラデーション、星とペンライトのモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-succubus", name: "店名看板（サキュバス）", prompt: "サキュバス・悪魔風のセクシーな店名看板。深紅と黒の配色、悪魔の翼やハートのモチーフ、妖艶な雰囲気。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-fantasy", name: "店名看板（ファンタジー）", prompt: "ファンタジー・魔法使い風の神秘的な店名看板。紫と青のグラデーション、魔法陣や星のモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-jirai", name: "店名看板（地雷系）", prompt: "地雷系の病みかわいい店名看板。黒とピンクの配色、リボンとハートと泣き顔のモチーフ、ダークでガーリーな雰囲気。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-gothic", name: "店名看板（ゴシック）", prompt: "ゴシック・ゴスロリ風のダークで美しい店名看板。黒と深紅の配色、薔薇や蝶や十字架のモチーフ。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        { id: "signboard-storename-cyber", name: "店名看板（サイバー）", prompt: "サイバーパンク風の近未来的な店名看板。ネオンピンクとシアンの配色、デジタルグリッチエフェクト、ホログラム風の演出。店名「{店名}」を大きく表示。営業時間「{営業時間}」と基本料金「{料金}」を下部に配置。" },
        // ===== 内容看板 =====
        { id: "signboard-content-maid", name: "内容看板（メイド）", prompt: "メイドカフェ風の可愛らしいサービス内容看板。パステルピンクとホワイト、リボンとフリルの装飾。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-gakuen", name: "内容看板（学園）", prompt: "学園風の青春感あるサービス内容看板。紺とホワイトの配色、黒板風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-hospital", name: "内容看板（病院）", prompt: "ナース・病院風の清潔感あるサービス内容看板。白とピンクの配色、カルテ風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-sister", name: "内容看板（シスター）", prompt: "シスター・教会風の神聖なサービス内容看板。紫とゴールドの配色、ステンドグラス風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-police", name: "内容看板（ポリス）", prompt: "ポリス・警察風のクールなサービス内容看板。ネイビーとゴールドの配色、指名手配風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-idol", name: "内容看板（アイドル）", prompt: "アイドル風のキラキラしたサービス内容看板。ピンクと水色のグラデーション、ライブチケット風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-succubus", name: "内容看板（サキュバス）", prompt: "サキュバス・悪魔風のセクシーなサービス内容看板。深紅と黒の配色、契約書風の妖艶なデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-fantasy", name: "内容看板（ファンタジー）", prompt: "ファンタジー風の神秘的なサービス内容看板。紫と青のグラデーション、魔法書風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-jirai", name: "内容看板（地雷系）", prompt: "地雷系の病みかわいいサービス内容看板。黒とピンクの配色、日記風のダークガーリーなデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-gothic", name: "内容看板（ゴシック）", prompt: "ゴシック・ゴスロリ風のダークで美しいサービス内容看板。黒と深紅の配色、アンティーク風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        { id: "signboard-content-cyber", name: "内容看板（サイバー）", prompt: "サイバーパンク風の近未来的なサービス内容看板。ネオンピンクとシアンの配色、ホログラムUI風のデザイン。店名「{店名}」をタイトルに、サービス内容と料金表を見やすくレイアウト。" },
        // ===== フッター看板 =====
        { id: "signboard-footer-maid", name: "フッター看板（メイド）", prompt: "メイドカフェ風の可愛らしいフッター看板。パステルピンクとホワイト。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-gakuen", name: "フッター看板（学園）", prompt: "学園風の青春感あるフッター看板。紺とホワイトの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-hospital", name: "フッター看板（病院）", prompt: "ナース・病院風の清潔感あるフッター看板。白とピンクの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-sister", name: "フッター看板（シスター）", prompt: "シスター・教会風の神聖なフッター看板。紫とゴールドの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-police", name: "フッター看板（ポリス）", prompt: "ポリス・警察風のクールなフッター看板。ネイビーとゴールドの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-idol", name: "フッター看板（アイドル）", prompt: "アイドル風のキラキラしたフッター看板。ピンクと水色のグラデーション。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-succubus", name: "フッター看板（サキュバス）", prompt: "サキュバス・悪魔風のセクシーなフッター看板。深紅と黒の配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-fantasy", name: "フッター看板（ファンタジー）", prompt: "ファンタジー風の神秘的なフッター看板。紫と青のグラデーション。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-jirai", name: "フッター看板（地雷系）", prompt: "地雷系の病みかわいいフッター看板。黒とピンクの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-gothic", name: "フッター看板（ゴシック）", prompt: "ゴシック・ゴスロリ風のダークで美しいフッター看板。黒と深紅の配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
        { id: "signboard-footer-cyber", name: "フッター看板（サイバー）", prompt: "サイバーパンク風の近未来的なフッター看板。ネオンピンクとシアンの配色。店名「{店名}」、営業時間「{営業時間}」、住所・連絡先を横長にコンパクトに配置。SNSアイコン付き。" },
    ],
};

export function AICreateContent({
    initialCredits,
    initialHistory,
    canEdit,
}: AICreateContentProps) {
    const { toast } = useToast();
    const [credits, setCredits] = useState(initialCredits);
    const [history, setHistory] = useState<GeneratedImage[]>(initialHistory);
    const [selectedCard, setSelectedCard] = useState<CardType>(null);
    const [isSliding, setIsSliding] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isHistorySliding, setIsHistorySliding] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);

    // 生成設定
    const [mode, setMode] = useState<"original" | "template">("template");
    const [prompt, setPrompt] = useState("");
    const [selectedSize, setSelectedSize] = useState(sizePresets[0].id);
    const [isGenerating, setIsGenerating] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [customWidth, setCustomWidth] = useState(1024);
    const [customHeight, setCustomHeight] = useState(1024);
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageUsageMode, setImageUsageMode] = useState<ImageUsageMode>("embed");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ポスター用フィールド
    const [posterTitle, setPosterTitle] = useState("");
    const [posterSubtitle, setPosterSubtitle] = useState("");
    const [posterBody, setPosterBody] = useState("");
    const [posterFooter, setPosterFooter] = useState("");
    const [selectedDesignPreset, setSelectedDesignPreset] = useState(designPresets[0].id);
    const [customDesign, setCustomDesign] = useState("");

    const modeTabs = [
        { key: "template", label: "テンプレート" },
        { key: "original", label: "オリジナル" },
    ];

    const handleCardClick = (card: MenuCard) => {
        setSelectedCard(card.id);
        setIsSliding(true);
        setTimeout(() => {
            setShowDetail(true);
        }, 50);
    };

    const handleHistoryClick = () => {
        setIsHistorySliding(true);
        setTimeout(() => {
            setShowHistory(true);
        }, 50);
    };

    const handleHistoryBack = () => {
        setShowHistory(false);
        setTimeout(() => {
            setIsHistorySliding(false);
        }, 300);
    };

    const handleBack = () => {
        setShowDetail(false);
        setTimeout(() => {
            setIsSliding(false);
            setSelectedCard(null);
            setPrompt("");
            setMode("original");
            setUploadedImages([]);
            setImagePreviews([]);
            setImageUsageMode("embed");
            // ポスター用フィールドリセット
            setPosterTitle("");
            setPosterSubtitle("");
            setPosterBody("");
            setPosterFooter("");
            setSelectedDesignPreset(designPresets[0].id);
            setCustomDesign("");
        }, 300);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            setUploadedImages(prev => [...prev, ...newFiles]);

            newFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleRemoveImage = (index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleTemplateSelect = (template: Template) => {
        // ポスターの場合は構造化データをフィールドに入力
        if (selectedCard === "poster" && template.posterData) {
            setPosterTitle(template.posterData.title);
            setPosterSubtitle(template.posterData.subtitle || "");
            setPosterBody(template.posterData.body || "");
            setPosterFooter(template.posterData.footer || "");
            setSelectedDesignPreset(template.posterData.designPresetId);
            setCustomDesign(template.posterData.customDesign || "");
        } else {
            setPrompt(template.prompt);
        }
        setMode("original");
    };

    const currentTemplates = selectedCard ? templatesByCategory[selectedCard] || [] : [];

    const handleGenerate = async () => {
        // ポスターの場合は専用フィールドからプロンプトを構築
        let finalPrompt = prompt;
        if (selectedCard === "poster") {
            // デザインプロンプトを取得
            const designPreset = designPresets.find(d => d.id === selectedDesignPreset);
            const designPrompt = selectedDesignPreset === "custom"
                ? customDesign.trim()
                : designPreset?.prompt || "";

            if (!posterTitle.trim() && !designPrompt) {
                toast({
                    title: "タイトルまたはデザインを入力してください",
                    variant: "destructive",
                });
                return;
            }
            // ポスター用プロンプトを構築
            const textParts: string[] = [];
            if (posterTitle.trim()) textParts.push(`タイトル: 「${posterTitle}」`);
            if (posterSubtitle.trim()) textParts.push(`サブタイトル: 「${posterSubtitle}」`);
            if (posterBody.trim()) textParts.push(`本文: 「${posterBody}」`);
            if (posterFooter.trim()) textParts.push(`フッター（下部）: 「${posterFooter}」`);

            const nightClubContext = "キャバクラ・ホストクラブ・ガールズバー・コンカフェ・ラウンジなどのナイトクラブ・夜のお店向けのポスターを生成してください。華やかで高級感があり、お客様の来店意欲を高めるデザインにしてください。";

            const textSection = textParts.length > 0
                ? `${nightClubContext}\n\n以下のテキストを含むポスターを生成してください:\n${textParts.join("\n")}`
                : nightClubContext;
            const designSection = designPrompt
                ? `デザイン・雰囲気: ${designPrompt}`
                : "";

            finalPrompt = [textSection, designSection].filter(Boolean).join("\n\n");
        } else if (!prompt.trim()) {
            toast({
                title: "プロンプトを入力してください",
                variant: "destructive",
            });
            return;
        }

        if ((credits?.ai_credits ?? 0) <= 0) {
            toast({
                title: "クレジットが不足しています",
                variant: "destructive",
            });
            return;
        }

        if (!selectedCard) return;

        setIsGenerating(true);

        // サイズ取得
        const sizePreset = sizePresets.find(s => s.id === selectedSize);
        const width = selectedSize === "custom" ? customWidth : (sizePreset?.width ?? 1024);
        const height = selectedSize === "custom" ? customHeight : (sizePreset?.height ?? 1024);

        // image_type マッピング
        const imageTypeMap: Record<string, GeneratedImage["image_type"]> = {
            poster: "poster",
            menu: "menu",
            photo: "sns",
            signboard: "custom",
        };
        const imageType = imageTypeMap[selectedCard] || "custom";

        try {
            // アップロード画像をbase64に変換
            let refImages: ReferenceImage[] | undefined;
            if (uploadedImages.length > 0) {
                refImages = await Promise.all(
                    uploadedImages.map(async (file) => {
                        const buffer = await file.arrayBuffer();
                        const base64 = Buffer.from(buffer).toString("base64");
                        return {
                            data: base64,
                            mimeType: file.type || "image/jpeg"
                        };
                    })
                );
            }

            const result = await generateImage(
                finalPrompt,
                imageType,
                width,
                height,
                undefined, // templateId
                undefined, // templateName
                refImages,
                uploadedImages.length > 0 ? imageUsageMode : undefined
            );

            if (result.success && result.image) {
                // クレジット更新
                setCredits(prev => prev ? { ...prev, ai_credits: prev.ai_credits - 1 } : null);
                // 履歴更新
                setHistory(prev => [result.image!, ...prev]);
                // モーダル表示
                setGeneratedImage(result.image);
                setShowResultModal(true);
                setLastError(null);
            } else {
                const errorMsg = result.error || "もう一度お試しください";
                console.error("生成エラー:", errorMsg);
                setLastError(errorMsg);
                toast({
                    title: "生成に失敗しました",
                    description: errorMsg,
                    variant: "destructive",
                    duration: 10000,
                });
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : "もう一度お試しください";
            console.error("例外エラー:", errorMsg);
            setLastError(errorMsg);
            toast({
                title: "エラーが発生しました",
                description: errorMsg,
                variant: "destructive",
                duration: 10000,
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const currentCard = menuCards.find(c => c.id === selectedCard);

    // 画像をダウンロード
    const handleDownloadImage = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ai-create-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            toast({
                title: "ダウンロードに失敗しました",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="relative">
            {/* メインビュー */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isSliding || isHistorySliding ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
                }`}
            >
                <div className="space-y-6">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={handleHistoryClick}
                            className="rounded-full bg-white dark:bg-gray-800"
                        >
                            <History className="h-4 w-4 mr-2" />
                            生成履歴
                        </Button>
                        <button
                            onClick={() => setShowPurchaseModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                        >
                            <Zap className="h-5 w-5 text-yellow-500" />
                            <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {credits?.ai_credits ?? 0}
                            </span>
                            <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                クレジット
                            </span>
                        </button>
                    </div>

                    {/* カードグリッド */}
                    <div className="grid grid-cols-2 gap-4">
                        {menuCards.map((card) => (
                            <button
                                key={card.id}
                                onClick={() => handleCardClick(card)}
                                className="flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left group overflow-hidden"
                            >
                                {/* カード画像エリア */}
                                <div className={`relative aspect-[4/3] ${card.bgColor} flex items-center justify-center`}>
                                    {card.imageUrl ? (
                                        <Image
                                            src={card.imageUrl}
                                            alt={card.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className={`${card.color}`}>
                                            {card.icon}
                                        </div>
                                    )}
                                </div>
                                {/* カード情報 */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                                        {card.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 詳細ビュー（スライドイン） */}
            {isSliding && (
                <div
                    className={`transition-all duration-300 ease-in-out ${
                        showDetail ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <div className="space-y-6 pb-8">
                        {/* 詳細ヘッダー */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleBack}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">戻る</span>
                            </button>
                            <button
                                onClick={() => setShowPurchaseModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                            >
                                <Zap className="h-5 w-5 text-yellow-500" />
                                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                    {credits?.ai_credits ?? 0}
                                </span>
                                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                    クレジット
                                </span>
                            </button>
                        </div>

                        {/* カードタイトル */}
                        {currentCard && (
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${currentCard.bgColor} ${currentCard.color} flex items-center justify-center`}>
                                    {currentCard.icon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {currentCard.title}を生成
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {currentCard.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* テンプレート/オリジナル切り替えタブ */}
                        <VercelTabs
                            tabs={modeTabs}
                            value={mode}
                            onChange={(val) => setMode(val as "original" | "template")}
                        />

                        {/* オリジナルタブ: 設定フォーム */}
                        {mode === "original" && (
                            <div className="space-y-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                {/* ポスター専用フォーム */}
                                {selectedCard === "poster" ? (
                                    <>
                                        {/* テキストセクション */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1 h-4 bg-pink-500 rounded-full" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">ポスターに表示するテキスト</span>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    タイトル
                                                </Label>
                                                <Input
                                                    value={posterTitle}
                                                    onChange={(e) => setPosterTitle(e.target.value)}
                                                    placeholder="例：CHAMPAGNE TOWER NIGHT"
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    サブタイトル <span className="text-gray-400 text-xs">（任意）</span>
                                                </Label>
                                                <Input
                                                    value={posterSubtitle}
                                                    onChange={(e) => setPosterSubtitle(e.target.value)}
                                                    placeholder="例：12.25 SAT / OPEN 21:00"
                                                    className="rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    本文 <span className="text-gray-400 text-xs">（任意）</span>
                                                </Label>
                                                <Textarea
                                                    value={posterBody}
                                                    onChange={(e) => setPosterBody(e.target.value)}
                                                    placeholder="例：スペシャルゲストDJ出演&#10;シャンパンタワー開催&#10;ドレスコード: スマートカジュアル"
                                                    className="min-h-[80px] rounded-xl"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    フッター（下部表示） <span className="text-gray-400 text-xs">（任意）</span>
                                                </Label>
                                                <Input
                                                    value={posterFooter}
                                                    onChange={(e) => setPosterFooter(e.target.value)}
                                                    placeholder="例：CLUB ELEGANCE / 03-1234-5678"
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>

                                        {/* デザインセクション */}
                                        <div className="space-y-2 pt-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1 h-4 bg-violet-500 rounded-full" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">デザイン・雰囲気</span>
                                            </div>
                                            <Select value={selectedDesignPreset} onValueChange={setSelectedDesignPreset}>
                                                <SelectTrigger className="rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {designPresets.map((design) => (
                                                        <SelectItem key={design.id} value={design.id}>
                                                            {design.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {selectedDesignPreset === "custom" && (
                                                <Textarea
                                                    value={customDesign}
                                                    onChange={(e) => setCustomDesign(e.target.value)}
                                                    placeholder="例：ゴールドとブラックを基調とした高級感のあるデザイン、シャンパンタワーが輝く華やかな雰囲気、キラキラしたライティング効果"
                                                    className="min-h-[80px] rounded-xl mt-2"
                                                />
                                            )}
                                            {selectedDesignPreset !== "custom" && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {designPresets.find(d => d.id === selectedDesignPreset)?.prompt.slice(0, 60)}...
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    /* 通常のプロンプト入力（ポスター以外） */
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                            プロンプト（生成したい内容）
                                        </Label>
                                        <Textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="例：華やかなシャンパンタワーのある高級感のあるポスター"
                                            className="min-h-[100px] rounded-xl"
                                        />
                                    </div>
                                )}

                                {/* サイズ選択 */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        サイズ
                                    </Label>
                                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sizePresets.map((size) => (
                                                <SelectItem key={size.id} value={size.id}>
                                                    {size.name} ({size.ratio})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {selectedSize === "custom" && (
                                        <div className="flex gap-3 mt-3">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-gray-500 dark:text-gray-400">幅 (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={customWidth}
                                                    onChange={(e) => setCustomWidth(Math.max(256, Math.min(2048, parseInt(e.target.value) || 1024)))}
                                                    min={256}
                                                    max={2048}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs text-gray-500 dark:text-gray-400">高さ (px)</Label>
                                                <Input
                                                    type="number"
                                                    value={customHeight}
                                                    onChange={(e) => setCustomHeight(Math.max(256, Math.min(2048, parseInt(e.target.value) || 1024)))}
                                                    min={256}
                                                    max={2048}
                                                    className="rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 参考画像アップロード */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                        画像を追加（任意）
                                    </Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    {imagePreviews.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-2">
                                                {imagePreviews.map((preview, index) => (
                                                    <div key={index} className="relative aspect-square">
                                                        <div className="relative w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                                            <Image
                                                                src={preview}
                                                                alt={`アップロード画像 ${index + 1}`}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(index)}
                                                            className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {/* 追加ボタン */}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex flex-col items-center justify-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    <Upload className="h-5 w-5" />
                                                    <span className="text-xs">追加</span>
                                                </button>
                                            </div>
                                            {/* 画像の使用方法選択 */}
                                            <div className="space-y-2">
                                                <Label className="text-sm text-gray-700 dark:text-gray-300">
                                                    画像の使い方
                                                </Label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setImageUsageMode("embed")}
                                                        className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-all ${
                                                            imageUsageMode === "embed"
                                                                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                                                        }`}
                                                    >
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">ポスターに配置</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            画像をデザイン内に組み込む
                                                        </div>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setImageUsageMode("reference")}
                                                        className={`flex-1 px-3 py-2 text-sm rounded-xl border transition-all ${
                                                            imageUsageMode === "reference"
                                                                ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300"
                                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                                                        }`}
                                                    >
                                                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200">スタイル参考</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            雰囲気や色使いを参考に
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <Upload className="h-6 w-6" />
                                            <span className="text-sm">キャスト写真などを追加</span>
                                        </button>
                                    )}
                                </div>

                                {/* 生成ボタン */}
                                <Button
                                    onClick={handleGenerate}
                                    disabled={
                                        isGenerating ||
                                        (credits?.ai_credits ?? 0) <= 0 ||
                                        (selectedCard === "poster"
                                            ? !posterTitle.trim() && (selectedDesignPreset === "custom" ? !customDesign.trim() : false)
                                            : !prompt.trim())
                                    }
                                    className="w-full h-12 rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 hover:from-fuchsia-600 hover:via-violet-600 hover:to-cyan-500 text-white shadow-md"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            生成中...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="h-5 w-5 mr-2" />
                                            生成する（1クレジット消費）
                                        </>
                                    )}
                                </Button>

                                {/* エラーメッセージ表示 */}
                                {lastError && (
                                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                        <p className="text-sm text-red-600 dark:text-red-400 break-all">
                                            {lastError}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* テンプレートタブ: テンプレート一覧 */}
                        {mode === "template" && (
                            <div className="grid grid-cols-2 gap-3">
                                {currentTemplates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateSelect(template)}
                                        className="flex flex-col rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all text-left overflow-hidden group"
                                    >
                                        {/* テンプレート画像プレースホルダー */}
                                        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                                            {template.imageUrl ? (
                                                <Image
                                                    src={template.imageUrl}
                                                    alt={template.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                            )}
                                        </div>
                                        {/* テンプレート名 */}
                                        <div className="p-3">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                {template.name}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 生成履歴ビュー（スライドイン） */}
            {isHistorySliding && (
                <div
                    className={`transition-all duration-300 ease-in-out ${
                        showHistory ? "opacity-100" : "opacity-0"
                    }`}
                >
                    <div className="space-y-6 pb-8">
                        {/* 履歴ヘッダー */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={handleHistoryBack}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">戻る</span>
                            </button>
                            <button
                                onClick={() => setShowPurchaseModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                            >
                                <Zap className="h-5 w-5 text-yellow-500" />
                                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                    {credits?.ai_credits ?? 0}
                                </span>
                                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                                    クレジット
                                </span>
                            </button>
                        </div>

                        {/* タイトル */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <History className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    生成履歴
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    過去に生成したコンテンツ一覧
                                </p>
                            </div>
                        </div>

                        {/* 履歴一覧 */}
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                                        まだ生成履歴がありません
                                    </p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">
                                        コンテンツを生成すると、ここに表示されます
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {history.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setGeneratedImage(item);
                                                setShowResultModal(true);
                                            }}
                                            className="flex flex-col rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all overflow-hidden group text-left"
                                        >
                                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
                                                <Image
                                                    src={item.image_url}
                                                    alt={item.prompt}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                    {formatJSTDateTime(item.created_at)}
                                                </p>
                                                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                                    {item.prompt.length > 50 ? item.prompt.slice(0, 50) + "..." : item.prompt}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 生成結果モーダル */}
            <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] rounded-2xl border border-gray-200 bg-white p-0 overflow-hidden dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="p-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            生成完了
                        </DialogTitle>
                    </DialogHeader>
                    {generatedImage && (
                        <div className="px-4 pb-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                            <div className="flex items-center justify-center">
                                <Image
                                    src={generatedImage.image_url}
                                    alt="生成画像"
                                    width={400}
                                    height={400}
                                    className="max-h-[50vh] w-auto rounded-xl object-contain"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => handleDownloadImage(generatedImage.image_url)}
                                >
                                    画像を保存する
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full h-11 rounded-full"
                                    onClick={() => setShowResultModal(false)}
                                >
                                    閉じる
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* クレジット購入モーダル */}
            <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
                <DialogContent className="sm:max-w-md rounded-2xl border border-gray-200 bg-white p-0 overflow-hidden dark:border-gray-800 dark:bg-gray-900">
                    <DialogHeader className="p-6 pb-4">
                        <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                            クレジットを購入
                        </DialogTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            現在のクレジット: <span className="font-bold text-yellow-600">{credits?.ai_credits ?? 0}</span>
                        </p>
                    </DialogHeader>
                    <div className="px-6 pb-6 space-y-3">
                        {creditPlans.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                                    selectedPlan === plan.id
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                            >
                                {plan.popular && (
                                    <span className="absolute -top-2 right-3 px-2 py-0.5 text-xs font-medium bg-blue-500 text-white rounded-full">
                                        人気
                                    </span>
                                )}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {plan.label}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {plan.description}
                                        </p>
                                    </div>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                                        ¥{plan.price.toLocaleString()}
                                    </p>
                                </div>
                            </button>
                        ))}

                        <Button
                            onClick={async () => {
                                if (!selectedPlan) return;
                                const plan = creditPlans.find(p => p.id === selectedPlan);
                                if (!plan) return;

                                setIsPurchasing(true);
                                try {
                                    const result = await purchaseCredits(plan.credits, plan.price);
                                    if (result.success && result.url) {
                                        window.location.href = result.url;
                                    } else {
                                        toast({
                                            title: "エラー",
                                            description: result.error || "購入処理に失敗しました",
                                            variant: "destructive",
                                        });
                                    }
                                } catch {
                                    toast({
                                        title: "エラー",
                                        description: "購入処理に失敗しました",
                                        variant: "destructive",
                                    });
                                } finally {
                                    setIsPurchasing(false);
                                }
                            }}
                            disabled={!selectedPlan || isPurchasing}
                            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                        >
                            {isPurchasing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    処理中...
                                </>
                            ) : (
                                "購入する"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
