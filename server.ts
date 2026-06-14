import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

interface NewsItem {
  id: string;
  source: string;
  category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
}

// Simple internal helper to safely fetch with a timeout
async function fetchWithTimeout(url: string, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...((options as any).headers || {})
      }
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Regex RSS Parser
function parseRss(xmlText: string, source: string, category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING'): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xmlText)) !== null) {
    const content = match[1];
    
    // Extract title
    let title = "";
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) {
      title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    }
    
    // Extract link
    let link = "";
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
    if (linkMatch) {
      link = linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    }
    
    // Extract pubDate
    let pubDate = "";
    const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (pubDateMatch) {
      pubDate = pubDateMatch[1].trim();
    }
    
    // Extract description
    let description = "";
    const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
    if (descMatch) {
      description = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
      // strip html tags
      description = description.replace(/<[^>]*>/g, "").trim();
      // decode special HTML entities briefly
      description = description
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'");
    }
    
    if (description.length > 220) {
      description = description.substring(0, 217) + "...";
    }

    // Attempt to extract image
    let thumbnail = "";
    const enclosureMatch = content.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const mediaContentMatch = content.match(/<media:content[^>]+url=["']([^"']+)["']/i);
    const imgInCdataMatch = content.match(/src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg))["']/i);
    
    if (enclosureMatch) {
      thumbnail = enclosureMatch[1];
    } else if (mediaContentMatch) {
      thumbnail = mediaContentMatch[1];
    } else if (imgInCdataMatch) {
      thumbnail = imgInCdataMatch[1];
    } else {
      // Sport placeholder image
      if (category === 'MMA') {
        thumbnail = "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80";
      } else if (category === 'BOXING') {
        thumbnail = "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80";
      } else {
        thumbnail = "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=450&auto=format&fit=crop&q=80";
      }
    }

    // Tidy clean fields
    title = title
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'");

    const id = `${category.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30)}-${Math.random().toString(36).substring(2, 6)}`;

    if (title) {
      items.push({
        id,
        source,
        category,
        title,
        link,
        pubDate,
        description: description || "Read the full action report live on page.",
        thumbnail
      });
    }
    
    if (items.length >= 8) break; // keep response small and fast
  }
  return items;
}

