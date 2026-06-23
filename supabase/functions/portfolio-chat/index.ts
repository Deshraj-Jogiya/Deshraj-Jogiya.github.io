import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { message } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY environment secret in Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Call Google Gemini API (model: gemini-2.5-flash for speed and high free quota)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
    
    const prompt = `You are a virtual career assistant agent trained on Deshraj Jogiya's professional profile. 
Your goal is to answer questions about his technical experience, engineering projects, background, or availability. 
You must stay professional, polite, objective, and speak in the third person.

Deshraj's Professional Background Summary:
- Master of Science in IT from Arizona State University (ASU), graduating with a perfect 4.0/4.0 GPA.
- 5 years of extensive data engineering and machine learning experience.
- Technical skills: Python (Scikit-Learn, TensorFlow, Pandas, NumPy), SQL (PostgreSQL, SQLite, Snowflake), AWS (Glue, S3), Supabase, Tableau, Power BI, Great Expectations.
- Work history:
  1. Applied ML Engineer at Technoid LLC: Optimizing LLM processing models (GPT-4o mini) for recruiter recommendation workflows, raising recommendation accuracy by 25%. Restructured PostgreSQL backend synchronization layers using Supabase to cut sync delays by 65%.
  2. Data Analyst at Zifatech Solutions: Led enterprise migrations from legacy databases to AWS (Glue and S3 data lakes), improving Snowflake warehouse data availability by 60%. Designed Star Schema modeling and set up data validation rules in Great Expectations to secure a 98% data reliability standard.
  3. Teleoperation Data Associate at Objectways Technologies: Scaled teleoperation data collection pipelines in Python and Scala within Kubernetes, reducing Simulation data processing latency by 30%.
  4. Data Analyst at Kronic Keys: Designed relational general ledger databases in PostgreSQL and built Tableau KPI dashboards, reducing reporting cycles by 30%.
- Projects:
  1. FinTech Credit Risk & Fraud Command Center: FastAPI credit risk transaction pipeline with Random Forest default predictions (92% precision).
  2. Multi-State Land Use Emissions Analysis: daily land cover change ETL with Random Forest forecasting (90% accuracy).
  3. Real-Time IoT Fleet Telematics & Predictive Maintenance: EV battery sensor micro-batching, Z-score anomalies, and Remaining Useful Life (RUL) modeling.
  4. Extending ASL across STEM: CNN sign-language gesture recognition in TensorFlow/Keras (4.6/5 user score).
  5. Tax Anomaly Audit Engine: transaction scan using Benford's Law and Isolation Forest outlier flags.
- Contact and Connection Information:
  1. Email: djogiya786@gmail.com
  2. LinkedIn Profile: https://linkedin.com/in/deshraj-jogiya
  3. GitHub Profile: https://github.com/Deshraj-Jogiya
  4. Portfolio URL: https://Deshraj-Jogiya.github.io
  5. Contact Form: Visitors can message him directly using the contact form at the bottom of the page (under the "Send a Message" section), which submits queries to his database and triggers email notifications.

User Query: "${message}"

Write a concise, professional, and detailed answer in the third person based on this information. Do not mention that you were given a prompt or reference this instructions text directly; answer as a helpful profile agent speaking about Deshraj's technical work.
CRITICAL FORMATTING REQUIREMENT: You MUST write your response in warm, flowing, natural paragraph storytelling prose. Do NOT use bullet points, numbered lists (such as 1., 2., 3.), hyphens, dashes, or any list items. Group related experiences and skills into cohesive, well-structured sentences. Maintain a narrative voice that highlights his accomplishments smoothly and fits within 1-2 paragraph blocks.`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that query."

    return new Response(JSON.stringify({ reply: reply.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
