import Link from "next/link";
import "./control.css";
import { ControlNav } from "./control-nav";
import { getControlAccess } from "@/lib/supabase/control";
import { signOut } from "./actions";

export default async function ControlLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user, role } = await getControlAccess();
  if (!supabase) return <main className="gate"><span className="eyebrow">NERO CONTROL</span><h1>Conecta Supabase</h1><p>Configura las variables de Supabase para iniciar sesión en el panel.</p><Link className="btn" href="/">VOLVER AL SITIO</Link></main>;
  if (!user || !role) return <main className="gate"><span className="eyebrow">NERO CONTROL</span><h1>Acceso al equipo</h1><p>{user ? "Tu cuenta todavía no tiene rol de equipo. Pide al administrador que te asigne admin o door_staff." : "Inicia sesión para acceder a la gestión de NERO."}</p>{user ? <form action={signOut}><button className="btn" type="submit">CERRAR SESIÓN</button></form> : <Link className="btn" href="/control/login">INICIAR SESIÓN</Link>}</main>;
  return <div className="admin-shell"><ControlNav role={role} /><main className="admin-main">{children}</main></div>;
}
