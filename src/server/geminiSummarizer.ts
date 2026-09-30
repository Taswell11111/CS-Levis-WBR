import { GoogleGenAI } from "@google/genai";

const summaryCache: Record<string, string> = {};

export interface TicketAnalysis {
  summary: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  sentimentScore: number; // 1-10 (1=Angry/Negative, 10=Very Positive)
}

export async function generateBacklogSummaries(tickets: any[]): Promise<Record<string, TicketAnalysis>> {
  const result: Record<string, TicketAnalysis> = {};
  const needed: any[] = [];

  for (const t of tickets) {
    const id = String(t.id);
    if (summaryCache[id]) {
      // For this implementation, we'll parse the cache if it's stored as JSON
      try {
        result[id] = JSON.parse(summaryCache[id]);
      } catch {
        result[id] = { summary: summaryCache[id], sentiment: 'Neutral', sentimentScore: 5 };
      }
    } else {
      needed.push(t);
    }
  }

  if (needed.length === 0) return result;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const prompt = `You are an operations executive summariser and customer sentiment analyst. Use British English (UK spelling: -ise, -isation, enquiry, catalogue). For each backlog customer support ticket, provide:
1. A crisp 1-sentence operational summary (maximum 12 words).
2. A sentiment classification: 'Positive', 'Neutral', or 'Negative'.
3. A sentiment score from 1 (very angry/negative) to 10 (very positive).

Return ONLY valid JSON: { "analyses": { "<ticket_id>": { "summary": "<summary>", "sentiment": "<sentiment>", "sentimentScore": <score> } } }

Tickets:
${needed.map(t => `- ID ${t.id}: [${t.type || "Support"}] "${t.subject}" (Customer: ${t.requester?.name || "Customer"}) ${(t.description_text || "").slice(0, 150)}`).join("\n")}`;

      let res;
      try {
        res = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
      } catch {
        res = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
      }

      const parsed = JSON.parse(res.text || "{}");
      if (parsed.analyses) {
        Object.entries(parsed.analyses).forEach(([id, analysis]: [string, any]) => {
          summaryCache[id] = JSON.stringify(analysis);
          result[id] = analysis;
        });
      }
    } catch (err: any) {
      // Graceful fallback
    }
  }

  // Fallback if model was unavailable
  needed.forEach(t => {
    const id = String(t.id);
    if (!result[id]) {
      const fallback: TicketAnalysis = {
        summary: `Customer enquiry regarding ${t.type || "order"} awaiting operational resolution.`,
        sentiment: 'Neutral',
        sentimentScore: 5
      };
      summaryCache[id] = JSON.stringify(fallback);
      result[id] = fallback;
    }
  });

  return result;
}
