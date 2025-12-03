export interface CastAssignment {
    id: string;
    cast_id: string;
    guest_id: string;
    status: string;
    grid_x: number | null;
    grid_y: number | null;
    start_time: string;
    end_time: string | null;
    profiles: {
        id: string;
        display_name: string;
        avatar_url?: string;
    };
    guest_profile?: {
        id: string;
        display_name: string;
        avatar_url?: string;
    };
}

export interface GuestGroup {
    id: string;
    profile: any;
    casts: CastAssignment[];
}

export interface PendingPlacement {
    profile: any;
    mode: "guest" | "cast";
    guestId: string | null;
    assignmentId?: string;
}

export interface DeleteConfirmation {
    id: string;
    name: string;
}

export interface StatusEdit {
    id: string;
    name: string;
    currentStatus: string;
}

export interface CastDetailEdit {
    profile: any;
    guestId: string | null;
    gridX: number | null;
    gridY: number | null;
    startTime: string;
    endTime: string;
    status: string;
}
