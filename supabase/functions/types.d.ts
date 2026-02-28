declare module "npm:@supabase/supabase-js@2" {
  export type EdgeAuthResult = {
    data: {
      user: { id: string } | null;
    };
    error: unknown | null;
  };

  export type EdgeSupabaseClient = {
    auth: {
      getUser: () => Promise<EdgeAuthResult>;
    };
  };

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: {
      global?: {
        headers?: Record<string, string>;
      };
    },
  ): EdgeSupabaseClient;
}

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};
