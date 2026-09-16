import { createClient } from "@supabase/supabase-js";

const EXTERNAL_SUPABASE_URL = "https://guwgcumeuwpvicyspcwl.supabase.co";
const EXTERNAL_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ccXMaX-j0rfaF1JxUe2RTw_enUWuO9p";
const configuredUrl = import.meta.env['VITE_SUPABASE_URL'];
const configuredKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
const isLegacyLovableCloud = configuredUrl?.includes("tujagdckpcqsfihrzugk") ?? false;

const supabaseUrl = isLegacyLovableCloud || !configuredUrl ? EXTERNAL_SUPABASE_URL : configuredUrl;
const supabasePublishableKey = isLegacyLovableCloud || !configuredKey ? EXTERNAL_SUPABASE_PUBLISHABLE_KEY : configuredKey;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
