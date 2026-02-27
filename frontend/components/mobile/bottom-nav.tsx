"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Home, 
  Droplets, 
  Receipt, 
  Users, 
  Settings,
  LayoutDashboard,
  QrCode,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
}

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/daily-entry", icon: Droplets, label: "Entry" },
  { href: "/admin/bills", icon: Receipt, label: "Bills" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

const customerNavItems: NavItem[] = [
  { href: "/customer/dashboard", icon: Home, label: "Home" },
  { href: "/customer/bills", icon: FileText, label: "Bills" },
  { href: "/customer/pay", icon: QrCode, label: "Pay" },
  { href: "/customer/settings", icon: Settings, label: "Settings" },
];

interface BottomNavProps {
  role: "admin" | "customer";
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNavItems : customerNavItems;

  // Don't show on login/signup pages
  if (pathname.includes("/login") || pathname.includes("/signup")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glassmorphism container with safe area padding */}
      <div className="glass-card mx-4 mb-4 rounded-2xl pb-[env(safe-area-inset-bottom)] border-white/10">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                
                <item.icon 
                  className={cn(
                    "w-5 h-5 mb-1 transition-all duration-200",
                    isActive ? "stroke-[2.5px]" : "stroke-[1.5px]"
                  )} 
                />
                <span className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
                
                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavDot"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
