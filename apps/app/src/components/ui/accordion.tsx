"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; collapsible?: boolean }
>(({ className, type, collapsible, ...props }, ref) => (
    <div ref={ref} className={className} {...props} />
));
Accordion.displayName = "Accordion";

const AccordionContext = React.createContext<{
    value?: string;
    onValueChange?: (value: string) => void;
}>({});

const AccordionItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <AccordionContext.Provider
            value={{
                value: isOpen ? value : undefined,
                onValueChange: () => setIsOpen(!isOpen),
            }}
        >
            <div ref={ref} className={cn("border-b", className)} {...props}>
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child)) {
                        // @ts-ignore
                        return React.cloneElement(child, { value, isOpen, setIsOpen });
                    }
                    return child;
                })}
            </div>
        </AccordionContext.Provider>
    );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen?: boolean; setIsOpen?: (v: boolean) => void }
>(({ className, children, isOpen, setIsOpen, ...props }, ref) => (
    <h3 className="flex">
        <button
            ref={ref}
            onClick={() => setIsOpen && setIsOpen(!isOpen)}
            className={cn(
                "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
                className
            )}
            data-state={isOpen ? "open" : "closed"}
            {...props}
        >
            {children}
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out", isOpen && "rotate-180")} />
        </button>
    </h3>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { isOpen?: boolean; setIsOpen?: (v: boolean) => void }
>(({ className, children, isOpen, setIsOpen, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "overflow-hidden text-sm",
            isOpen 
                ? "animate-accordion-down" 
                : "animate-accordion-up pointer-events-none"
        )}
        style={{
            display: isOpen ? "block" : "none",
        }}
        {...props}
    >
        <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </div>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
