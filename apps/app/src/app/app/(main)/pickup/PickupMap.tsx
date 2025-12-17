"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2, Star, ArrowRight, Trash2, MapPin } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { PickupRouteWithPassengers, StoreLocation, TodayAttendee } from "./actions";
import { addPassengerToRoute, removePassengerFromRoute } from "./actions";

interface PickupMapProps {
    routes: PickupRouteWithPassengers[];
    storeLocation: StoreLocation;
    attendees: TodayAttendee[];
    onRouteChange: () => void;
}

// 東京駅をデフォルトの中心に
const defaultCenter = {
    lat: 35.6812,
    lng: 139.7671,
};

// ルートごとの色
const routeColors = [
    "#3B82F6", // blue
    "#EF4444", // red
    "#10B981", // green
    "#F59E0B", // amber
    "#8B5CF6", // violet
    "#EC4899", // pink
];

// 未割り当ての色
const unassignedColor = "#6B7280"; // gray

interface GeocodedAttendee {
    profileId: string;
    destination: string;
    lat: number;
    lng: number;
    displayName: string;
    routeIndex: number | null; // null = 未割り当て
    routeId: string | null;
    tripNumber: number | null;
    isReturnTrip: boolean; // 戻り便かどうか
}

// ルート描画コンポーネント
function DirectionsPolyline({
    geocodedAttendees,
    routeIndex,
    color,
}: {
    geocodedAttendees: GeocodedAttendee[];
    routeIndex: number;
    color: string;
}) {
    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!map || !routesLibrary) return;

        const routeLocations = geocodedAttendees
            .filter((loc) => loc.routeIndex === routeIndex)
            .sort((a, b) => {
                if (a.tripNumber !== null && b.tripNumber !== null && a.tripNumber !== b.tripNumber) {
                    return a.tripNumber - b.tripNumber;
                }
                return 0;
            });

        if (routeLocations.length < 2) return;

        const directionsService = new routesLibrary.DirectionsService();
        const origin = routeLocations[0];
        const destination = routeLocations[routeLocations.length - 1];
        const waypoints = routeLocations.slice(1, -1).map((loc) => ({
            location: new google.maps.LatLng(loc.lat, loc.lng),
            stopover: true,
        }));

        directionsService.route(
            {
                origin: new google.maps.LatLng(origin.lat, origin.lng),
                destination: new google.maps.LatLng(destination.lat, destination.lng),
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
            },
            (result, status) => {
                if (status === "OK" && result) {
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                    }
                    const path = result.routes[0].overview_path;
                    polylineRef.current = new google.maps.Polyline({
                        path,
                        strokeColor: color,
                        strokeWeight: 4,
                        strokeOpacity: 0.8,
                        map,
                    });
                }
            }
        );

        return () => {
            if (polylineRef.current) {
                polylineRef.current.setMap(null);
            }
        };
    }, [map, routesLibrary, geocodedAttendees, routeIndex, color]);

    return null;
}

// 戻り便の色（各ルート色を薄くした版）
const returnTripColors = [
    "#93C5FD", // blue-300
    "#FCA5A5", // red-300
    "#6EE7B7", // green-300
    "#FCD34D", // amber-300
    "#C4B5FD", // violet-300
    "#F9A8D4", // pink-300
];

// マーカーのPinコンポーネント
function MarkerPin({
    index,
    color,
    name,
    isUnassigned,
    isReturnTrip,
}: {
    index: number | null;
    color: string;
    name: string;
    isUnassigned: boolean;
    isReturnTrip: boolean;
}) {
    return (
        <div className="relative flex flex-col items-center cursor-pointer active:scale-95 transition-transform touch-manipulation">
            {/* 吹き出し */}
            <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium shadow-lg"
                style={{
                    backgroundColor: color,
                    color: "white",
                }}
            >
                {isReturnTrip && <span className="mr-1">↩</span>}
                {name}
                <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: `6px solid ${color}`,
                    }}
                />
            </div>
            {/* ピン */}
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: color,
                    border: isReturnTrip ? "3px dashed white" : "2px solid white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: 12,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
            >
                {isUnassigned ? "?" : (index !== null ? index + 1 : "?")}
            </div>
        </div>
    );
}

