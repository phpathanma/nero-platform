"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { musicEmbed } from "@/lib/music";

const FLYER_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const FLYER_MAX_BYTES = 4 * 1024 * 1024;

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) redirect("/control/login?error=config");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/control/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/control?error=role");
  return supabase;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/control/login?error=credentials");
  const supabase = await createClient();
  if (!supabase) redirect("/control/login?error=config");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[control/login] Supabase sign-in failed", { code: error.code, status: error.status, message: error.message });
    if (error.status === 0 || error.message.toLowerCase().includes("fetch failed")) {
      redirect("/control/login?error=connection");
    }
    redirect("/control/login?error=credentials");
  }
  redirect("/control");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/control/login");
}

export async function saveEvent(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const date = String(formData.get("event_date") ?? "");
  const time = String(formData.get("event_time") ?? "");
  const city = String(formData.get("city") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const status = String(formData.get("status") ?? "draft");
  const lineup = String(formData.get("lineup") ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const schedule = String(formData.get("schedule") ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const tierNames = formData.getAll("tier_name").map((value) => String(value).trim());
  const tierCategories = formData.getAll("tier_category").map((value) => String(value));
  const tierPrices = formData.getAll("tier_price").map((value) => Number(value));
  const tierCapacities = formData.getAll("tier_capacity").map((value) => Number(value));
  const tierIds = formData.getAll("tier_id").map((value) => String(value));
  const validCategories = ["free_access", "ga_10pm", "ga_all_night", "vip", "dj_booth", "custom"];
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !date || !time || !city || (status === "published" && !tierNames.length) || tierNames.length !== tierCategories.length || tierNames.length !== tierPrices.length || tierNames.length !== tierCapacities.length || tierNames.length !== tierIds.length || tierNames.some((tierName) => !tierName) || tierCategories.some((category) => !validCategories.includes(category)) || new Set(tierCategories.filter((category) => category !== "custom")).size !== tierCategories.filter((category) => category !== "custom").length || tierPrices.some((price, index) => !Number.isFinite(price) || price < 0 || (tierCategories[index] === "free_access" ? price !== 0 : price === 0)) || tierCapacities.some((capacity) => !Number.isInteger(capacity) || capacity < 1) || !["draft", "published", "past"].includes(status)) {
    redirect(id ? `/control/eventos/${id}?error=validation` : "/control/eventos/nuevo?error=validation");
  }

  const accentInput = String(formData.get("accent") ?? "");
  const accent = /^#[0-9a-f]{6}$/i.test(accentInput) ? accentInput.toLowerCase() : "#d4ff3f";
  const musicUrl = String(formData.get("music_url") ?? "").trim();
  if (musicUrl && !musicEmbed(musicUrl)) redirect(id ? `/control/eventos/${id}?error=music` : "/control/eventos/nuevo?error=music");
  const flyer = formData.get("flyer");
  const flyerFile = flyer instanceof File && flyer.size > 0 ? flyer : null;
  const flyerExtension = flyerFile ? FLYER_TYPES[flyerFile.type] : undefined;
  if (flyerFile && (!flyerExtension || flyerFile.size > FLYER_MAX_BYTES)) {
    redirect(id ? `/control/eventos/${id}?error=flyer-file` : "/control/eventos/nuevo?error=flyer-file");
  }

  const payload = {
    name, slug, event_date: date, event_time: time, city, venue: venue || "Por confirmar",
    tag, status, lineup, schedule, accent, background: "#252b12", music_url: musicUrl || null,
    ...(!flyerFile && formData.get("remove_flyer") === "on" ? { flyer_url: null } : {}),
  };
  const result = id
    ? await supabase.from("events").update(payload).eq("id", id).select("id").single()
    : await supabase.from("events").insert(payload).select("id").single();
  if (result.error || !result.data) redirect(id ? `/control/eventos/${id}?error=save` : "/control/eventos/nuevo?error=save");

  if (flyerFile && flyerExtension) {
    const path = `${result.data.id}/${Date.now()}.${flyerExtension}`;
    const upload = await supabase.storage.from("flyers").upload(path, flyerFile, { contentType: flyerFile.type, cacheControl: "31536000" });
    const flyerUrl = upload.error ? null : supabase.storage.from("flyers").getPublicUrl(path).data.publicUrl;
    const saved = flyerUrl ? await supabase.from("events").update({ flyer_url: flyerUrl }).eq("id", result.data.id) : null;
    if (!saved || saved.error) {
      console.error("[control/eventos] Flyer upload failed", { message: upload.error?.message ?? saved?.error?.message });
      revalidateTag("events");
      redirect(`/control/eventos/${result.data.id}?error=flyer`);
    }
  }

  if (!id) {
    if (tierNames.length) {
      const tiers = tierNames.map((tierName, index) => ({ event_id: result.data!.id, category: tierCategories[index], name: tierName, price: tierPrices[index], capacity: tierCapacities[index], sold: 0 }));
      const { error } = await supabase.from("ticket_tiers").insert(tiers);
      if (error) redirect(`/control/eventos/${result.data.id}?error=tier`);
    }
  } else {
    const { data: existingTiers, error: existingError } = await supabase.from("ticket_tiers").select("id,category,sold").eq("event_id", id);
    if (existingError) redirect(`/control/eventos/${id}?error=tier`);
    const soldById = new Map((existingTiers ?? []).map((item) => [item.id, item.sold]));
    const existingIds = new Set(soldById.keys());
    if (tierIds.some((tierId) => tierId && !existingIds.has(tierId)) || tierIds.some((tierId, index) => tierId && tierCapacities[index] < (soldById.get(tierId) ?? 0))) {
      redirect(`/control/eventos/${id}?error=capacity`);
    }
    for (let index = 0; index < tierNames.length; index += 1) {
      const tierId = tierIds[index];
      const tier = { category: tierCategories[index], name: tierNames[index], price: tierPrices[index], capacity: tierCapacities[index] };
      const tierResult = tierId && existingIds.has(tierId)
        ? await supabase.from("ticket_tiers").update(tier).eq("id", tierId).eq("event_id", id)
        : await supabase.from("ticket_tiers").insert({ ...tier, event_id: id, sold: 0 });
      if (tierResult.error) redirect(`/control/eventos/${id}?error=tier`);
    }
  }

  revalidatePath("/");
  revalidateTag("events");
  revalidatePath("/control");
  revalidatePath("/control/eventos");
  redirect("/control/eventos?saved=1");
}

export async function updateEventStatus(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "published", "past"].includes(status)) redirect("/control/eventos?error=validation");
  if (status === "published") {
    const { count, error: tierError } = await supabase.from("ticket_tiers").select("id", { count: "exact", head: true }).eq("event_id", id);
    if (tierError || !count) redirect("/control/eventos?error=no-tiers");
  }
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) redirect("/control/eventos?error=save");
  revalidatePath("/"); revalidateTag("events"); revalidatePath("/control"); revalidatePath("/control/eventos");
}

export async function deleteEvent(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const { count, error: ticketError } = await supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", id);
  if (ticketError || (count ?? 0) > 0) redirect("/control/eventos?error=has-tickets");
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) redirect("/control/eventos?error=delete");
  revalidatePath("/"); revalidateTag("events"); revalidatePath("/control"); revalidatePath("/control/eventos");
}
