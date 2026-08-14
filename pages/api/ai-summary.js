import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from "@google/genai";

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to determine match status and cache policy
const getMatchStatusAndCachePolicy = (fixture) => {
  const now = new Date();
  const startTime = new Date(fixture.starting_at);
  let statusType = 'upcoming';
  let cacheDurationMinutes = 60; // Default for upcoming

  const timeToStartMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

  if(fixture.live === true) { 
    if (fixture.status === 'Finished' || fixture.status === 'Aban.' || fixture.status === 'Cancl.' || fixture.status === 'Postp.') {
      statusType = 'finished';
      cacheDurationMinutes = 1440; // 24 hours for finished matches
    } else if (fixture.status === '1st Innings' || fixture.status === '2nd Innings' || fixture.status === 'Innings Break' || fixture.status === '3rd Innings' || fixture.status === '4th Innings') { // Applicable for all formats
      statusType = 'live';
      cacheDurationMinutes = 2; // 2 minutes for live matches
    } else if (fixture.status === 'NS' && timeToStartMinutes <= 30 && timeToStartMinutes > -60) { // -60 to catch matches that just started but API not updated
      statusType = 'starting_soon_or_delayed';
      cacheDurationMinutes = 15; // 15 minutes for matches starting soon or delayed
    } else if (fixture.status === 'Tea Break' || fixture.status === 'Lunch' || fixture.status === 'Dinner') {
      statusType = 'live';
      cacheDurationMinutes = 30;
    } else if (fixture.status === 'Stump Day 1' || fixture.status === 'Stump Day 2' || fixture.status === 'Stump Day 3' || fixture.status === 'Stump Day 4') {
      statusType = 'live';
      cacheDurationMinutes = 300;
    } else if (fixture.status === 'Delayed' || fixture.status === 'Int.') {
      statusType = 'starting_soon_or_delayed';
      cacheDurationMinutes = 15;
    } else if (timeToStartMinutes < -60 && fixture.status === 'NS') { // Match likely over or issue, treat as finished for safety
      statusType = 'finished'; 
      cacheDurationMinutes = 1440;
    } else { // Default to upcoming
      statusType = 'upcoming';
      cacheDurationMinutes = 60;
    }
  }

  console.log(`Match status: ${statusType}, cache duration: ${cacheDurationMinutes} minutes`);

  return { statusType, cacheDurationMinutes };
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fixtureId = parseInt(req.query.fixture_id, 10);
  if (isNaN(fixtureId)) {
    return res.status(400).json({ error: 'Invalid fixture_id' });
  }

  try {
    // Check cache
    const { data: cacheRows, error: cacheErr } = await supabase
      .from('cache_ai_summary')
      .select('summary, fetched_at, match_status_type')
      .eq('fixture_id', fixtureId);
    if (cacheErr) throw cacheErr;

    // Fetch fixture details from fixture_cache to determine match status first
    const { data: fixtureCacheRows, error: fcErr } = await supabase
      .from('fixture_cache')
      .select('fixtures')
      .order('fetched_at', { ascending: false })
      .limit(1);
    if (fcErr || fixtureCacheRows.length === 0) {
      throw fcErr || new Error('No fixture cache available');
    }
    const fixturesArr = fixtureCacheRows[0].fixtures.data || fixtureCacheRows[0].fixtures;
    const fixture = fixturesArr.find(f => f.id === fixtureId);
    if (!fixture) {
      return res.status(404).json({ error: 'Fixture not found in cache. Running API to update cache.' });
    }

    const { statusType, cacheDurationMinutes } = getMatchStatusAndCachePolicy(fixture);

    if (cacheRows.length > 0) {
      const cached = cacheRows[0];
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      // Use dynamic cache duration and check if cached status matches current status
      if (age < 1000 * 60 * cacheDurationMinutes && cached.match_status_type === statusType) {
        return res.status(200).json({ fixture_id: fixtureId, summary: cached.summary, source: 'cache', match_status_type: cached.match_status_type });
      }
    }

    // Build prompt based on match status
    let promptContent = '';
    const teamA = fixture.localteam.name;
    const teamB = fixture.visitorteam.name;
    const matchTime = fixture.starting_at;
    const fixtureNote = fixture.note ? `Current status/note: ${fixture.note}.` : '';

    switch (statusType) {
      case 'live':
        promptContent = `Provide a LIVE match pulse for the cricket game between ${teamA} and ${teamB}. ${fixtureNote} Focus on key events, current momentum, turning points, and standout player performances so far. Do not give the exact score, however you may use the score for general updates.`;
        break;
      case 'finished':
        promptContent = `Generate a post-match analysis for the cricket game between ${teamA} and ${teamB}. ${fixtureNote} Highlight key performances, the final result, and its impact.`;
        break;
      case 'starting_soon_or_delayed':
        promptContent = `The cricket match between ${teamA} and ${teamB} scheduled at ${matchTime} is starting soon or might be delayed. ${fixtureNote} Provide a brief preview focusing on what to expect, key players, playing XI news, toss, and any updates if available.`;
        break;
      case 'upcoming':
      default:
        promptContent = `Generate a brief pre-match summary for the upcoming cricket match between ${teamA} and ${teamB} scheduled at ${matchTime}. Highlight players to watch, any injury news, key match-ups, probable playing XI, probable impact players, pitch report, and any other relevant information.`;
        break;
    }

    const prompt = `${promptContent} Use compelling hooks, concise yet vivid language, and a natural flow that maintains interest. Use varied sentence structures and a conversational tone where appropriate. Provide only the requested output without any additional text, explanations, or formatting notes. Do not include phrases like 'Here is,' 'Sure,' or any other introductory or concluding remarks. Output only the HTML fragment for the summary content (no markdown, no code fences, and absolutely do NOT include <html>, <head>, <body>, or <!DOCTYPE html> tags or any wrapping HTML document structure). Use up to <h4> tags. For styling, apply Tailwind CSS classes: headings use 'text-white font-semibold text-base mb-2', subheadings use 'text-white font-medium text-base mt-4', paragraphs use 'text-white/90 text-sm mt-2', and lists use <ul class="list-disc list-inside ml-4 text-white/90"> with <li class="mb-1"> elements.`;

    // Call Gemini API
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.0
        }
      });
    
      // extract text from the first candidate
      let summary =
        resp.candidates?.[0]?.content?.parts?.[0]?.text
        ?? resp.candidates?.[0]?.output?.content
        ?? "";
      // Remove leading/trailing markdown code fences if present
      summary = summary.replace(/^```html\s*/i, '').replace(/```\s*$/i, '');
      // Remove unwanted HTML document tags if present
      summary = summary.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, ''); // Remove everything up to and including <body>
      summary = summary.replace(/<\/body>[\s\S]*?<\/html>/i, ''); // Remove everything after </body>
      summary = summary.replace(/<\/?html[^>]*>/gi, '');
      summary = summary.replace(/<\/?head[^>]*>[\s\S]*?<\/?head>/gi, '');
      summary = summary.replace(/<\/?body[^>]*>/gi, '');
      summary = summary.replace(/<\/?title[^>]*>[\s\S]*?<\/?title>/gi, '');
      summary = summary.replace(/<meta[^>]*>/gi, '');
      summary = summary.replace(/<link[^>]*>/gi, '');

      // upsert cache
      await supabase
        .from("cache_ai_summary")
        .upsert(
          { fixture_id: fixtureId, summary, fetched_at: new Date().toISOString(), match_status_type: statusType },
          { onConflict: ["fixture_id"] }
        );

      return res.status(200).json({ fixture_id: fixtureId, summary, source: "generated", match_status_type: statusType });
    } catch (err) {
      console.error("Gemini API error:", err);
      return res.status(500).json({ error: err.message });
    }
  } catch (err) {
    console.error("Error in ai-summary:", err);
    return res.status(500).json({ error: err.message });
  }
}
