import "expo-sqlite/localStorage/install";
import Constants from "expo-constants";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

const extra = Constants.expoConfig?.extra ?? {};
const url = extra.supabaseUrl as string | undefined;
const publishableKey = extra.supabasePublishableKey as string | undefined;

export const supabase = url && publishableKey ? createClient(url, publishableKey, { auth: { storage: globalThis.localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }) : null;

if (supabase) AppState.addEventListener("change", (state) => state === "active" ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh());
