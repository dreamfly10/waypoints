// Supabase auth has been removed from this prototype.
// Keep a tiny stub so existing imports compile without pulling in supabase-js.

export const isAuthEnabled = false;

// Minimal placeholder type / value; not used at runtime.
export type AuthUser = {
  id: string;
  email?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = null;
