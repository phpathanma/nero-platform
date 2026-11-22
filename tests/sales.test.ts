import { describe, expect, it } from "vitest";
import { ALL, filterSales, salesSummary, type Sale } from "@/lib/sales";

const sale = (over: Partial<Sale>): Sale => ({
  id: "o-" + Math.random().toString(36).slice(2, 8), buyer_name: "Ana Pérez", buyer_email: "cliente@example.com", buyer_phone: "+51999000111",
  total: 0, status: "confirmed", source: "free_access", date_label: "20 nov 2026", event_id: "casita", event_name: "La Casita",
  entry: { kind: "pending", usedAt: null }, ...over,
});

const sales: Sale[] = [
  sale({ buyer_name: "Ana Pérez", entry: { kind: "used", usedAt: "2026-11-21T03:41:00Z" } }),
  sale({ buyer_name: "Luis Soto", buyer_phone: "+51988777666" }),
  sale({ buyer_name: "Ana Ruiz", event_id: "bresh", event_name: "BRESH USMP", entry: { kind: "used", usedAt: "2026-11-29T04:00:00Z" } }),
  sale({ buyer_name: "Carla Díaz", event_id: "bresh", event_name: "BRESH USMP", status: "paid", source: "sale", total: 30 }),
  sale({ buyer_name: "Prueba", status: "cancelled", entry: { kind: "cancelled", usedAt: null } }),
];
const all = { eventId: ALL, query: "", status: ALL, entry: "all" as const };

describe("filtros de Ventas", () => {
  it("sin filtros muestra todo", () => {
    expect(filterSales(sales, all)).toHaveLength(5);
  });

  it("el selector de evento se combina con el buscador y con el filtro de ingreso", () => {
    expect(filterSales(sales, { ...all, eventId: "casita" }).map((s) => s.buyer_name)).toEqual(["Ana Pérez", "Luis Soto", "Prueba"]);
    expect(filterSales(sales, { ...all, query: "ana" }).map((s) => s.buyer_name)).toEqual(["Ana Pérez", "Ana Ruiz"]);
    expect(filterSales(sales, { ...all, eventId: "bresh", query: "ana" }).map((s) => s.buyer_name)).toEqual(["Ana Ruiz"]);
    expect(filterSales(sales, { ...all, eventId: "casita", entry: "used" }).map((s) => s.buyer_name)).toEqual(["Ana Pérez"]);
    expect(filterSales(sales, { ...all, eventId: "casita", entry: "pending" }).map((s) => s.buyer_name)).toEqual(["Luis Soto"]);
    expect(filterSales(sales, { ...all, query: "988777" }).map((s) => s.buyer_name)).toEqual(["Luis Soto"]);
    expect(filterSales(sales, { ...all, eventId: "bresh", status: "paid" }).map((s) => s.buyer_name)).toEqual(["Carla Díaz"]);
  });

  it("los contadores cambian con el evento elegido y no con el texto buscado", () => {
    expect(salesSummary(sales)).toEqual({ gross: 30, paid: 1, pending: 0, total: 5, checkedIn: 2, withTicket: 4 });
    expect(salesSummary(sales, "casita")).toEqual({ gross: 0, paid: 0, pending: 0, total: 3, checkedIn: 1, withTicket: 2 });
    expect(salesSummary(sales, "bresh")).toEqual({ gross: 30, paid: 1, pending: 0, total: 2, checkedIn: 1, withTicket: 2 });
    expect(salesSummary(sales, "evento-sin-ventas")).toEqual({ gross: 0, paid: 0, pending: 0, total: 0, checkedIn: 0, withTicket: 0 });
  });
});
