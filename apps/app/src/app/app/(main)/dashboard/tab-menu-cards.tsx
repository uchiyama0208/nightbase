"use client";

import Link from "next/link";
import {
    Calendar,
    Car,
    Clock,
    CalendarDays,
    CalendarCheck,
    Users,
    Shield,
    Mail,
    UserPlus,
    LayoutGrid,
    Armchair,
    Receipt,
    UtensilsCrossed,
    Wine,
    Coins,
    Wallet,
    MessageSquare,
    Share2,
    Sparkles,
    CheckCircle2,
    Circle,
    AlertCircle,
    Layout,
} from "lucide-react";
import { formatJSTDate } from "@/lib/utils";
import { useDashboardTab } from "@/contexts/dashboard-tab-context";

type TabKey = "shift" | "user" | "floor" | "salary" | "community";

interface MenuCard {
    href: string;
    label: string;
    icon: React.ReactNode;
    content?: React.ReactNode;
}

// ========== INTERFACES ==========
interface TimecardInfo {
    isWorking: boolean;
    clockInTime: string | null;
    lastWorkDate: string | null;
}

interface AttendanceInfo {
    castCount: number;
    staffCount: number;
}

interface ShiftInfo {
    scheduledCastCount: number;
    scheduledStaffCount: number;
}

interface MyShiftInfo {
    nextShiftDate: string | null;
    unsubmittedCount: number;
}

interface PickupInfo {
    requestCount: number;
    unassignedCount: number;
}

interface UserInfo {
    castCount: number;
    staffCount: number;
    guestCount: number;
    partnerCount: number;
}

interface RolesInfo {
    count: number;
}

interface InvitationsInfo {
    pendingCount: number;
}

interface JoinRequestsInfo {
    pendingCount: number;
}

interface FloorInfo {
    activeTableCount: number;
    activeGuestCount: number;
}

interface SeatsInfo {
    count: number;
}

interface SlipsInfo {
    unpaidCount: number;
}

interface MenusInfo {
    count: number;
}

interface BottlesInfo {
    activeCount: number;
}

interface PricingInfo {
    count: number;
}

interface SalaryInfo {
    count: number;
}

interface BoardInfo {
    postsCount: number;
    manualsCount: number;
    unreadPostsCount: number;
    unreadManualsCount: number;
}

interface SnsInfo {
    todayCount: number;
    scheduledCount: number;
}

interface FeaturesInfo {
    enabledCount: number;
    disabledCount: number;
}

interface TabMenuCardsProps {
    timecardInfo?: TimecardInfo;
    attendanceInfo?: AttendanceInfo;
    shiftInfo?: ShiftInfo;
    myShiftInfo?: MyShiftInfo;
    pickupInfo?: PickupInfo;
    userInfo?: UserInfo;
    rolesInfo?: RolesInfo;
    invitationsInfo?: InvitationsInfo;
    joinRequestsInfo?: JoinRequestsInfo;
    floorInfo?: FloorInfo;
    seatsInfo?: SeatsInfo;
    slipsInfo?: SlipsInfo;
    menusInfo?: MenusInfo;
    bottlesInfo?: BottlesInfo;
    pricingInfo?: PricingInfo;
    salaryInfo?: SalaryInfo;
    boardInfo?: BoardInfo;
    snsInfo?: SnsInfo;
    featuresInfo?: FeaturesInfo;
}

