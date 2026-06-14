import { NewsItem } from '../types';

export const FEEDS_CONFIG = [
  { url: "https://www.mmafighting.com/rss/index.xml", source: "MMA Fighting", category: "MMA" as const },
  { url: "https://www.sherdog.com/rss/news.xml", source: "Sherdog", category: "MMA" as const },
  { url: "https://www.badlefthook.com/rss/index.xml", source: "Bad Left Hook", category: "BOXING" as const },
  { url: "https://www.ringtv.com/feed/", source: "Ring TV", category: "BOXING" as const },
  { url: "https://www.bjjheroes.com/feed", source: "BJJ Heroes", category: "BJJ" as const }
];

/**
 * Robustly fetches RSS feed using proxy URLs with fallbacks.
 * 1. Primary: https://api.allorigins.win/get?url=
 * 2. Fallback 1: https://corsproxy.io/?
 * 3. Fallback 2: https://api.codetabs.com/v1/proxy?url=
 * 4. Fallback 3: https://thingproxy.freeboard.io/fetch/
 */
export async function fetchWithProxies(targetUrl: string): Promise<string> {
  const triedErrors: string[] = [];

  // 1. Try api.allorigins.win
  try {
    const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(allOriginsUrl);
    if (response.ok) {
      const json = await response.json();
      if (json && typeof json.contents === 'string') {
        const contents = json.contents.trim();
        if (contents.length > 100) {
          return contents;
        }
        throw new Error("AllOrigins returned too short or non-RSS contents.");
      }
    }
    throw new Error(`AllOrigins status: ${response.status}`);
  } catch (err: any) {
    console.warn(`AllOrigins proxy failed for ${targetUrl}:`, err.message || err);
    triedErrors.push(`AllOrigins: ${err.message || err}`);
  }

  // 2. Try corsproxy.io
  try {
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    const response = await fetch(corsProxyUrl);
    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed.length > 100) {
        return trimmed;
      }
      throw new Error("CorsProxy returned too short or invalid text.");
    }
    throw new Error(`CorsProxy status: ${response.status}`);
  } catch (err: any) {
    console.warn(`CorsProxy failed for ${targetUrl}:`, err.message || err);
    triedErrors.push(`CorsProxy: ${err.message || err}`);
  }

  // 3. Try api.codetabs.com
  try {
    const codetabsUrl = `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(targetUrl)}`;
    const response = await fetch(codetabsUrl);
    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed.length > 100) {
        return trimmed;
      }
      throw new Error("Codetabs returned too short or invalid text.");
    }
    throw new Error(`Codetabs status: ${response.status}`);
  } catch (err: any) {
    console.warn(`Codetabs failed for ${targetUrl}:`, err.message || err);
    triedErrors.push(`Codetabs: ${err.message || err}`);
  }

  // 4. Try thingproxy.freeboard.io
  try {
    const thingproxyUrl = `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(targetUrl)}`;
    const response = await fetch(thingproxyUrl);
    if (response.ok) {
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed.length > 100) {
        return trimmed;
      }
      throw new Error("Thingproxy returned too short or invalid text.");
    }
    throw new Error(`Thingproxy status: ${response.status}`);
  } catch (err: any) {
    console.warn(`Thingproxy failed for ${targetUrl}:`, err.message || err);
    triedErrors.push(`Thingproxy: ${err.message || err}`);
  }

  throw new Error(`CORS proxies exhausted: [${triedErrors.join(" | ")}]`);
}

/**
 * Parses RSS XML into structured NewsItem objects.
 */
