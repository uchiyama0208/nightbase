"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type StatusTab = { label: string; value: string };

type CmsListLayoutProps = {
  title: string;
  description: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusTabs: StatusTab[];
  statusValue: string;
  onStatusChange: (value: string) => void;
  createHref: string;
  createLabel: string;
  secondaryFilters?: ReactNode;
  children: ReactNode;
};

export function CmsListLayout({
  title,
  description,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  statusTabs,
  statusValue,
  onStatusChange,
  createHref,
  createLabel,
  secondaryFilters,
  children,
}: CmsListLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">CMS</p>
        <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end">
          <Tabs value={statusValue} onValueChange={onStatusChange} className="w-full md:w-auto">
            <TabsList className="w-full justify-start rounded-full bg-slate-100 md:w-auto">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="px-4 text-xs uppercase tracking-[0.2em]">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button
            asChild
            className="w-full justify-center gap-2 bg-primary text-white md:w-auto md:self-stretch"
          >
            <Link href={createHref}>{createLabel}</Link>
          </Button>
        </div>
      </div>

      {secondaryFilters ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {secondaryFilters}
        </div>
      ) : null}

      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {children}
      </div>
    </div>
  );
}