// ========== HELPER FUNCTIONS ==========
function getWorkingDuration(clockInTime: string): string {
    const clockIn = new Date(clockInTime);
    const now = new Date();
    const diffMs = now.getTime() - clockIn.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (hours > 0) {
        return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
}

// ========== SHIFT TAB CONTENTS ==========
function TimecardContent({ info }: { info?: TimecardInfo }) {
    const isWorking = info?.isWorking ?? false;
    const clockInTime = info?.clockInTime;
    const lastWorkDate = info?.lastWorkDate;

    return (
        <div className="space-y-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
                {isWorking ? (
                    <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">出勤中</span>
                    </>
                ) : (
                    <>
                        <Circle className="h-4 w-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">未出勤</span>
                    </>
                )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {isWorking && clockInTime ? (
                    <span>勤務時間: <span className="font-medium text-gray-700 dark:text-gray-300">{getWorkingDuration(clockInTime)}</span></span>
                ) : lastWorkDate ? (
                    <span>前回: <span className="font-medium text-gray-700 dark:text-gray-300">{formatJSTDate(lastWorkDate)}</span></span>
                ) : (
                    <span>出退勤を記録</span>
                )}
            </div>
        </div>
    );
}

function MyShiftContent({ info }: { info?: MyShiftInfo }) {
    const hasUnsubmitted = (info?.unsubmittedCount ?? 0) > 0;

    return (
        <div className="space-y-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {info?.nextShiftDate ? (
                    <span>次の出勤: <span className="font-medium text-gray-700 dark:text-gray-300">{formatJSTDate(info.nextShiftDate)}</span></span>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500">予定なし</span>
                )}
            </div>
            {hasUnsubmitted && (
                <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                        未提出 {info?.unsubmittedCount}件
                    </span>
                </div>
            )}
        </div>
    );
}

function AttendanceContent({ info }: { info?: AttendanceInfo }) {
    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-pink-500 dark:text-pink-400">{info?.castCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">キャスト</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{info?.staffCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">スタッフ</div>
            </div>
        </div>
    );
}

function ShiftContent({ info }: { info?: ShiftInfo }) {
    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-pink-500 dark:text-pink-400">{info?.scheduledCastCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">キャスト</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{info?.scheduledStaffCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">スタッフ</div>
            </div>
        </div>
    );
}