// Endpoint: CORS proxy for client-side fight scrapers (Sherdog and Tapology)
app.get("/api/proxy", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).send("Parameter 'url' is required");
  }

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    if (!response.ok) {
      throw new Error(`Proxy target returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType) {
      res.setHeader("content-type", contentType);
    }
    res.setHeader("Access-Control-Allow-Origin", "*");

    const text = await response.text();
    res.send(text);
  } catch (err: any) {
    console.warn(`Proxy unreachable for URL ${url}`);
    res.status(500).send("CORS Proxy failed to complete the request.");
  }
});

// Endpoint: Fetch Upcoming Combat Sports Events
app.get("/api/events", async (req, res) => {
  const fallbackEvents = [
    {
      id: "curated-ufc-313",
      name: "UFC 313: Adesanya vs Du Plessis",
      sport: "MMA",
      date: "2026-06-20T22:00:00.000Z",
      location: "T-Mobile Arena, Las Vegas, NV",
      mainEvent: "Israel Adesanya vs Dricus Du Plessis",
      promotion: "UFC"
    },
    {
      id: "curated-bjj-world",
      name: "IBJJF BJJ World Championship 2026",
      sport: "BJJ",
      date: "2026-06-24T09:00:00.000Z",
      location: "Walter Pyramid, Long Beach, CA",
      mainEvent: "Grappling World Championship Finals",
      promotion: "IBJJF"
    },
    {
      id: "curated-joshua-wilder",
      name: "Anthony Joshua vs Deontay Wilder",
      sport: "BOXING",
      date: "2026-07-11T20:00:00.000Z",
      location: "Wembley Stadium, London, UK",
      mainEvent: "Anthony Joshua vs Deontay Wilder",
      promotion: "Matchroom Boxing"
    },
    {
      id: "curated-ufc-pretoria",
      name: "UFC Fight Night: Pretoria",
      sport: "MMA",
      date: "2026-07-18T18:00:00.000Z",
      location: "Sun Bet Arena, Pretoria, South Africa",
      mainEvent: "Cameron Saaiman vs TBD",
      promotion: "UFC"
    },
    {
      id: "curated-efc-115",
      name: "EFC 115: Welterweight Championship",
      sport: "MMA",
      date: "2026-07-30T19:00:00.000Z",
      location: "EFC Performance Institute, Johannesburg",
      mainEvent: "Luke Michael vs Mark Hulme",
      promotion: "EFC"
    },
    {
      id: "curated-pfl-london",
      name: "PFL London: Welterweight Semifinals",
      sport: "MMA",
      date: "2026-08-15T19:00:00.000Z",
      location: "O2 Arena, London, UK",
      mainEvent: "PFL Playoffs Semifinals",
      promotion: "PFL"
    },
    {
      id: "curated-canelo-crawford",
      name: "Canelo Alvarez vs Terence Crawford",
      sport: "BOXING",
      date: "2026-09-12T21:00:00.000Z",
      location: "Allegiant Stadium, Las Vegas, NV",
      mainEvent: "Saul 'Canelo' Alvarez vs Terence Crawford",
      promotion: "PBC"
    },
    {
      id: "curated-adcc-2026",
      name: "ADCC Submission Wrestling Championship",
      sport: "BJJ",
      date: "2026-09-25T10:00:00.000Z",
      location: "Thomas & Mack Center, Las Vegas, NV",
      mainEvent: "ADCC Superfight & Bracket Finals",
      promotion: "ADCC"
    }
  ];

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log("FIGHT ZONE CORE: Offline fallback events deployed (No API Key)");
    return res.json(fallbackEvents);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `You are a professional fight schedule analyst. Find up to 10 real-world major upcoming combat sports events (MMA, Boxing, Grappling/BJJ) happening between June 14, 2026 and November 30, 2026.
Search for actual real-world upcoming UFC cards, PFL events, ONE Championship, and major professional Boxing.
Return the results strictly as a JSON array of event objects matching this TypeScript interface (no other chat text, purely the raw JSON block):
interface EventItem {
  id: string; // generate clear unique slug starting with 'live-' e.g. 'live-ufc-313'
  name: string; // name of event e.g. 'UFC 313' or 'Joshua vs Wilder'
  sport: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  date: string; // ISO 8601 Combined timestamp e.g. '2026-06-20T22:00:00.000Z' (must represent a real upcoming date in 2026)
  location: string; // City, Venue
  mainEvent: string; // key fighters/main event of the night
  promotion: string; // UFC, EFC, Matchroom, PBC, ONE, PFL, ADCC, IBJJF
}
Make sure dates are actual future dates relative to June 14, 2026. Keep the response clean and parseable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = response.text || "";
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const parsedJson = jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText;

    const events = JSON.parse(parsedJson.trim());
    if (Array.isArray(events) && events.length > 0) {
      console.log(`FIGHT ZONE CORE: Grounded search retrieved ${events.length} upcoming events successfully.`);
      return res.json(events);
    }
    throw new Error("Parsed content is empty or not an array");
  } catch (err: any) {
    console.warn("FIGHT ZONE CORE: Grounding events search limit handled, deploying offline schedule.");
    res.json(fallbackEvents);
  }
});

