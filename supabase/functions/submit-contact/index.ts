import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, message } = await req.json()
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, email, or message" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Insert into portfolio_messages database table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: dbError } = await supabase
      .from('portfolio_messages')
      .insert([{ name, email, message }])

    if (dbError) {
      throw new Error(`Database save failed: ${dbError.message}`)
    }

    // 2. Trigger GitHub Action via Repository Dispatch
    const githubPat = Deno.env.get("GITHUB_PAT")
    if (!githubPat) {
      throw new Error("Missing GITHUB_PAT secret in Supabase")
    }

    const githubResponse = await fetch("https://api.github.com/repos/Deshraj-Jogiya/Deshraj-Jogiya.github.io/dispatches", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubPat}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "Supabase-Edge-Function"
      },
      body: JSON.stringify({
        event_type: "contact_submission",
        client_payload: { name, email, message }
      })
    })

    if (!githubResponse.ok) {
      const githubErr = await githubResponse.text()
      throw new Error(`GitHub API dispatch failed: ${githubErr}`)
    }

    return new Response(JSON.stringify({ success: true, message: "Contact form submitted and notification triggered!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
