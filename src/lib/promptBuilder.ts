import type { BriefingData, Client } from "./types";

/** Substitui {{var}} por valores do briefing + cliente. */
export function fillPrompt(
  template: string,
  client: Client,
  extras: Record<string, string> = {},
): string {
  const b: BriefingData = client.briefing_data ?? {};
  const map: Record<string, string> = {
    company_name: client.company_name || b.company_name || client.name,
    responsible_name: b.responsible_name || b.full_name || "",
    bio: b.bio || "",
    segment: client.segment || b.segment || "",
    opening_date: b.opening_date || "",
    city_state: b.city_state || "",
    areas: b.areas || "",
    phone: b.phone || "",
    email: b.email || "",
    instagram: b.instagram || b.socials || "",
    other_socials: b.other_socials || b.socials || "",
    hours: b.hours || "",
    service_modes: b.service_modes || "",
    main_service: b.main_service || "",
    other_services: b.other_services || "",
    problem_solved: b.problem_solved || "",
    audience: b.audience || "",
    differentiator: b.differentiator || "",
    praises: b.praises || "",
    faq: b.faq || "",
    restrictions: b.restrictions || "",
    team: b.team || "",
    daily_capacity: b.daily_capacity || "",
    avg_duration: b.avg_duration || "",
    scheduling: b.scheduling || "",
    payment_methods: b.payment_methods || "",
    promotions: b.promotions || "",
    parking: b.parking || "",
    accessibility: b.accessibility || "",
    restroom: b.restroom || "",
    wifi: b.wifi || "",
    kid_friendly: b.kid_friendly || "",
    slogan: b.slogan || "",
    brand_colors: client.brand_colors || "",
    ...extras,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = map[k];
    return v && v.trim() ? v : `[${k.toUpperCase()}]`;
  });
}
