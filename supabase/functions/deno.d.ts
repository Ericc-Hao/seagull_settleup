/** Minimal Deno globals for Supabase Edge Functions (Deno runtime). */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
