"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Loader2 } from "lucide-react";
import type { PickupRouteWithPassengers } from "./actions";

interface PickupMapProps {
    routes: PickupRouteWithPassengers[];
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

interface GeocodedLocation {
    destination: string;
    lat: number;
    lng: number;
    passengerName: string;
    routeIndex: number;
    tripNumber: number;
}

// ルート描画コンポーネント
function DirectionsPolyline({
    geocodedLocations,
    routeIndex,
    color,
}: {
    geocodedLocations: GeocodedLocation[];
    routeIndex: number;
    color: string;
}) {
    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const polylineRef = useRef<google.maps.Polyline | null>(null);

    useEffect(() => {
        if (!map || !routesLibrary) return;

        const routeLocations = geocodedLocations
            .filter((loc) => loc.routeIndex === routeIndex)
            .sort((a, b) => {
                if (a.tripNumber !== b.tripNumber) {
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
                    // 既存のポリラインを削除
                    if (polylineRef.current) {
                        polylineRef.current.setMap(null);
                    }

                    // 新しいポリラインを作成
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
    }, [map, routesLibrary, geocodedLocations, routeIndex, color]);

    return null;
}

// マーカーのPinコンポーネント
function MarkerPin({ index, color }: { index: number; color: string }) {
    return (
        <div
            style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                backgroundColor: color,
                border: "2px solid white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: 12,
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
        >
            {index + 1}
        </div>
    );
}

// マップコンテンツコンポーネント
function MapContent({
    routes,
    geocodedLocations,
}: {
    routes: PickupRouteWithPassengers[];
    geocodedLocations: GeocodedLocation[];
}) {
    return (
        <>
            {/* マーカー */}
            {geocodedLocations.map((loc, idx) => (
                <AdvancedMarker
                    key={idx}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    title={`${loc.passengerName}: ${loc.destination}`}
                >
                    <MarkerPin
                        index={idx}
                        color={routeColors[loc.routeIndex % routeColors.length]}
                    />
                </AdvancedMarker>
            ))}

            {/* ルート線 */}
            {routes.map((_, idx) => (
                <DirectionsPolyline
                    key={idx}
                    geocodedLocations={geocodedLocations}
                    routeIndex={idx}
                    color={routeColors[idx % routeColors.length]}
                />
            ))}
        </>
    );
}

export function PickupMap({ routes }: PickupMapProps) {
    const [geocodedLocations, setGeocodedLocations] = useState<GeocodedLocation[]>([]);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [mapCenter, setMapCenter] = useState(defaultCenter);
    const [isReady, setIsReady] = useState(false);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

    // 全ての送迎先を抽出
    const allDestinations: { destination: string; passengerName: string; routeIndex: number; tripNumber: number }[] = [];
    routes.forEach((route, routeIndex) => {
        route.passengers.forEach((passenger) => {
            if (passenger.pickup_destination) {
                allDestinations.push({
                    destination: passenger.pickup_destination,
                    passengerName: passenger.cast_name,
                    routeIndex,
                    tripNumber: passenger.trip_number,
                });
            }
        });
    });

    // ジオコーディング（住所→緯度経度）
    const geocodeAddresses = useCallback(async () => {
        if (allDestinations.length === 0) return;

        setIsGeocoding(true);
        const geocoder = new google.maps.Geocoder();
        const results: GeocodedLocation[] = [];

        for (const dest of allDestinations) {
            try {
                const response = await new Promise<google.maps.GeocoderResult[]>(
                    (resolve, reject) => {
                        geocoder.geocode(
                            { address: dest.destination, region: "JP" },
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
                    results.push({
                        destination: dest.destination,
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                        passengerName: dest.passengerName,
                        routeIndex: dest.routeIndex,
                        tripNumber: dest.tripNumber,
                    });
                }
            } catch (error) {
                console.error(`Failed to geocode: ${dest.destination}`, error);
            }
        }

        setGeocodedLocations(results);

        // 中心を最初の結果に設定
        if (results.length > 0) {
            const avgLat = results.reduce((sum, r) => sum + r.lat, 0) / results.length;
            const avgLng = results.reduce((sum, r) => sum + r.lng, 0) / results.length;
            setMapCenter({ lat: avgLat, lng: avgLng });
        }

        setIsGeocoding(false);
    }, [allDestinations.length]);

    // APIがロードされたらジオコーディング開始
    useEffect(() => {
        if (isReady && allDestinations.length > 0 && geocodedLocations.length === 0) {
            geocodeAddresses();
        }
    }, [isReady, allDestinations.length, geocodedLocations.length, geocodeAddresses]);

    if (!apiKey) {
        return (
            <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-red-500">Google Maps APIキーが設定されていません</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* マップ */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700">
                <APIProvider
                    apiKey={apiKey}
                    language="ja"
                    onLoad={() => setIsReady(true)}
                >
                    {isGeocoding ? (
                        <div className="h-[400px] bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    住所を検索中...
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Map
                            style={{ width: "100%", height: "400px" }}
                            defaultCenter={mapCenter}
                            center={mapCenter}
                            defaultZoom={12}
                            gestureHandling="greedy"
                            disableDefaultUI={false}
                            zoomControl={true}
                            streetViewControl={false}
                            mapTypeControl={false}
                            fullscreenControl={true}
                            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID"}
                        >
                            <MapContent
                                routes={routes}
                                geocodedLocations={geocodedLocations}
                            />
                        </Map>
                    )}
                </APIProvider>
            </div>

            {/* 凡例 */}
            {routes.length > 0 && (
                <div className="flex flex-wrap gap-4">
                    {routes.map((route, idx) => (
                        <div key={route.id} className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: routeColors[idx % routeColors.length] }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                {route.driver_name || `ルート${idx + 1}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 送迎先一覧 */}
            <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        送迎先一覧
                    </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {geocodedLocations.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            送迎先が設定されていません
                        </div>
                    ) : (
                        geocodedLocations.map((loc, idx) => (
                            <div
                                key={idx}
                                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <div
                                            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-white text-sm font-medium"
                                            style={{ backgroundColor: routeColors[loc.routeIndex % routeColors.length] }}
                                        >
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {loc.passengerName}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {loc.destination}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
