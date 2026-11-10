"use client";

import { useState } from "react";
import { FreeTicketForm } from "@/app/tickets/free-ticket-form";

export function FreeAccess({ tierId }: { tierId: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "CERRAR" : "OBTENER ENTRADA"}</button>
    {open && <div className="ticket-row-form">
      <p className="muted">Completa tus datos y emitiremos una entrada con QR a tu nombre.</p>
      <FreeTicketForm tierId={tierId} />
    </div>}
  </>;
}
