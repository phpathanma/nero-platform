"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "./actions";

const items = [
  { href: "/control", label: "Resumen", icon: "◫" },
  { href: "/control/eventos", label: "Eventos", icon: "✳" },
  { href: "/control/ventas", label: "Ventas", icon: "↗" },
  { href: "/control/accesos", label: "Accesos QR", icon: "▦" },
];

export function ControlNav({ role }: { role: "admin" | "door_staff" }) {
  const pathname = usePathname();
  const visibleItems = role === "admin" ? items : items.filter((item) => !["/control/eventos", "/control/ventas"].includes(item.href));
  return <aside className="sidebar">
    <Link className="logo" href="/">NERO</Link>
    <span className="eyebrow">Control · {role === "admin" ? "Administrador" : "Puerta"}</span>
    <nav aria-label="Módulos de control">{visibleItems.map((item) => {
      const active = item.href === "/control" ? pathname === item.href : pathname.startsWith(item.href);
      return <Link key={item.href} className={active ? "active" : ""} href={item.href}><span aria-hidden="true">{item.icon}</span>{item.label}</Link>;
    })}</nav>
    <div className="sidebar-bottom"><Link href="/">↖ Ver sitio</Link><form action={signOut}><button type="submit">Cerrar sesión</button></form></div>
  </aside>;
}
