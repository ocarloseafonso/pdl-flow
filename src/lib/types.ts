export type Phase = {
  id: number;
  name: string;
  description: string | null;
  position: number;
  expected_days: number;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  segment: string | null;
  current_phase_id: number;
  phase_started_at: string;
  briefing_token: string;
  briefing_submitted_at: string | null;
  briefing_data: BriefingData;
  brand_colors: string | null;
  brand_notes: string | null;
  site_url: string | null;
  site_generated: boolean;
  notes: string | null;
  status: string;
  contract_start_date: string | null;
  deadline_days: number;
  contract_value: number | null;
  contract_type: string | null; // 'monthly' | 'one_time' | null
  created_at: string;
  updated_at: string;
};

export type ClientTask = {
  id: string;
  client_id: string;
  phase_id: number;
  title: string;
  description: string | null;
  position: number;
  completed: boolean;
  completed_at: string | null;
};

export type BlogArticle = {
  id: string;
  client_id: string;
  position: number;
  title: string;
  keyword: string | null;
  intent: string | null;
  format: string | null;
  priority: number | null;
  status: "todo" | "in_review" | "published";
  content: string | null;
  published_url: string | null;
};

export type CalendarEvent = {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  event_time: string | null;
  type: "reminder" | "meeting" | "recurring" | "holiday";
  done: boolean;
};

export type PromptTemplate = {
  id: string;
  title: string;
  content: string;
  updated_at: string;
};

export type Holiday = { id: number; date: string; name: string };

/** Campos do briefing — todos opcionais para tolerar preenchimento parcial. */
export type BriefingData = Partial<{
  responsible_name: string;
  full_name: string;
  city_state: string;
  phone: string;
  email: string;
  company_name: string;
  segment: string;
  opening_date: string;
  areas: string;
  hours: string;
  service_modes: string;
  main_service: string;
  other_services: string;
  problem_solved: string;
  audience: string;
  acquisition: string;
  differentiator: string;
  praises: string;
  competitors: string;
  website: string;
  socials: string;
  whatsapp_response_time: string;
  faq: string;
  restrictions: string;
  team: string;
  daily_capacity: string;
  avg_duration: string;
  scheduling: string;
  walkin: string;
  payment_methods: string;
  promotions: string;
  has_photos: string;
  parking: string;
  easy_access: string;
  accessibility: string;
  restroom: string;
  ambient: string;
  covered: string;
  wait_time: string;
  wifi: string;
  kid_friendly: string;
  bio: string;
  slogan: string;
  // alias usado no prompt
  instagram: string;
  other_socials: string;
}>;

export const PHASE_NAMES: Record<number, string> = {
  1: "Onboarding",
  2: "Criação do Perfil",
  3: "Verificação",
  4: "Otimização + Site",
  5: "Citações",
  6: "Reputação",
  7: "Entrega do Projeto",
  8: "Manutenção",
};
