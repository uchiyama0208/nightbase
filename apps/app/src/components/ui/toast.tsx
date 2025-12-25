"use client";

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";

import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 left-4 right-4 z-[10000] flex flex-col gap-3 sm:top-6 sm:left-auto sm:right-6 sm:w-[360px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-gray-100 shadow-lg backdrop-blur transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[120%] data-[state=closed]:animate-toastOut data-[state=open]:animate-toastIn",
        className
      )}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-xs text-gray-400", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-full p-1 text-gray-400 transition hover:text-gray-200",
      className
    )}
    {...props}
  />
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const Toaster = () => {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, variant }) => (
        <Toast
          key={id}
          className={cn(
            variant === "destructive"
              ? "border-red-500/40 bg-red-950/90 text-red-50"
              : "border-white/10 bg-gray-950/95"
          )}
        >
          <div className="flex flex-col gap-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? <ToastDescription>{description}</ToastDescription> : null}
          </div>
          <ToastClose aria-label="閉じる">×</ToastClose>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export { Toast, ToastTitle, ToastDescription, ToastClose, ToastViewport, Toaster };
