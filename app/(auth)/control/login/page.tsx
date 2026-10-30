import Link from "next/link";
import { signIn } from "@/app/control/actions";

const messages: Record<string, string> = {
  config: "Falta configurar Supabase.",
  credentials: "Revisa el correo y la contraseña.",
  connection: "No se pudo conectar con Supabase. Revisa la conexión del servidor e inténtalo de nuevo.",
};

export default async function ControlLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="gate"><Link className="logo" href="/">NERO</Link><span className="eyebrow">NERO CONTROL</span><h1>Iniciar sesión</h1><p className="muted">Accede con la cuenta de tu equipo.</p>
    {error && <div className="notice" role="alert">{messages[error] ?? "No se pudo iniciar sesión."}</div>}
    <form className="admin-form" action={signIn}><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required /><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" required /><button className="btn" type="submit">ENTRAR</button></form>
  </main>;
}
