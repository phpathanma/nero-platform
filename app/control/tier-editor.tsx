"use client";

import { useState } from "react";
import { FREE_PASS_CONDITION, FREE_PASS_NAME, FREE_PASS_TITLE } from "@/lib/free-pass";

type Category = "free_access" | "ga_10pm" | "ga_all_night" | "vip" | "dj_booth" | "custom";
type Tier = { id?: string; category: Category; name: string; price: number; capacity: number; sold: number };

// Igual que la web: el único tipo de entrada que se puede crear es el pase Free con Consumo.
// Las categorías antiguas (GA, VIP, DJ Booth, personalizadas) solo aparecen si un evento ya las tiene:
// sin emisiones se pueden quitar; con emisiones se conservan para no perder el historial.
export function TierEditor({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers.map((tier) => ({ ...tier, category: tier.category ?? "custom", sold: tier.sold ?? 0 })));
  const pass = tiers.find((tier) => tier.category === "free_access");
  const legacy = tiers.filter((tier) => tier.category !== "free_access");

  function togglePass() {
    if (pass && pass.sold > 0) return;
    setTiers((items) => pass
      ? items.filter((tier) => tier.category !== "free_access")
      : [{ category: "free_access", name: FREE_PASS_NAME, price: 0, capacity: 0, sold: 0 }, ...items]);
  }

  function remove(target: Tier) {
    if (target.sold > 0) return;
    setTiers((items) => items.filter((tier) => tier !== target));
  }

  function setCapacity(target: Tier, value: string) {
    setTiers((items) => items.map((tier) => tier === target ? { ...tier, capacity: value === "" ? 0 : Number(value) } : tier));
  }

  return <section className="tier-editor">
    <div className="tier-editor-heading"><div><span className="eyebrow">Aforo y acceso</span><h2>Pase del evento</h2></div><span className="muted">Un único pase con QR, igual que en la web.</span></div>
    <div className="tier-presets">
      <label className={`tier-preset${pass ? " selected" : ""}`}>
        <input type="checkbox" checked={Boolean(pass)} disabled={Boolean(pass && pass.sold > 0)} onChange={togglePass} />
        <span>{FREE_PASS_TITLE}</span>{pass && pass.sold > 0 && <small>{pass.sold} emitidas</small>}
      </label>
    </div>

    {pass && <div className="tier-fields">
      <input type="hidden" name="tier_id" value={pass.id ?? ""} />
      <input type="hidden" name="tier_category" value="free_access" />
      <input type="hidden" name="tier_name" value={FREE_PASS_NAME} />
      <div className="tier-name"><b>{FREE_PASS_NAME}</b><small className="muted">{FREE_PASS_CONDITION}</small></div>
      <div className="tier-value"><small>Precio en la web</small><b>Gratis · S/ 0</b><input type="hidden" name="tier_price" value="0" /></div>
      <label>Cupo<input name="tier_capacity" type="number" min={Math.max(1, pass.sold)} step="1" value={pass.capacity || ""} placeholder="Define el cupo" onChange={(event) => setCapacity(pass, event.target.value)} required /><small className="muted">{pass.id ? `${pass.sold} emitidas` : "Pases máximos"}</small></label>
    </div>}
    {!pass && <p className="muted">Activa el pase para habilitar el registro con QR.</p>}

    {legacy.length > 0 && <div className="tier-legacy">
      <span className="eyebrow">Categorías anteriores</span>
      <p className="muted">No se muestran en la web. Quita las que no tienen emisiones; las que sí tienen se conservan por el historial.</p>
      {legacy.map((tier) => <div className="tier-fields tier-legacy-row" key={tier.id ?? tier.name}>
        <input type="hidden" name="tier_id" value={tier.id ?? ""} />
        <input type="hidden" name="tier_category" value={tier.category} />
        <input type="hidden" name="tier_name" value={tier.name} />
        <input type="hidden" name="tier_price" value={tier.price} />
        <input type="hidden" name="tier_capacity" value={tier.capacity} />
        <div className="tier-name"><b>{tier.name}</b><small className="muted">{tier.sold} emitidas · cupo {tier.capacity}</small></div>
        {tier.sold > 0
          ? <small className="muted">Se conserva: tiene entradas emitidas.</small>
          : <button className="text-action danger" type="button" onClick={() => remove(tier)}>QUITAR</button>}
      </div>)}
    </div>}
    {tiers.length > 0 && <p className="muted tier-capacity-note">El cupo cuenta los pases emitidos desde la web y las cortesías.</p>}
  </section>;
}
