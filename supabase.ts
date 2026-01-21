import { createClient } from '@supabase/supabase-js';

// Using the credentials provided for the SKRM Security Workshop
const supabaseUrl = process.env.SUPABASE_URL || 'https://uixfepfisotjyhzttddz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeGZlcGZpc290anloenR0ZGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTE4MjUsImV4cCI6MjA4NDMyNzgyNX0.7nQdIBPLFw26z02uCs1jU5OCQXeTqg4Hz1FiYLACE2I';

// Check if credentials exist to prevent initialization errors
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Initialize the Supabase client. 
 * If configuration is missing, we use a Proxy to prevent the app from crashing on load.
 */
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get(_, prop) {
        return (...args: any[]) => {
          console.warn(`Supabase call intercepted: ${String(prop)}. Configuration is missing.`);
          return Promise.resolve({ data: null, error: { message: "Supabase not configured" } });
        };
      }
    });
