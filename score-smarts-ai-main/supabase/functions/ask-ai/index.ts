import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, userId } = await req.json();
    
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Create Supabase client to fetch user's uploaded materials
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's syllabus and past papers for context
    let syllabusContext = "";
    let papersContext = "";

    if (userId) {
      const { data: syllabus } = await supabase
        .from("syllabus")
        .select("title, file_url")
        .eq("user_id", userId);
      
      if (syllabus && syllabus.length > 0) {
        syllabusContext = `User has uploaded ${syllabus.length} syllabus file(s): ${syllabus.map(s => s.title).join(", ")}`;
      }

      const { data: papers } = await supabase
        .from("past_papers")
        .select("year, subject")
        .eq("user_id", userId);
      
      if (papers && papers.length > 0) {
        papersContext = `User has uploaded ${papers.length} past paper(s) from years: ${[...new Set(papers.map(p => p.year))].join(", ")}`;
      }
    }

    const systemPrompt = `You are EngiGenius AI, an expert study assistant for engineering students. Your role is to:
1. Analyze questions and provide 10/10 exam-ready, easy-to-memorize answers
2. Identify important topics and predict likely exam questions
3. Provide clear explanations with examples
4. Generate summaries and quick revision notes

Context about user's materials:
${syllabusContext || "No syllabus uploaded yet"}
${papersContext || "No past papers uploaded yet"}

IMPORTANT: 
- Format your answers clearly with headings, bullet points, and numbered lists
- Include key formulas where relevant
- Provide exam tips and memory techniques
- Keep answers comprehensive but easy to understand
- Always return structured, well-formatted responses

At the end of your response, provide a JSON block with important topics extracted:
\`\`\`json
{
  "important_topics": ["topic1", "topic2", "topic3"],
  "summary": "Brief 2-3 sentence summary"
}
\`\`\``;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ask-ai error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
