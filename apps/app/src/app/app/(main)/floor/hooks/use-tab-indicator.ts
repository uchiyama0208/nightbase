import { useState, useRef, useEffect, RefObject } from "react";

interface TabIndicatorStyle {
    left: number;
    width: number;
}

interface UseTabIndicatorReturn<T extends string> {
    tabsRef: RefObject<{ [key in T]?: HTMLButtonElement | null }>;
    indicatorStyle: TabIndicatorStyle;
}

/**
 * Vercel風のアニメーションタブインジケーターを管理するフック
 * @param currentTab 現在選択中のタブキー
 */
export function useTabIndicator<T extends string>(currentTab: T): UseTabIndicatorReturn<T> {
    const tabsRef = useRef<{ [key in T]?: HTMLButtonElement | null }>({});
    const [indicatorStyle, setIndicatorStyle] = useState<TabIndicatorStyle>({ left: 0, width: 0 });

    useEffect(() => {
        const activeButton = tabsRef.current[currentTab];
        if (activeButton) {
            setIndicatorStyle({
                left: activeButton.offsetLeft,
                width: activeButton.offsetWidth,
            });
        }
    }, [currentTab]);

    return {
        tabsRef,
        indicatorStyle,
    };
}
