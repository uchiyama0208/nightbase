import { useState, useEffect } from "react";
import { TableSession } from "@/types/floor";
import { getStoreSettings, rotateCast } from "../actions";
import { sortCastsByTime } from "../utils/time-utils";
import { GuestGroup } from "../types";

export function useSessionDetail(session: TableSession, onUpdate: () => void) {
    const [daySwitchTime, setDaySwitchTime] = useState<string>("05:00:00");
    const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(new Set());

    // Load store settings
    useEffect(() => {
        getStoreSettings().then(settings => {
            if (settings?.day_switch_time) {
                setDaySwitchTime(settings.day_switch_time);
            }
        });
    }, []);

    // Check for cast rotation every 10 seconds
    useEffect(() => {
        const checkRotation = async () => {
            const assignments = (session as any).cast_assignments || [];
            const now = new Date();

            for (const assignment of assignments) {
                if (assignment.status === 'serving' && assignment.end_time) {
                    const endTime = new Date(assignment.end_time);
                    if (now >= endTime) {
                        await rotateCast(assignment.id);
                        onUpdate();
                    }
                }
            }
        };

        const interval = setInterval(checkRotation, 10000);
        return () => clearInterval(interval);
    }, [session, onUpdate]);

    // Initialize expanded state when guests change
    useEffect(() => {
        if (session) {
            const guestIds = (session as any).cast_assignments
                ?.filter((a: any) => a.cast_id === a.guest_id)
                .map((a: any) => a.guest_id) || [];
            setExpandedGuestIds(new Set(guestIds));
        }
    }, [session]);

    const castAssignments = (session as any).cast_assignments || [];

    // Group cast assignments by guest
    const guestGroups = castAssignments.reduce((acc: Record<string, GuestGroup>, assignment: any) => {
        const guestId = assignment.guest_id || 'unassigned';
        if (!acc[guestId]) {
            acc[guestId] = {
                id: guestId,
                profile: assignment.guest_profile,
                casts: []
            };
        }
        // Exclude guest entries (cast_id === guest_id) from cast list
        if (assignment.cast_id !== assignment.guest_id) {
            acc[guestId].casts.push(assignment);
        }
        return acc;
    }, {});

    // Get unique guests from assignments
    const guests = Object.keys(guestGroups)
        .filter(id => id !== 'unassigned')
        .map(guestId => ({
            id: guestId,
            ...guestGroups[guestId].profile
        }))
        .filter(guest => guest.id && guest.display_name);

    const toggleGuestExpanded = (guestId: string) => {
        const newSet = new Set(expandedGuestIds);
        if (newSet.has(guestId)) {
            newSet.delete(guestId);
        } else {
            newSet.add(guestId);
        }
        setExpandedGuestIds(newSet);
    };

    const getSortedCasts = (guestId: string) => {
        const casts = guestGroups[guestId]?.casts || [];
        return sortCastsByTime(casts, daySwitchTime);
    };

    return {
        daySwitchTime,
        expandedGuestIds,
        castAssignments,
        guestGroups,
        guests,
        toggleGuestExpanded,
        getSortedCasts,
    };
}
