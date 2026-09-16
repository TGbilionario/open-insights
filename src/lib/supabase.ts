import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] || "https://guwgcumeuwpvicyspcwl.supabase.co";
const supabasePublishableKey =
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
  "sb_publishable_ccXMaX-j0rfaF1JxUe2RTw_enUWuO9p";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