export function parseRssXml(xmlText: string, source: string, category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING'): NewsItem[] {
  const items: NewsItem[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parse errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      console.warn(`DOMParser warning: parsing XML from ${source} had issues, trying regex fallback.`);
      return parseRssRegex(xmlText, source, category);
    }

    const feedItems = xmlDoc.querySelectorAll('item');
    for (let i = 0; i < feedItems.length; i++) {
      if (items.length >= 8) break; // Keep payload small

      const item = feedItems[i];
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || new Date().toUTCString();
      const desc = item.querySelector('description')?.textContent || '';
      
      let cleanDescription = desc
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .trim();

      if (cleanDescription.length > 220) {
        cleanDescription = cleanDescription.substring(0, 217) + '...';
      }

      // Find image from enclosure, media content, or HTML src
      let thumbnail = '';
      const enclosure = item.querySelector('enclosure');
      const mediaContent = item.getElementsByTagName('media:content')[0] || item.querySelector('content');
      const imgMatch = desc.match(/src=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg))["']/i);

      if (enclosure?.getAttribute('url')) {
        thumbnail = enclosure.getAttribute('url') || '';
      } else if (mediaContent?.getAttribute('url')) {
        thumbnail = mediaContent.getAttribute('url') || '';
      } else if (imgMatch) {
        thumbnail = imgMatch[1];
      }

      if (!thumbnail) {
        if (category === 'MMA') {
          thumbnail = "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80";
        } else if (category === 'BOXING') {
          thumbnail = "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80";
        } else {
          thumbnail = "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=450&auto=format&fit=crop&q=80";
        }
      }

      const id = `${category.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}-${Math.random().toString(36).substring(2, 6)}`;

      if (title) {
        items.push({
          id,
          source,
          category,
          title,
          link,
          pubDate,
          description: cleanDescription || "Read the full combat report live on official page.",
          thumbnail
        });
      }
    }
  } catch (err) {
    console.warn(`DOMParser failed for ${source}, running regex parser fallback...`, err);
    return parseRssRegex(xmlText, source, category);
  }
  return items;
}

/**
 * Fallback regex builder to parsed items in case XML document cannot be parsed in browser DOM.
 */
function parseRssRegex(xmlText: string, source: string, category: 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING'): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let count = 0;
  while ((match = itemRegex.exec(xmlText)) !== null && count < 8) {
    const content = match[1];
    
    let title = "";
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) {
      title = titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    }
    
    let link = "";
    const linkMatch = content.match(/<link>([\s\S]*?)<\/link>/);
    if (linkMatch) {
      link = linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    }
    
    let pubDate = "";
    const pubDateMatch = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (pubDateMatch) {
      pubDate = pubDateMatch[1].trim();
    }
    
    let description = "";
    const descMatch = content.match(/<description>([\s\S]*?)<\/description>/);
    if (descMatch) {
      description = descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
      description = description.replace(/<[^>]*>/g, "").trim();
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
      if (category === 'MMA') {
        thumbnail = "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80";
      } else if (category === 'BOXING') {
        thumbnail = "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80";
      } else {
        thumbnail = "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=450&auto=format&fit=crop&q=80";
      }
    }

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
        pubDate: pubDate || new Date().toUTCString(),
        description: description || "Read the full action report live on page.",
        thumbnail
      });
      count++;
    }
  }
  return items;
}

/**
 * Orchestrates client-side loading of all RSS feeds using proxies with dual-fallback logic.
 */
export async function fetchAllRssFeeds(): Promise<NewsItem[]> {
  const results: NewsItem[] = [];
  const errors: string[] = [];

  const promises = FEEDS_CONFIG.map(async (feed) => {
    try {
      const xmlText = await fetchWithProxies(feed.url);
      const parsedItems = parseRssXml(xmlText, feed.source, feed.category);
      results.push(...parsedItems);
    } catch (err: any) {
      console.warn(`Client failed to retrieve RSS feed for ${feed.source}:`, err);
      errors.push(feed.source);
    }
  });

  await Promise.allSettled(promises);

  // If ALL feeds failed to load, throw a unified exception so user interface can display Retry option.
  if (results.length === 0 && errors.length === FEEDS_CONFIG.length) {
    throw new Error("All proxy servers failed to retrieve any fight news feeds.");
  }

  // Supply mock fallbacks only if completely empty AND no proxy error triggered
  if (results.length === 0) {
    results.push({
      id: "fight-zone-fallback-1",
      source: "FIGHT ZONE",
      category: "MMA",
      title: "Cape Town Combat Showcase Promises Hard-Hitting Knockouts Next Month",
      link: "https://example.com/cape-town",
      pubDate: new Date().toUTCString(),
      description: "Local South African prospects gather for the Fight Zone provincial showcase. The main event pits a rising Durban wrestling specialist against an undefeated Cape Town submission wizard.",
      thumbnail: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=450&auto=format&fit=crop&q=80"
    }, {
      id: "fight-zone-fallback-2",
      source: "FIGHT ZONE",
      category: "BOXING",
      title: "Joburg Super-Middleweight Bout Set for High Stakes at Emperor’s Palace",
      link: "https://example.com/joburg",
      pubDate: new Date().toUTCString(),
      description: "South Africa's top ranking super-middleweights are locked in for an absolute war of attrition at the iconic ring in Johannesburg on the upcoming card.",
      thumbnail: "https://images.unsplash.com/photo-1583473848882-f9a5bb7fd2ee?w=450&auto=format&fit=crop&q=80"
    });
  }

  // Sort chronologically
  results.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  return results;
}
