interface CastAssignment {
    id: string;
    cast_id: string;
    guest_id: string;
    status: string;
    profiles: any;
}

interface GuestGroup {
    guest: any;
    servingCasts: any[];
}

export function groupGuestsByCasts(castAssignments: CastAssignment[]): GuestGroup[] {
    const guestGroups: GuestGroup[] = [];
    const guestIds = new Set<string>();

    // Extract guests (cast_id === guest_id)
    castAssignments
        .filter((a) => a.cast_id === a.guest_id)
        .forEach((a) => {
            if (!guestIds.has(a.guest_id)) {
                guestIds.add(a.guest_id);
                // Get casts serving this guest
                const servingCasts = castAssignments
                    .filter((c) =>
                        c.guest_id === a.guest_id &&
                        c.cast_id !== c.guest_id &&
                        c.status === "serving"
                    )
                    .map((c) => c.profiles);

                guestGroups.push({
                    guest: a.profiles,
                    servingCasts
                });
            }
        });

    return guestGroups;
}
