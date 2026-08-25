import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECTS_JSON_URL = "https://raw.githubusercontent.com/Deshraj-Jogiya/Deshraj-Jogiya.github.io/main/projects.json"
const MAX_MESSAGE_LENGTH = 500
const MAX_HISTORY_TURNS = 6 // server-side cap regardless of what the client sends

// Fetched live on every request rather than duplicated as hardcoded text --
// the old version had the entire background hand-typed into this prompt,
// which meant every profile update (new project, new skill) required
// remembering to edit this file separately and redeploy it. Reading the
// same projects.json the website itself renders from means this can never
// drift out of sync with the live site again. (The client-side answer
// cache can still serve a stale cached reply for a repeated question --
// see clear-chatbot-cache, invoked by the deploy workflow only when this
// file actually changes.)
async function fetchProfileContext(): Promise<string> {
  const res = await fetch(PROJECTS_JSON_URL, { headers: { "Cache-Control": "no-cache" } })
  if (!res.ok) {
    throw new Error(`Failed to fetch profile data: ${res.status}`)
  }
  const data = await res.json()

  const projectLines = (data.projects || [])
    .map((p: any) => `  - ${p.name}: ${p.desc}`)
    .join("\n")

  const skillLines = (data.skills || [])
    .map((s: any) => `  - ${s.category}: ${s.items.join(", ")}`)
    .join("\n")

  const expLines = (data.experience || [])
    .map((e: any) => {
      const bullets = (e.bullets || []).map((b: any) => `      - ${b.html.replace(/<[^>]+>/g, "")}`).join("\n")
      return `  - ${e.role} at ${e.company} (${e.dates})\n${bullets}`
    })
    .join("\n")

  return `Work History:\n${expLines}\n\nKey Projects:\n${projectLines}\n\nTechnical Skills:\n${skillLines}`
}

function buildSystemPrompt(profileContext: string): string {
  return `You are a virtual career assistant agent trained on Deshraj Jogiya's professional profile.
Your goal is to answer questions about his technical experience, engineering projects, background, or availability.
You must stay professional, polite, objective, and speak in the third person.
This is a real-time conversation -- use any earlier turns for context (e.g. "that role", "his other project") instead of treating every message as standalone.

CRITICAL RECRUITER-FIRST RESPONSE RULES:
1. BREVITY & BLUF DIRECTIVE: Lead with the direct executive-summary answer in the first sentence. Keep the whole response short -- a couple of tight sentences, or a few bullet points for a list-style question. Never recite his entire resume or write long narrative paragraphs. Bold key terms, tools, and metrics with **double asterisks**; use "- " for list items when a question calls for a list. The chat window renders both correctly.
2. LOCATION QUERY: When asked "where is he located" or about his location, explicitly state: "Deshraj is located in Tempe, Arizona (Phoenix Metropolitan Area), United States, and is open to relocation to major technology hubs nationwide for Data Engineering and ML Engineering opportunities."
3. CURRENT ROLE / ACTIVITY QUERY: When asked "what is he currently doing" or about his current work, state that he is currently working as a Teleoperation Data Collection Associate at Objectways Technologies LLC in Tempe, AZ, scaling robotics telemetry pipelines in Python, Scala, PySpark, and Kubernetes.
4. BEST WORK QUERY (ADAPTIVE SYNTHESIS): When asked "what is his best work", synthesize across his strongest, most current work -- lead with whichever of his agentic AI/LLM projects, cloud data engineering work, or ML optimization results best answers the specific question, using the real project/experience data below. Offer to go deeper on a specific area (Generative AI/Agentic Systems, Cloud Data Engineering, ML Model Optimization) if the recruiter wants more.
5. CONCRETE TECHNICAL METHODOLOGY: When asked "how" Deshraj achieved a specific metric, give the exact technical mechanism where it's known:
   - 30% Model Deployment Error Cut (Technoid LLC): Achieved by building automated phased regression test suites, contract payload validation using PyTest/FastAPI, and mandatory UAT staging gates before production.
   - 65% Sync Latency Cut (Technoid LLC): Achieved by restructuring Supabase Row-Level Security (RLS) policies, adding indexed composite keys in PostgreSQL, and switching to async batch updates.
   - 25% Recommendation Accuracy Boost (Technoid LLC): Achieved by designing structured JSON schema prompts for GPT-4o mini, implementing semantic keyword extraction, and tuning LLM temperature bounds.
   - 60% Data Availability Boost (Zifatech Solutions): Achieved by migrating legacy databases to AWS Glue ETL pipelines and S3 Data Lakes feeding Snowflake OLAP data warehouses.
   - 98%+ Data Reliability Standard (Zifatech Solutions): Achieved by implementing Star Schema dimensional modeling in Snowflake combined with automated Great Expectations QA data assertion rules.
   - 30% Teleoperation Ingestion Processing Cut (Objectways Technologies): Achieved by containerizing Python, Scala, and PySpark data ingestion scripts in Kubernetes clusters with parallelized batch workers.
   For a metric not covered above, answer from the real project/experience data rather than inventing a mechanism.
6. If a question falls outside his real, documented background, say so plainly rather than guessing or inventing details.

Contact Information:
  - Email: djogiya786@gmail.com
  - LinkedIn: https://linkedin.com/in/deshraj-jogiya
  - GitHub: https://github.com/Deshraj-Jogiya
  - Portfolio: https://Deshraj-Jogiya.github.io

Deshraj's Current Professional Background:
${profileContext}

Write a recruiter-optimized, third-person answer following the BLUF and brevity rules above.`
}

