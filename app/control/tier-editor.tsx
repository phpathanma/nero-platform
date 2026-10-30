"use client";

import { useState } from "react";

type Category = "free_access" | "ga_10pm" | "ga_all_night" | "vip" | "dj_booth" | "custom";
type Tier = { id?: string; category: Category; name: string; price: number; capacity: number; sold: number };

const presets: { category: Exclude<Category, "custom">; name: string }[] = [
  { category: "free_access", name: "Free Access" },
  { category: "ga_10pm", name: "GA 10PM" },
  { category: "ga_all_night", name: "GA All Night" },
  { category: "vip", name: "VIP" },
  { category: "dj_booth", name: "DJ Booth" },
];

export function TierEditor({ initialTiers }: { initialTiers: Tier[] }) {
  const [tiers, setTiers] = useState<Tier[]>(initialTiers.map((tier) => ({ ...tier, category: tier.category ?? "custom", sold: tier.sold ?? 0 })));
  function togglePreset(category: Exclude<Category, "custom">, name: string) {
    const current = tiers.find((tier) => tier.category === category);
    if (current?.id) return; // A category already used by an event stays attached to it.
    if (current) {
      setTiers((items) => items.filter((tier) => tier.category !== category));
    } else {
      setTiers((items) => [...items, { category, name, price: 0, capacity: 0, sold: 0 }]);
    }
  }

  function update(index: number, key: "name" | "price" | "capacity", value: string) {
    setTiers((current) => current.map((tier, tierIndex) => tierIndex === index
      ? { ...tier, [key]: key === "name" ? value : (value === "" ? 0 : Number(value)) }
      : tier));
  }

  return <section className="tier-editor">
    <div className="tier-editor-heading"><div><span className="eyebrow">Aforo y acceso</span><h2>Tipos de entrada</h2></div><span className="muted">Activa solo las categorías que tendrá el evento.</span></div>
    <div className="tier-presets">
      {presets.map((preset) => {
        const existing = tiers.find((tier) => tier.category === preset.category);
        return <label className={`tier-preset${existing ? " selected" : ""}`} key={preset.category}>
          <input type="checkbox" checked={Boolean(existing)} disabled={Boolean(existing?.id)} onChange={() => togglePreset(preset.category, preset.name)} />
          <span>{preset.name}</span>{existing?.id && <small>Ya habilitada</small>}
        </label>;
      })}
    </div>

    {tiers.map((tier, index) => {
      const preset = presets.find((item) => item.category === tier.category);
      return <div className="tier-fields" key={tier.id ?? `${tier.category}-${index}`}>
        <input type="hidden" name="tier_id" value={tier.id ?? ""} />
        <input type="hidden" name="tier_category" value={tier.category} />
        {preset ? <><input type="hidden" name="tier_name" value={preset.name} /><div className="tier-name"><b>{preset.name}</b>{tier.id && <small className="muted">{tier.sold} emitidas</small>}</div></> : <label>Nombre<input name="tier_name" value={tier.name} onChange={(event) => update(index, "name", event.target.value)} required maxLength={60} /></label>}
        {tier.category === "free_access" ? <div className="tier-value"><small>Precio</small><b>Gratis · S/ 0</b><input type="hidden" name="tier_price" value="0" /></div> : <label>Precio (S/)<input name="tier_price" type="number" min="0" step="0.01" value={tier.price} onChange={(event) => update(index, "price", event.target.value)} required /></label>}
        <label>Cupo<input name="tier_capacity" type="number" min={Math.max(1, tier.sold)} step="1" value={tier.capacity || ""} placeholder="Define el cupo" onChange={(event) => update(index, "capacity", event.target.value)} required /><small className="muted">{tier.id ? `${tier.sold} emitidas` : "Entradas máximas"}</small></label>
      </div>;
    })}
    {!tiers.length && <p className="muted">Activa al menos una categoría para habilitar la emisión de entradas.</p>}
    {tiers.length > 0 && <p className="muted tier-capacity-note">Los cupos son por categoría y cuentan ventas, Free Access y cortesías.</p>}
  </section>;
}
