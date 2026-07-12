import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  LayoutDashboard,
  Package,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Organization setup", href: "/organization", icon: Building2 },
  { label: "Assets", href: "/assets", icon: Package },
  {
    label: "Allocation & Transfer",
    href: "/allocations",
    icon: ArrowLeftRight,
  },
  { label: "Resource Booking", href: "/bookings", icon: Calendar },
  { label: "Maintenance", href: "/maintenance", icon: Wrench },
  { label: "Audit", href: "/audits", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
