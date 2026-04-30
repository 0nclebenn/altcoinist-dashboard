"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useRole } from "@/contexts/RoleContext";

const TicketsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function Sidebar() {
  const path = usePathname();
  const { currentRole } = useRole();
  const clerk = useClerk();

  const links = [
    { href: "/tickets",   label: "Tickets",   icon: <TicketsIcon /> },
    ...(currentRole === "super_admin" || currentRole === "admin"
      ? [{ href: "/analytics", label: "Analytics", icon: <AnalyticsIcon /> }]
      : []),
    { href: "/settings",  label: "Settings",  icon: <SettingsIcon /> },
  ];

  return (
    <aside className="fixed top-0 left-0 h-full w-14 bg-[rgba(8,8,8,0.85)] border-r border-white/[0.06] backdrop-blur-xl flex flex-col items-center z-40">
      {/* Logo */}
      <div className="py-4 flex justify-center">
        <div className="w-9 h-9 rounded-lg bg-brand-400 flex items-center justify-center text-black font-bold text-lg shadow-[0_0_20px_rgba(56,255,147,0.25)] select-none">
          A
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-2 w-full px-2">
        {links.map(({ href, label, icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex justify-center rounded-lg p-2 transition-all duration-300 w-full border ${
                active
                  ? "bg-brand-400/[0.08] text-brand-400 border-brand-400/20"
                  : "text-white/35 hover:text-white hover:bg-white/[0.03] border-transparent"
              }`}
            >
              {icon}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="pb-4 px-2 w-full">
        <button
          onClick={() => clerk.signOut()}
          title="Sign out"
          className="text-white/30 hover:text-red-400 rounded-lg p-2 flex justify-center transition-colors w-full"
        >
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
}
