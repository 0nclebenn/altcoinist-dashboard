"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",           label: "Dashboard" },
  { href: "/tickets",    label: "Tickets"   },
  { href: "/kb",         label: "KB Manager"},
  { href: "/team",       label: "Team"      },
  { href: "/analytics",  label: "Analytics" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed top-0 left-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Altcoinist</p>
        <p className="font-semibold text-white mt-0.5">Support</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