// Endpoint: Fetch RSS news
app.get("/api/news", async (req, res) => {
  const feeds = [
    { url: "https://www.mmafighting.com/rss/index.xml", source: "MMA Fighting", category: "MMA" },
    { url: "https://www.sherdog.com/rss/news.xml", source: "Sherdog", category: "MMA" },
    { url: "https://www.badlefthook.com/rss/index.xml", source: "Bad Left Hook", category: "BOXING" },
    { url: "https://www.ringtv.com/feed/", source: "Ring TV", category: "BOXING" },
    { url: "https://www.bjjheroes.com/feed", source: "BJJ Heroes", category: "BJJ" }
  ];

  const results: NewsItem[] = [];

  const fetchPromises = feeds.map(async (feed) => {
    try {
      const response = await fetchWithTimeout(feed.url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const text = await response.text();
      const parsed = parseRss(text, feed.source, feed.category as any);
      results.push(...parsed);
    } catch (err: any) {
      console.warn(`Feed unreachable: ${feed.source}`);
      // We will gracefully skip failing feeds so the app doesn't crash
    }
  });

  await Promise.allSettled(fetchPromises);

  // If we couldn't load any feed, supply live grounding news fallback (or if offline, static mock news)
  if (results.length === 0) {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      try {
        const ai = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        const prompt = `You are a professional combat sports news researcher. Find the top 5 most recent real-world headlines/news about MMA and Boxing for June 14, 2026.
Return them as a JSON array of news articles matching this TypeScript interface (no other chat text, purely the raw JSON block):
interface NewsItem {
  id: string; // unique id starting with 'live-news-'
  source: string; // 'UFC', 'Showtime', 'Matchroom', 'Sky Sports', 'Sherdog', etc.
  category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';
  title: string;
  link: string; // real url or realistic source link
  pubDate: string; // UTC string e.g. 'Sun, 14 Jun 2026 18:00:00 GMT'
  description: string; // brief 1-2 sentence description
  thumbnail: string; // absolute image URL or use beautiful Unsplash placeholders from category
}
Ensure the dates represent June 2026. Keep the response clean and parseable.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });

        const rawText = response.text || "";
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const parsedJson = jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText;

        const liveNews = JSON.parse(parsedJson.trim());
        if (Array.isArray(liveNews) && liveNews.length > 0) {
          console.log(`FIGHT ZONE CORE: Grounded news search retrieved ${liveNews.length} articles successfully.`);
          liveNews.forEach((news: any) => {
            if (!news.thumbnail || !news.thumbnail.startsWith('http')) {
              news.thumbnail = news.category === 'BOXING' 
                ? "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80"
                : "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80";
            }
            results.push(news);
          });
        }
      } catch (gemIniErr: any) {
        console.warn("FIGHT ZONE CORE: News search fallback handled, deploying local headlines.");
      }
    }

    if (results.length === 0) {
      results.push({
        id: "fight-zone-1",
        source: "FIGHT ZONE",
        category: "MMA",
        title: "Cape Town Combat Showcase Promises Hard-Hitting Knockouts Next Month",
        link: "https://example.com/cape-town",
        pubDate: new Date().toUTCString(),
        description: "Local South African prospects gather for the Fight Zone provincial showcase. The main event pits a rising Durban wrestling specialist against an undefeated Cape Town submission wizard.",
        thumbnail: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80"
      }, {
        id: "fight-zone-2",
        source: "FIGHT ZONE",
        category: "BOXING",
        title: "Joburg Super-Middleweight Bout Set for High Stakes at Emperor’s Palace",
        link: "https://example.com/joburg",
        pubDate: new Date().toUTCString(),
        description: "South Africa's top ranking super-middleweights are locked in for an absolute war of attrition at the iconic ring in Johannesburg on the upcoming card.",
        thumbnail: "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80"
      });
    }
  }

  // Sort by date equivalent if possible (fallback simple sort)
  results.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  res.json(results);
});

// Endpoint: AI News Summary using Gemini
app.post("/api/news/summary", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.json({
        summary: "### 🇿🇦 Fight Zone SA Intelligence: Offline Mode\n\nTo power up South African fight wisdom, add your **`GEMINI_API_KEY`** in the AI Studio Secrets panel.\n\nMeanwhile, stay vigilant, check out the live RSS feed cards below, and get ready for pure championship action, bru!",
        newsCount: 0
      });
    }

    const { headlines } = req.body;
    if (!headlines || !Array.isArray(headlines) || headlines.length === 0) {
      return res.status(400).json({ error: "Missing headlines array" });
    }

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `You are "The General", the ultimate, gritty South African combat sports analyst and promoter. Write an high-octane battle report (news summary) based on these headlines. 
Use authentic South African fight culture flavor (sprinkle some local terms like 'lekker', 'bru', 'eish', 'bosveld', 'championship gold', 'pure steel', 'grand slam').
Structure your energy precisely (be brutal, bold, high-contrast like a UFC poster):

# ⚡ FIGHT ZONE DAILY BATTLE BRIEF

## 🥊 MMA & CAGE SHOCKWAVES
[Synthesize the MMA headlines here with brutal focus]

## 👑 BOXING ROUND-BY-ROUND
[Synthesize boxing drama here]

## 🥋 THE GRAPPLING SECRETS
[Synthesize BJJ/BJJHeroes headlines here]

### 🎯 SOUTH AFRICAN WARRIOR FOCUS
[Add a fiery 1-2 sentence motivating shout-out to local fighters grinding in gyms from Cape Town to Joburg]

Keep the entire report under 300 words, formatting with strong markdown grids/bullets. Use the following headlines:
${headlines.slice(0, 15).map((h, idx) => `${idx + 1}. [${h.category}] ${h.title}`).join("\n")}`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({
      summary: result.text || "No summary was generated by the fighter computer.",
      newsCount: headlines.length
    });
  } catch (err: any) {
    console.warn("FIGHT ZONE CORE: Gemini news summary handled in offline mode.");
    res.json({
      summary: `### ⚠️ AI Core Dodged a High Kick!\n\nThe AI MMA analyzer got clipped in the clinch or is rate limited.\n\nPlease try again!`,
      newsCount: 0
    });
  }
});

// Configure Vite and static server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FIGHT ZONE SA server active of port ${PORT}`);
  });
}

startServer();
