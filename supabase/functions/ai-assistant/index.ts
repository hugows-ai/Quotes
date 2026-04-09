import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Check AI usage limits server-side
    const { data: usageData, error: usageError } = await supabaseClient.rpc('get_my_usage_summary');
    // Since this is called with service_role, we need to check manually
    const { data: subData } = await supabaseClient
      .from('user_subscriptions')
      .select('plan, ai_daily_limit')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = subData?.plan || 'free';
    const aiDailyLimit = subData?.ai_daily_limit || 5;

    if (plan !== 'pro') {
      // Count today's usage
      const today = new Date().toISOString().split('T')[0];
      const { count, error: countError } = await supabaseClient
        .from('ai_usage_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('request_date', today);

      const usesToday = count || 0;
      if (usesToday >= aiDailyLimit) {
        return new Response(JSON.stringify({ error: `AI daily limit reached (${usesToday}/${aiDailyLimit}). Upgrade to Pro for unlimited access.` }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { messages, noteContent, noteTitle } = await req.json();

    // Validate input
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit message length to prevent abuse
    const sanitizedMessages = messages.slice(-20).map((m: any) => ({
      role: String(m.role || 'user').slice(0, 10),
      content: String(m.content || '').slice(0, 10000),
    }));

    const safeTitle = String(noteTitle || '').slice(0, 500);
    const safeContent = String(noteContent || '').slice(0, 50000);

    const systemPrompt = `Você é um assistente de escrita integrado ao app Quotes. Você ajuda o usuário com suas notas.
Suas capacidades:
- Resumir textos
- Corrigir gramática e ortografia
- Traduzir textos
- Sugerir melhorias no conteúdo
- Gerar ideias e brainstorming
- Formatar texto em Markdown
- Responder perguntas sobre o conteúdo da nota

${safeTitle ? `A nota atual se chama: "${safeTitle}"` : ""}
${safeContent ? `O conteúdo atual da nota é:\n---\n${safeContent}\n---` : "Nenhuma nota selecionada."}

Responda de forma clara e concisa. Use Markdown quando apropriado.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...sanitizedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a few seconds." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Insufficient credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI assistant error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record usage BEFORE streaming (to prevent bypass via closing connection)
    await supabaseClient.from('ai_usage_events').insert({
      user_id: userId,
      feature: 'assistant',
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
