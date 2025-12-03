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

const AccordionItemContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (v: boolean) => void;
}>({ isOpen: false, setIsOpen: () => {} });

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
            <AccordionItemContext.Provider value={{ isOpen, setIsOpen }}>
                <div ref={ref} className={cn("border-b", className)} {...props}>
                    {children}
                </div>
            </AccordionItemContext.Provider>
        </AccordionContext.Provider>
    );
});
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(AccordionItemContext);
    return (
        <h3 className="flex">
            <button
                ref={ref}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
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
    );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { isOpen } = React.useContext(AccordionItemContext);
    if (!isOpen) return null;

    return (
        <div
            ref={ref}
            className={cn("overflow-hidden text-sm", className)}
            {...props}
        >
            <div className="pb-4 pt-0">{children}</div>
        </div>
    );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
