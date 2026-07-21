// Hand-authored types matching supabase/migrations/0001_init.sql
// Once the project is linked, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts

export type MemberCategory = "institution" | "affiliation" | "other";
export type AppRole = "admin" | "member";
export type TicketStatus = "pending" | "paid" | "failed" | "cancelled";
export type EventStatus = "draft" | "current" | "upcoming" | "past";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          membership_id: string;
          full_name: string;
          email: string;
          category: MemberCategory;
          institution_name: string | null;
          has_disability: boolean;
          signup_method: "form" | "google";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          full_name: string;
          email: string;
          category: MemberCategory;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_roles: {
        Row: { id: string; user_id: string; role: AppRole };
        Insert: { user_id: string; role: AppRole };
        Update: Partial<{ role: AppRole }>;
      };
      events: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          venue: string;
          starts_at: string;
          status: EventStatus;
          ticket_price: number | null;
          ticket_currency: string;
          capacity: number | null;
          cover_image_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          title: string;
          slug: string;
          description: string;
          venue: string;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
      };
      tickets: {
        Row: {
          id: string;
          event_id: string;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string;
          ticket_number: string | null;
          amount: number;
          status: TicketStatus;
          mpesa_receipt: string | null;
          checkout_request_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["tickets"]["Row"]> & {
          event_id: string;
          buyer_name: string;
          buyer_email: string;
          buyer_phone: string;
          amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["tickets"]["Row"]>;
      };
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          body: string;
          cover_image_url: string | null;
          is_pinned: boolean;
          comments_enabled: boolean;
          published_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["articles"]["Row"]> & {
          title: string;
          slug: string;
          excerpt: string;
          body: string;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Row"]>;
      };
      article_comments: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          body: string;
          is_approved: boolean;
          created_at: string;
        };
        Insert: { article_id: string; user_id: string; body: string };
        Update: Partial<{ is_approved: boolean; body: string }>;
      };
      feedback_entries: {
        Row: {
          id: string;
          kind: "feedback" | "suggestion";
          name: string;
          institution: string | null;
          message: string;
          is_pinned: boolean;
          is_approved: boolean;
          created_at: string;
        };
        Insert: { kind: "feedback" | "suggestion"; name: string; institution?: string | null; message: string };
        Update: Partial<Database["public"]["Tables"]["feedback_entries"]["Row"]>;
      };
      newsletter_subscribers: {
        Row: { id: string; email: string; created_at: string; is_active: boolean };
        Insert: { email: string };
        Update: Partial<{ is_active: boolean }>;
      };
      site_settings: {
        Row: { key: string; value: string; updated_at: string };
        Insert: { key: string; value: string };
        Update: { value: string };
      };
      push_subscriptions: {
        Row: { id: string; user_id: string | null; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { user_id?: string | null; endpoint: string; p256dh: string; auth: string };
        Update: never;
      };
    };
  };
}