function PickupContent({ info }: { info?: PickupInfo }) {
    const hasUnassigned = (info?.unassignedCount ?? 0) > 0;

    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{info?.requestCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">送迎希望</div>
            </div>
            <div className="flex-1 text-center">
                <div className={`text-lg font-bold ${hasUnassigned ? "text-orange-500 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {info?.unassignedCount ?? 0}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">未手配</div>
            </div>
        </div>
    );
}

// ========== USER TAB CONTENTS ==========
function UserContent({ info }: { info?: UserInfo }) {
    return (
        <div className="grid grid-cols-2 gap-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-base font-bold text-pink-500 dark:text-pink-400">{info?.castCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">キャスト</div>
            </div>
            <div className="text-center">
                <div className="text-base font-bold text-blue-500 dark:text-blue-400">{info?.staffCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">スタッフ</div>
            </div>
            <div className="text-center">
                <div className="text-base font-bold text-green-500 dark:text-green-400">{info?.guestCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">ゲスト</div>
            </div>
            <div className="text-center">
                <div className="text-base font-bold text-purple-500 dark:text-purple-400">{info?.partnerCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">パートナー</div>
            </div>
        </div>
    );
}

function RolesContent({ info }: { info?: RolesInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.count ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">権限数</div>
            </div>
        </div>
    );
}

function InvitationsContent({ info }: { info?: InvitationsInfo }) {
    const hasPending = (info?.pendingCount ?? 0) > 0;

    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className={`text-2xl font-bold ${hasPending ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {info?.pendingCount ?? 0}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">招待中</div>
            </div>
        </div>
    );
}

function JoinRequestsContent({ info }: { info?: JoinRequestsInfo }) {
    const hasPending = (info?.pendingCount ?? 0) > 0;

    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2">
                {hasPending && <AlertCircle className="h-4 w-4 text-orange-500" />}
                <div className={`text-2xl font-bold ${hasPending ? "text-orange-500 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {info?.pendingCount ?? 0}
                </div>
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">未確認</div>
        </div>
    );
}

// ========== FLOOR TAB CONTENTS ==========
function FloorContent({ info }: { info?: FloorInfo }) {
    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{info?.activeTableCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">稼働卓</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-green-500 dark:text-green-400">{info?.activeGuestCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">来店中</div>
            </div>
        </div>
    );
}

function SeatsContent({ info }: { info?: SeatsInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.count ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">席数</div>
            </div>
        </div>
    );
}

function SlipsContent({ info }: { info?: SlipsInfo }) {
    const hasUnpaid = (info?.unpaidCount ?? 0) > 0;

    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className={`text-2xl font-bold ${hasUnpaid ? "text-orange-500 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"}`}>
                    {info?.unpaidCount ?? 0}
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">未会計</div>
            </div>
        </div>
    );
}

function MenusContent({ info }: { info?: MenusInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.count ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">メニュー数</div>
            </div>
        </div>
    );
}

function BottlesContent({ info }: { info?: BottlesInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.activeCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">キープ中</div>
            </div>
        </div>
    );
}

// ========== SALARY TAB CONTENTS ==========
function PricingContent({ info }: { info?: PricingInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.count ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">料金体系数</div>
            </div>
        </div>
    );
}

function SalaryContent({ info }: { info?: SalaryInfo }) {
    return (
        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">{info?.count ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">給与体系数</div>
            </div>
        </div>
    );
}

// ========== COMMUNITY TAB CONTENTS ==========
function BoardContent({ info }: { info?: BoardInfo }) {
    const hasUnreadPosts = (info?.unreadPostsCount ?? 0) > 0;
    const hasUnreadManuals = (info?.unreadManualsCount ?? 0) > 0;

    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-bold ${hasUnreadPosts ? "text-blue-500 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                        {info?.unreadPostsCount ?? 0}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">/ {info?.postsCount ?? 0}</span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {hasUnreadPosts ? "未読" : "掲示板"}
                </div>
            </div>
            <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-1">
                    <span className={`text-lg font-bold ${hasUnreadManuals ? "text-blue-500 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>
                        {info?.unreadManualsCount ?? 0}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">/ {info?.manualsCount ?? 0}</span>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                    {hasUnreadManuals ? "未読" : "マニュアル"}
                </div>
            </div>
        </div>
    );
}

function SnsContent({ info }: { info?: SnsInfo }) {
    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-green-500 dark:text-green-400">{info?.todayCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">今日の投稿</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-blue-500 dark:text-blue-400">{info?.scheduledCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">予定</div>
            </div>
        </div>
    );
}

function FeaturesContent({ info }: { info?: FeaturesInfo }) {
    return (
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-green-500 dark:text-green-400">{info?.enabledCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">追加済</div>
            </div>
            <div className="flex-1 text-center">
                <div className="text-lg font-bold text-gray-400 dark:text-gray-500">{info?.disabledCount ?? 0}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">未追加</div>
            </div>
        </div>
    );
}

// ========== TAB DEFINITIONS ==========
interface TabDefinition {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
}

const tabs: TabDefinition[] = [
    { key: "shift", label: "シフト", icon: <Calendar className="h-5 w-5" /> },
    { key: "user", label: "ユーザー", icon: <Users className="h-5 w-5" /> },
    { key: "floor", label: "フロア", icon: <Layout className="h-5 w-5" /> },
    { key: "salary", label: "料金給与", icon: <Coins className="h-5 w-5" /> },
    { key: "community", label: "コミュニティ", icon: <MessageSquare className="h-5 w-5" /> },
];

// ========== GET TAB MENUS ==========
const getTabMenus = (props: TabMenuCardsProps): Record<TabKey, MenuCard[]> => ({
    shift: [
        {
            href: "/app/timecard",
            label: "タイムカード",
            icon: <Clock className="h-5 w-5" />,
            content: <TimecardContent info={props.timecardInfo} />,
        },
        {
            href: "/app/my-shifts",
            label: "マイシフト",
            icon: <CalendarCheck className="h-5 w-5" />,
            content: <MyShiftContent info={props.myShiftInfo} />,
        },
        {
            href: "/app/attendance",
            label: "出勤管理",
            icon: <Calendar className="h-5 w-5" />,
            content: <AttendanceContent info={props.attendanceInfo} />,
        },
        {
            href: "/app/shifts",
            label: "シフト",
            icon: <CalendarDays className="h-5 w-5" />,
            content: <ShiftContent info={props.shiftInfo} />,
        },
        {
            href: "/app/pickup",
            label: "送迎管理",
            icon: <Car className="h-5 w-5" />,
            content: <PickupContent info={props.pickupInfo} />,
        },
    ],
    user: [
        {
            href: "/app/users",
            label: "ユーザー",
            icon: <Users className="h-5 w-5" />,
            content: <UserContent info={props.userInfo} />,
        },
        {
            href: "/app/roles",
            label: "権限",
            icon: <Shield className="h-5 w-5" />,
            content: <RolesContent info={props.rolesInfo} />,
        },
        {
            href: "/app/invitations",
            label: "招待",
            icon: <Mail className="h-5 w-5" />,
            content: <InvitationsContent info={props.invitationsInfo} />,
        },
        {
            href: "/app/invitations/join-requests",
            label: "参加リクエスト",
            icon: <UserPlus className="h-5 w-5" />,
            content: <JoinRequestsContent info={props.joinRequestsInfo} />,
        },
    ],
    floor: [
        {
            href: "/app/floor",
            label: "フロア管理",
            icon: <LayoutGrid className="h-5 w-5" />,
            content: <FloorContent info={props.floorInfo} />,
        },
        {
            href: "/app/seats",
            label: "席エディター",
            icon: <Armchair className="h-5 w-5" />,
            content: <SeatsContent info={props.seatsInfo} />,
        },
        {
            href: "/app/slips",
            label: "伝票",
            icon: <Receipt className="h-5 w-5" />,
            content: <SlipsContent info={props.slipsInfo} />,
        },
        {
            href: "/app/menus",
            label: "メニュー",
            icon: <UtensilsCrossed className="h-5 w-5" />,
            content: <MenusContent info={props.menusInfo} />,
        },
        {
            href: "/app/bottles",
            label: "ボトル",
            icon: <Wine className="h-5 w-5" />,
            content: <BottlesContent info={props.bottlesInfo} />,
        },
    ],
    salary: [
        {
            href: "/app/pricing-systems",
            label: "料金体系",
            icon: <Coins className="h-5 w-5" />,
            content: <PricingContent info={props.pricingInfo} />,
        },
        {
            href: "/app/salary-systems",
            label: "給与体系",
            icon: <Wallet className="h-5 w-5" />,
            content: <SalaryContent info={props.salaryInfo} />,
        },
    ],
    community: [
        {
            href: "/app/board",
            label: "掲示板",
            icon: <MessageSquare className="h-5 w-5" />,
            content: <BoardContent info={props.boardInfo} />,
        },
        {
            href: "/app/sns",
            label: "SNS",
            icon: <Share2 className="h-5 w-5" />,
            content: <SnsContent info={props.snsInfo} />,
        },
        {
            href: "/app/features",
            label: "機能追加",
            icon: <Sparkles className="h-5 w-5" />,
            content: <FeaturesContent info={props.featuresInfo} />,
        },
    ],
});

export function TabMenuCards(props: TabMenuCardsProps) {
    const dashboardTab = useDashboardTab();
    const activeTab = dashboardTab?.activeTab ?? "shift";
    const setActiveTab = dashboardTab?.setActiveTab ?? (() => {});

    const tabMenus = getTabMenus(props);
    const menus = tabMenus[activeTab] || tabMenus.shift;

    return (
        <>
            {/* Menu Cards Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {menus.map((menu) => (
                    <Link
                        key={menu.href}
                        href={menu.href}
                        className="flex flex-col p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus-visible:outline-none min-h-[120px]"
                    >
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                {menu.icon}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {menu.label}
                            </span>
                        </div>
                        {menu.content}
                    </Link>
                ))}
            </div>

            {/* Mobile Bottom Tab Bar - Only on Dashboard */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 lg:hidden">
                <div className="flex items-center justify-around h-14 px-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors ${
                                    isActive
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                {tab.icon}
                                <span className={`mt-1 text-[10px] font-medium ${
                                    isActive ? "text-blue-600 dark:text-blue-400" : ""
                                }`}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* Safe area for iOS */}
                <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-900" />
            </nav>
        </>
    );
}
