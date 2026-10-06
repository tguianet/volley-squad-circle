// Public Supabase connection values.
//
// These values are intentionally safe to ship to the browser:
// - project URL
// - project id
// - anon/publishable key
//
// Private credentials such as SUPABASE_SERVICE_ROLE_KEY must NEVER be added here.
export const SUPABASE_PUBLIC_CONFIG = {
  projectId: "ufpxmumyopolrngfybns",
  url: "https://ufpxmumyopolrngfybns.supabase.co",
  publishableKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcHhtdW15b3BvbHJuZ2Z5Ym5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzIxODksImV4cCI6MjA5NjU0ODE4OX0.rFwzmf9z_YTFw8PnbDnMN32HI6j1-PhYEvRT153MEuY",
} as const;
