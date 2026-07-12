"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  isNavItemActive,
  navigationItems,
} from "@/components/dashboard/navigation";
import { cn } from "@/lib/utils";

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="[&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:border-white/8 [&_[data-slot=sidebar-inner]]:bg-[#0a1018] [&_[data-slot=sidebar-inner]]:text-slate-100"
    >
      <SidebarHeader className="border-b border-white/8 p-0">
        <div className="flex items-center gap-3 px-4 py-6 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-4">
          <div className="sidebar-brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white">
            AF
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <h2 className="truncate text-lg font-semibold tracking-tight">
              AssetFlow
            </h2>
            <span className="mt-1 block truncate text-xs text-slate-400">
              Enterprise Resource Platform
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-5">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-data-[collapsible=icon]:hidden">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navigationItems.map((item) => {
                const active = isNavItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "h-11 rounded-xl px-3 text-[15px] transition-all duration-200",
                        active
                          ? "sidebar-nav-active font-medium text-white hover:text-white data-[active=true]:text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className={cn(active && "text-teal-300")} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/8 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Sign Out"
              className="h-11 rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <Link href="/login">
                <LogOut />
                <span>Sign Out</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail className="after:bg-teal-400/40 hover:after:bg-teal-300/60" />
    </Sidebar>
  );
}
