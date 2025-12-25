"use client";

import * as React from "react";

const TOAST_LIMIT = 5;
// Delay before removing DOM nodes after dismiss (ms)
const TOAST_REMOVE_DELAY = 5000;

export type ToastActionElement = React.ReactNode;

export interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

type ToastState = {
  toasts: Toast[];
};

// Auto dismiss after this timeout (ms)
const toastTimeout = 3000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST"
} as const;

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: Toast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<Toast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

const toastReducers = (state: ToastState, action: Action): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast
        )
      };
    case "DISMISS_TOAST":
      const toastId = action.toastId;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== toastId)
      };
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: []
        };
      }

      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId)
      };
    default:
      return state;
  }
};

const listeners: Array<(state: ToastState) => void> = [];

let memoryState: ToastState = { toasts: [] };

function dispatch(action: Action) {
  memoryState = toastReducers(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast: ({ duration, ...props }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2, 9);
      const update = (props: Toast) => dispatch({ type: "UPDATE_TOAST", toast: props });
      const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

      dispatch({ type: "ADD_TOAST", toast: { id, ...props } });
      setTimeout(dismiss, duration ?? toastTimeout);

      return {
        id,
        dismiss,
        update
      };
    },
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId })
  };
}

// スタンドアロンのtoast関数（コンポーネント外でも使用可能）
function toast({ duration, ...props }: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2, 9);
  const update = (props: Toast) => dispatch({ type: "UPDATE_TOAST", toast: props });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({ type: "ADD_TOAST", toast: { id, ...props } });
  setTimeout(dismiss, duration ?? toastTimeout);

  return {
    id,
    dismiss,
    update
  };
}

export { useToast, toast };
