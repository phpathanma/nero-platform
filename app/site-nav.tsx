"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/#eventos", label: "AGENDA" },
  { href: "/#nosotros", label: "NOSOTROS" },
  { href: "/#pasados", label: "ARCHIVO" },
  { href: "/#siguenos", label: "SÍGUENOS" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return <nav className="site-nav" aria-label="Navegación principal">
    <Link className="site-logo" href="/" aria-label="NERO, inicio" onClick={close}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño y estático */}
      <img src="/logo.png" alt="NERO" width={1600} height={276} />
    </Link>
    <div className="site-links">
      {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      <Link className="site-cta" href="/#eventos">ENTRADAS</Link>
    </div>
    <button className="site-menu-button" type="button" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>{open ? "CERRAR" : "MENÚ"}</button>
    {open && <div className="site-menu" id="site-menu">
      {links.map((link) => <Link key={link.href} href={link.href} onClick={close}>{link.label}</Link>)}
      <Link className="site-cta" href="/#eventos" onClick={close}>ENTRADAS</Link>
    </div>}
  </nav>;
}