// 店舗マーカーコンポーネント
function StoreMarkerPin({ name }: { name: string }) {
    return (
        <div className="relative flex flex-col items-center">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-medium shadow-lg bg-amber-500 text-white">
                {name}
                <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0"
                    style={{
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid #F59E0B",
                    }}
                />
            </div>
            <div
                className="flex items-center justify-center"
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor: "#F59E0B",
                    border: "2px solid white",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }}
            >
                <Star className="w-5 h-5 text-white fill-white" />
            </div>
        </div>
    );
}

// モバイル向けボトムシートモーダル
function MarkerActionSheet({
    isOpen,
    onClose,
    attendee,
    routes,
    onRouteChange,
}: {
    isOpen: boolean;
    onClose: () => void;
    attendee: GeocodedAttendee | null;
    routes: PickupRouteWithPassengers[];
    onRouteChange: () => void;
}) {
    const [isProcessing, setIsProcessing] = useState(false);

    if (!attendee) return null;

    const isAssigned = attendee.routeIndex !== null;
    const currentRoute = isAssigned ? routes[attendee.routeIndex!] : null;

    const handleAddToRoute = async (routeId: string) => {
        setIsProcessing(true);
        try {
            if (attendee.routeId) {
                await removePassengerFromRoute(attendee.routeId, attendee.profileId);
            }
            await addPassengerToRoute(routeId, attendee.profileId);
            onRouteChange();
            onClose();
        } catch (error) {
            console.error("Error adding to route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRemoveFromRoute = async () => {
        if (!attendee.routeId) return;
        setIsProcessing(true);
        try {
            await removePassengerFromRoute(attendee.routeId, attendee.profileId);
            onRouteChange();
            onClose();
        } catch (error) {
            console.error("Error removing from route:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="bottom"
                className="h-auto max-h-[85vh] rounded-t-3xl bg-white dark:bg-gray-900 p-0"
            >
                {/* ドラッグハンドル */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>

                <SheetHeader className="px-4 pb-2 mb-0">
                    <SheetTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {attendee.displayName}
                    </SheetTitle>
                </SheetHeader>

                <div className="px-4 pb-8 space-y-4 overflow-y-auto max-h-[calc(85vh-80px)]">
                    {/* 送迎先表示 */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">送迎先</p>
                                <p className="text-base text-gray-900 dark:text-white">
                                    {attendee.destination}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 現在のルート表示 */}
                    {isAssigned && currentRoute && (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">現在のルート</p>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: routeColors[attendee.routeIndex! % routeColors.length] }}
                                />
                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                    {currentRoute.driver_name || `ルート${attendee.routeIndex! + 1}`}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ルートに追加/移動 */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isAssigned ? "別のルートに移動" : "ルートに追加"}
                        </p>
                        {routes.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                                ルートがありません
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {routes.map((route, idx) => {
                                    const isCurrent = attendee.routeId === route.id;
                                    return (
                                        <button
                                            key={route.id}
                                            type="button"
                                            onClick={() => !isCurrent && handleAddToRoute(route.id)}
                                            disabled={isProcessing || isCurrent}
                                            className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-base transition-colors touch-manipulation active:scale-[0.98] ${
                                                isCurrent
                                                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                                                    : "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white active:bg-gray-100 dark:active:bg-gray-700"
                                            }`}
                                        >
                                            <div
                                                className="w-5 h-5 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: routeColors[idx % routeColors.length] }}
                                            />
                                            <span className="flex-1 text-left font-medium">
                                                {route.driver_name || `ルート${idx + 1}`}
                                            </span>
                                            {!isCurrent && (
                                                <ArrowRight className="h-5 w-5 text-gray-400" />
                                            )}
                                            {isCurrent && (
                                                <span className="text-sm text-gray-400">現在</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ルートから削除 */}
                    {isAssigned && (
                        <Button
                            variant="outline"
                            onClick={handleRemoveFromRoute}
                            disabled={isProcessing}
                            className="w-full h-14 text-base rounded-2xl text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 touch-manipulation active:scale-[0.98]"
                        >
                            <Trash2 className="h-5 w-5 mr-2" />
                            ルートから削除
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// マップコンテンツコンポーネント
function MapContent({
    routes,
    geocodedAttendees,
    storePosition,
    storeName,
    onMarkerClick,
}: {
    routes: PickupRouteWithPassengers[];
    geocodedAttendees: GeocodedAttendee[];
    storePosition: { lat: number; lng: number } | null;
    storeName: string;
    onMarkerClick: (attendee: GeocodedAttendee) => void;
}) {
    const getMarkerIndex = (attendee: GeocodedAttendee): number | null => {
        if (attendee.routeIndex === null) return null;
        const routeAttendees = geocodedAttendees
            .filter((a) => a.routeIndex === attendee.routeIndex)
            .sort((a, b) => {
                if (a.tripNumber !== null && b.tripNumber !== null && a.tripNumber !== b.tripNumber) {
                    return a.tripNumber - b.tripNumber;
                }
                return 0;
            });
        return routeAttendees.findIndex((a) => a.profileId === attendee.profileId);
    };

    return (
        <>
            {storePosition && (
                <AdvancedMarker position={storePosition} title={storeName}>
                    <StoreMarkerPin name={storeName} />
                </AdvancedMarker>
            )}

            {geocodedAttendees.map((attendee) => {
                const isUnassigned = attendee.routeIndex === null;
                const isReturnTrip = attendee.isReturnTrip;
                const color = isUnassigned
                    ? unassignedColor
                    : isReturnTrip
                    ? returnTripColors[attendee.routeIndex! % returnTripColors.length]
                    : routeColors[attendee.routeIndex! % routeColors.length];
                const markerIndex = getMarkerIndex(attendee);

                return (
                    <AdvancedMarker
                        key={attendee.profileId}
                        position={{ lat: attendee.lat, lng: attendee.lng }}
                        title={`${attendee.displayName}: ${attendee.destination}${isReturnTrip ? " (戻り便)" : ""}`}
                        onClick={() => onMarkerClick(attendee)}
                    >
                        <MarkerPin
                            index={markerIndex}
                            color={color}
                            name={attendee.displayName}
                            isUnassigned={isUnassigned}
                            isReturnTrip={isReturnTrip}
                        />
                    </AdvancedMarker>
                );
            })}

            {routes.map((_, idx) => (
                <DirectionsPolyline
                    key={idx}
                    geocodedAttendees={geocodedAttendees}
                    routeIndex={idx}
                    color={routeColors[idx % routeColors.length]}
                />
            ))}
        </>
    );
}

export function PickupMap({ routes, storeLocation, attendees, onRouteChange }: PickupMapProps) {
    const [geocodedAttendees, setGeocodedAttendees] = useState<GeocodedAttendee[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [isReady, setIsReady] = useState(false);
    const [storePosition, setStorePosition] = useState<{ lat: number; lng: number } | null>(null);
    const [selectedAttendee, setSelectedAttendee] = useState<GeocodedAttendee | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    // ルート割り当て情報をオブジェクト化
    const assignmentRecord: Record<string, { routeIndex: number; routeId: string; tripNumber: number }> = {};
    routes.forEach((route, routeIndex) => {
        route.passengers.forEach((passenger) => {
            assignmentRecord[passenger.cast_profile_id] = {
                routeIndex,
                routeId: route.id,
                tripNumber: passenger.trip_number,
            };
        });
    });

    // ジオコーディング
    const geocodeAddresses = useCallback(async () => {
        setIsGeocoding(true);
        const geocoder = new google.maps.Geocoder();
        const results: GeocodedAttendee[] = [];

        if (storeLocation.latitude && storeLocation.longitude) {
            setStorePosition({ lat: storeLocation.latitude, lng: storeLocation.longitude });
        } else if (storeLocation.address) {
            try {
                const response = await new Promise<google.maps.GeocoderResult[]>(
                    (resolve, reject) => {
                        geocoder.geocode(
                            { address: storeLocation.address!, region: "JP" },
                            (results, status) => {
                                if (status === "OK" && results) {
                                    resolve(results);
                                } else {
                                    reject(new Error(`Store geocoding failed: ${status}`));
                                }
                            }
                        );
                    }
                );
                if (response[0]) {
                    setStorePosition({
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                    });
                }
            } catch (error) {
                console.error("Failed to geocode store address:", error);
            }
        }

        for (const attendee of attendees) {
            if (!attendee.pickup_destination) continue;

            try {
                const response = await new Promise<google.maps.GeocoderResult[]>(
                    (resolve, reject) => {
                        geocoder.geocode(
                            { address: attendee.pickup_destination!, region: "JP" },
                            (results, status) => {
                                if (status === "OK" && results) {
                                    resolve(results);
                                } else {
                                    reject(new Error(`Geocoding failed: ${status}`));
                                }
                            }
                        );
                    }
                );

                if (response[0]) {
                    const assignment = assignmentRecord[attendee.profile_id];
                    results.push({
                        profileId: attendee.profile_id,
                        destination: attendee.pickup_destination,
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                        displayName: attendee.display_name,
                        routeIndex: assignment?.routeIndex ?? null,
                        routeId: assignment?.routeId ?? null,
                        tripNumber: assignment?.tripNumber ?? null,
                        isReturnTrip: (assignment?.tripNumber ?? 1) > 1,
                    });
                }
            } catch (error) {
                console.error(`Failed to geocode: ${attendee.pickup_destination}`, error);
            }
        }

        setGeocodedAttendees(results);

        if (storeLocation.latitude && storeLocation.longitude) {
            setMapCenter({ lat: storeLocation.latitude, lng: storeLocation.longitude });
        } else if (results.length > 0) {
            const avgLat = results.reduce((sum, r) => sum + r.lat, 0) / results.length;
            const avgLng = results.reduce((sum, r) => sum + r.lng, 0) / results.length;
            setMapCenter({ lat: avgLat, lng: avgLng });
        }

        setIsGeocoding(false);
    }, [attendees, storeLocation, assignmentRecord]);

    useEffect(() => {
        const hasStoreToGeocode = !storePosition && (storeLocation.latitude || storeLocation.address);
        const hasAttendees = attendees.length > 0 && geocodedAttendees.length === 0;

        if (isReady && (hasAttendees || hasStoreToGeocode)) {
            geocodeAddresses();
        }
    }, [isReady, attendees.length, geocodedAttendees.length, geocodeAddresses, storePosition, storeLocation]);

    useEffect(() => {
        if (geocodedAttendees.length > 0) {
            const updatedAttendees = geocodedAttendees.map((attendee) => {
                const assignment = assignmentRecord[attendee.profileId];
                return {
                    ...attendee,
                    routeIndex: assignment?.routeIndex ?? null,
                    routeId: assignment?.routeId ?? null,
                    tripNumber: assignment?.tripNumber ?? null,
                    isReturnTrip: (assignment?.tripNumber ?? 1) > 1,
                };
            });
            setGeocodedAttendees(updatedAttendees);
        }
    }, [routes]);

    const handleMarkerClick = (attendee: GeocodedAttendee) => {
        setSelectedAttendee(attendee);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAttendee(null);
    };

    if (!apiKey) {
        return (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-red-500">Google Maps APIキーが設定されていません</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* マップ - モバイル向けに高さを調整 */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 relative">
                <APIProvider
                    apiKey={apiKey}
                    language="ja"
                    onLoad={() => setIsReady(true)}
                >
                    {isGeocoding ? (
                        <div className="h-[50vh] min-h-[300px] max-h-[500px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    住所を検索中...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Map
                            style={{ width: "100%", height: "50vh", minHeight: "300px", maxHeight: "500px" }}
                            defaultCenter={mapCenter}
                            center={mapCenter}
                            defaultZoom={12}
                            gestureHandling="greedy"
                            disableDefaultUI={true}
                            zoomControl={false}
                            streetViewControl={false}
                            mapTypeControl={false}
                            fullscreenControl={false}
                            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
                        >
                            <MapContent
                                routes={routes}
                                geocodedAttendees={geocodedAttendees}
                                storePosition={storePosition}
                                storeName={storeLocation.name}
                                onMarkerClick={handleMarkerClick}
                            />
                        </Map>
                    )}
                </APIProvider>

                {/* 凡例 - マップ右上にオーバーレイ */}
                {!isGeocoding && routes.length > 0 && (
                    <div className="absolute top-3 right-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-w-[200px]">
                        <div className="space-y-2">
                            {/* 未割り当て */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: unassignedColor }}
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                    未割り当て
                                </span>
                            </div>
                            {/* ルート */}
                            {routes.map((route, idx) => (
                                <div key={route.id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: routeColors[idx % routeColors.length] }}
                                        />
                                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                            {route.driver_name || `ルート${idx + 1}`}
                                        </span>
                                    </div>
                                    {/* 戻り便 */}
                                    <div className="flex items-center gap-2 pl-1">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: returnTripColors[idx % returnTripColors.length],
                                                border: "1.5px dashed white",
                                                boxShadow: `0 0 0 1px ${returnTripColors[idx % returnTripColors.length]}`,
                                            }}
                                        />
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                            ↩ 戻り便
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 送迎先一覧 - タップしやすいサイズ */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        送迎先一覧 ({geocodedAttendees.length}件)
                    </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {geocodedAttendees.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            送迎先が設定されていません
                        </div>
                    ) : (
                        geocodedAttendees.map((attendee) => {
                            const isUnassigned = attendee.routeIndex === null;
                            const isReturnTrip = attendee.isReturnTrip;
                            const color = isUnassigned
                                ? unassignedColor
                                : isReturnTrip
                                ? returnTripColors[attendee.routeIndex! % returnTripColors.length]
                                : routeColors[attendee.routeIndex! % routeColors.length];

                            return (
                                <button
                                    key={attendee.profileId}
                                    type="button"
                                    onClick={() => handleMarkerClick(attendee)}
                                    className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors text-left touch-manipulation"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 relative">
                                            <div
                                                className="flex items-center justify-center h-10 w-10 rounded-full text-white text-sm font-bold"
                                                style={{
                                                    backgroundColor: color,
                                                    border: isReturnTrip ? "2px dashed white" : undefined,
                                                    boxShadow: isReturnTrip ? "0 0 0 2px " + color : undefined,
                                                }}
                                            >
                                                {isUnassigned ? "?" : isReturnTrip ? "↩" : "✓"}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-base font-medium text-gray-900 dark:text-white">
                                                    {attendee.displayName}
                                                </p>
                                                {isReturnTrip && (
                                                    <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                        戻り便
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {attendee.destination}
                                            </p>
                                            {!isUnassigned && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                                    {routes[attendee.routeIndex!]?.driver_name || `ルート${attendee.routeIndex! + 1}`}
                                                </p>
                                            )}
                                        </div>
                                        <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ボトムシートモーダル */}
            <MarkerActionSheet
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                attendee={selectedAttendee}
                routes={routes}
                onRouteChange={onRouteChange}
            />
        </div>
    );
}
