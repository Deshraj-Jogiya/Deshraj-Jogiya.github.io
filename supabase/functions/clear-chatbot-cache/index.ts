import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Called by the deploy workflow only when projects.json actually changed --
// see .github/workflows/deploy.yml. Wipes chatbot_cache so the next visitor
// asking a previously-cached question gets an answer built from the new
// data instead of a stale cached one, without adding any per-request cost
// (a time-based cache TTL would mean re-calling the LLM more often for no
// reason -- this only invalidates when there's an actual reason to).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization") || ""
    const expectedToken = Deno.env.get("CACHE_CLEAR_TOKEN")
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const res = await fetch(`${supabaseUrl}/rest/v1/chatbot_cache?created_at=gte.1970-01-01`, {
      method: "DELETE",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "count=exact",
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Cache clear failed: ${res.status} ${errText}`)
    }

    return new Response(JSON.stringify({ success: true, message: "chatbot_cache cleared" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