type Turn = { role: "user" | "assistant"; text: string }

function sanitizeHistory(history: unknown): Turn[] {
  if (!Array.isArray(history)) return []
  return history
    .filter((h): h is Turn => h && typeof h === "object" && typeof h.text === "string" && (h.role === "user" || h.role === "assistant"))
    .slice(-MAX_HISTORY_TURNS * 2)
}

async function callAnthropic(apiKey: string, systemPrompt: string, history: Turn[], userMessage: string): Promise<string> {
  const messages = [
    ...history.map(h => ({ role: h.role, content: h.text })),
    { role: "user", content: userMessage },
  ]
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: systemPrompt,
      messages,
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Anthropic API returned status ${response.status}: ${errText}`)
  }
  const data = await response.json()
  return data.content?.[0]?.text || "I'm sorry, I couldn't process that query."
}

async function callGemini(apiKey: string, systemPrompt: string, history: Turn[], userMessage: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const contents = [
    ...history.map(h => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.text }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ]
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that query."
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Message must be a string under ${MAX_MESSAGE_LENGTH} characters.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const safeHistory = sanitizeHistory(history)

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    // LLM_PROVIDER lets you pick explicitly ("anthropic" | "gemini"); unset
    // defaults to whichever key is actually present, preferring Anthropic
    // if both are configured -- same provider-choice pattern as Career
    // Pilot's own LLM_PROVIDER setting, so keeping or dropping either key
    // never breaks this function outright. Currently set to "anthropic" as
    // a deliberate choice (a real paid key, not the free Gemini tier) --
    // flip this secret to "gemini" any time to go back to $0 per call.
    const requestedProvider = (Deno.env.get("LLM_PROVIDER") || "").toLowerCase()
    const provider = requestedProvider || (anthropicKey ? "anthropic" : geminiKey ? "gemini" : "")

    if (provider === "anthropic" && !anthropicKey) {
      return new Response(JSON.stringify({ error: "LLM_PROVIDER is set to anthropic but ANTHROPIC_API_KEY is missing." }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (provider === "gemini" && !geminiKey) {
      return new Response(JSON.stringify({ error: "LLM_PROVIDER is set to gemini but GEMINI_API_KEY is missing." }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!provider) {
      return new Response(JSON.stringify({ error: "No LLM configured -- set ANTHROPIC_API_KEY or GEMINI_API_KEY as a Supabase function secret." }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const profileContext = await fetchProfileContext()
    const systemPrompt = buildSystemPrompt(profileContext)

    const reply = provider === "anthropic"
      ? await callAnthropic(anthropicKey!, systemPrompt, safeHistory, message)
      : await callGemini(geminiKey!, systemPrompt, safeHistory, message)

    return new Response(JSON.stringify({ reply: reply.trim(), provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
