import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254 // RFC 5321 max
const MAX_MESSAGE_LENGTH = 2000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_WINDOW_MINUTES = 2

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
    if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "name, email, and message must all be strings." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (name.length > MAX_NAME_LENGTH || email.length > MAX_EMAIL_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Field too long (name<=${MAX_NAME_LENGTH}, email<=${MAX_EMAIL_LENGTH}, message<=${MAX_MESSAGE_LENGTH}).` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "That doesn't look like a valid email address." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Basic anti-spam: reject a second submission from the same email within
    // a short window, before it ever reaches the DB insert or the GitHub
    // dispatch (each dispatch fires a real email send via
    // contact_notification.yml -- this endpoint had no protection against a
    // script hitting it repeatedly). Doesn't stop a spammer rotating fake
    // addresses, but it's a real, zero-migration first line of defense
    // using only the columns this table already has.
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { data: recent, error: recentErr } = await supabase
      .from('portfolio_messages')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', windowStart)
      .limit(1)

    if (!recentErr && recent && recent.length > 0) {
      return new Response(JSON.stringify({ error: `Please wait a couple of minutes before sending another message.` }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Insert into portfolio_messages database table
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
