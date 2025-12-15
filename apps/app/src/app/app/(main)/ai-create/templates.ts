// テンプレート定義
export interface Template {
    id: string;
    name: string;
    category: "event" | "menu" | "cast" | "seasonal" | "sns" | "custom";
    type: "poster" | "pop" | "menu" | "sns" | "custom";
    description: string;
    promptTemplate: string;
    defaultWidth: number;
    defaultHeight: number;
    thumbnail?: string;
}

// システム提供テンプレート
export const SYSTEM_TEMPLATES: Template[] = [
    // イベント系
    {
        id: "event-party",
        name: "パーティーイベント",
        category: "event",
        type: "poster",
        description: "華やかなパーティーイベント告知用",
        promptTemplate: "Luxurious nightclub party event poster, elegant champagne glasses, sparkling lights, premium VIP atmosphere, {custom_text}, Japanese nightlife style, high-end club aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "event-anniversary",
        name: "周年イベント",
        category: "event",
        type: "poster",
        description: "店舗周年記念イベント用",
        promptTemplate: "Anniversary celebration poster for upscale lounge, gold and black theme, elegant typography space for {custom_text}, celebratory confetti, luxury nightclub ambiance",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "event-birthday",
        name: "バースデーイベント",
        category: "event",
        type: "poster",
        description: "キャストのバースデーイベント用",
        promptTemplate: "Birthday celebration poster, glamorous host/hostess club style, pink and gold decorations, cake and champagne tower, {custom_text}, Japanese cabaret aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    // メニュー系
    {
        id: "menu-drink",
        name: "ドリンクメニュー",
        category: "menu",
        type: "menu",
        description: "ドリンクメニュー表用",
        promptTemplate: "Elegant drink menu design, premium cocktails and champagne bottles, dark luxury background, clean layout for text {custom_text}, high-end bar aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1527,
    },
    {
        id: "menu-food",
        name: "フードメニュー",
        category: "menu",
        type: "menu",
        description: "フードメニュー表用",
        promptTemplate: "Sophisticated food menu design, gourmet appetizers and snacks, elegant plating, dark moody lighting, space for menu items {custom_text}, upscale lounge style",
        defaultWidth: 1080,
        defaultHeight: 1527,
    },
    {
        id: "menu-bottle",
        name: "ボトルメニュー",
        category: "menu",
        type: "menu",
        description: "シャンパン・ボトルメニュー用",
        promptTemplate: "Luxury bottle menu, premium champagne and whiskey bottles display, crystal glasses, golden accents, {custom_text}, VIP bottle service aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1527,
    },
    // キャスト紹介系
    {
        id: "cast-intro",
        name: "キャスト紹介",
        category: "cast",
        type: "poster",
        description: "新人・人気キャスト紹介用",
        promptTemplate: "Stylish cast introduction poster, elegant frame design, soft glamour lighting, space for photo and profile {custom_text}, Japanese host/hostess club promotional style",
        defaultWidth: 1080,
        defaultHeight: 1350,
    },
    {
        id: "cast-ranking",
        name: "ランキング発表",
        category: "cast",
        type: "poster",
        description: "月間ランキング発表用",
        promptTemplate: "Monthly ranking announcement poster, gold trophy and crown elements, top 3 podium design, celebratory atmosphere, {custom_text}, nightclub achievement style",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    // 季節系
    {
        id: "seasonal-christmas",
        name: "クリスマス",
        category: "seasonal",
        type: "poster",
        description: "クリスマスイベント用",
        promptTemplate: "Christmas event poster for nightclub, red and gold theme, Christmas tree and ornaments, champagne celebration, {custom_text}, festive luxury atmosphere",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "seasonal-newyear",
        name: "年末年始",
        category: "seasonal",
        type: "poster",
        description: "年末カウントダウン・新年イベント用",
        promptTemplate: "New Year countdown party poster, fireworks and champagne, clock showing midnight, gold and black luxury theme, {custom_text}, celebration atmosphere",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "seasonal-valentine",
        name: "バレンタイン",
        category: "seasonal",
        type: "poster",
        description: "バレンタインイベント用",
        promptTemplate: "Valentine's Day event poster, romantic red and pink theme, hearts and roses, champagne glasses, {custom_text}, elegant nightclub romance style",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "seasonal-halloween",
        name: "ハロウィン",
        category: "seasonal",
        type: "poster",
        description: "ハロウィンイベント用",
        promptTemplate: "Halloween party poster for nightclub, spooky elegant theme, pumpkins and bats, purple and orange lighting, {custom_text}, glamorous horror aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    // SNS投稿系
    {
        id: "sns-story",
        name: "ストーリー投稿",
        category: "sns",
        type: "sns",
        description: "Instagram/TikTokストーリー用",
        promptTemplate: "Instagram story design for nightclub, vertical format, trendy gradient background, modern typography space for {custom_text}, social media aesthetic",
        defaultWidth: 1080,
        defaultHeight: 1920,
    },
    {
        id: "sns-post",
        name: "フィード投稿",
        category: "sns",
        type: "sns",
        description: "Instagram/Twitterフィード用",
        promptTemplate: "Social media post design, square format, eye-catching nightclub aesthetic, neon accents, space for {custom_text}, engaging visual style",
        defaultWidth: 1080,
        defaultHeight: 1080,
    },
    {
        id: "sns-cover",
        name: "カバー画像",
        category: "sns",
        type: "sns",
        description: "SNSカバー・ヘッダー画像用",
        promptTemplate: "Social media cover image, panoramic nightclub interior, luxury VIP atmosphere, subtle branding space for {custom_text}, professional banner style",
        defaultWidth: 1500,
        defaultHeight: 500,
    },
    // POP系
    {
        id: "pop-table",
        name: "テーブルPOP",
        category: "event",
        type: "pop",
        description: "テーブル設置用POP",
        promptTemplate: "Table tent card design, compact promotional style, elegant dark background, clear text space for {custom_text}, nightclub table advertisement",
        defaultWidth: 800,
        defaultHeight: 600,
    },
    {
        id: "pop-campaign",
        name: "キャンペーンPOP",
        category: "event",
        type: "pop",
        description: "キャンペーン告知POP",
        promptTemplate: "Campaign announcement pop design, attention-grabbing colors, discount or special offer style, {custom_text}, nightclub promotion aesthetic",
        defaultWidth: 800,
        defaultHeight: 1000,
    },
];

// サイズプリセット
export const SIZE_PRESETS = [
    { name: "Instagramストーリー", width: 1080, height: 1920, ratio: "9:16" },
    { name: "Instagram投稿", width: 1080, height: 1080, ratio: "1:1" },
    { name: "Instagramポートレート", width: 1080, height: 1350, ratio: "4:5" },
    { name: "A4縦", width: 1240, height: 1754, ratio: "A4" },
    { name: "A4横", width: 1754, height: 1240, ratio: "A4横" },
    { name: "Twitterヘッダー", width: 1500, height: 500, ratio: "3:1" },
    { name: "YouTubeサムネイル", width: 1280, height: 720, ratio: "16:9" },
    { name: "カスタム", width: 1080, height: 1080, ratio: "custom" },
];
