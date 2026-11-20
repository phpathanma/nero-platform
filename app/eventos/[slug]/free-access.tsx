"use client";

import { useState } from "react";
import { FreeTicketForm } from "@/app/tickets/free-ticket-form";
import { FREE_PASS_CTA } from "@/lib/free-pass";

export function FreeAccess({ tierId }: { tierId: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "CERRAR" : FREE_PASS_CTA.toUpperCase()}</button>
    {open && <div className="free-pass-form">
      <p className="muted">Completa tus datos y genera al instante tu QR para presentarlo en puerta. No pagas nada en la web.</p>
      <FreeTicketForm tierId={tierId} />
    </div>}
  </>;
}
