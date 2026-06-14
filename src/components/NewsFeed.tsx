import React, { useEffect, useState } from 'react';
import { NewsItem, AISummaryResponse } from '../types';
import { RefreshCw, Sparkles, AlertCircle, ExternalLink, Calendar, Flame } from 'lucide-react';
import { formatToSAST } from '../utils/dateHelper';

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Fetch News from server endpoint
  const fetchNews = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/news');
      if (!response.ok) {
        throw new Error(`Failed to load combat news feed. Status: ${response.status}`);
      }
      const data: NewsItem[] = await response.json();
      setNews(data);
    } catch (err: any) {
      console.error(err);
      setError('Could not load latest fight news. Check your server connection, bru!');
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Fight Analysis / Summary using Gemini
  const generateAISummary = async () => {
    if (news.length === 0) return;
    setAiLoading(true);
    setAiError('');
    setAiSummary(null);

    try {
      const headlines = news.map(item => ({
        title: item.title,
        category: item.category
      }));

      const res = await fetch('/api/news/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ headlines })
      });

      if (!res.ok) {
        throw new Error('AI promoter analyzer returned an active error.');
      }

      const data: AISummaryResponse = await res.json();
      setAiSummary(data);
    } catch (err: any) {
      console.error(err);
      setAiError('The AI fight promoter is down in the round! Try tapping back in a sec.');
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-refresh news every 10 minutes
  useEffect(() => {
    fetchNews();

    const intervalId = setInterval(() => {
      console.log("FIGHT ZONE: Auto-refreshing fight news RSS feeds...");
      fetchNews();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in" id="combat-news-feed">
      {/* AI Combat Hub Headline Board */}
      <section 
        className="bg-[#0D0D0D] border-4 border-[#C8001A] relative p-6 shadow-2xl rounded-none"
        id="ai-intelligence-deck"
      >
        <div className="absolute top-0 right-0 w-32 h-1 bg-[#F5C400]" />
        <div className="absolute top-0 left-0 w-1 h-full bg-[#F5C400]" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] sm:text-xs font-mono text-[#F5C400] bg-black px-2 py-1 tracking-widest font-extrabold uppercase border border-[#F5C400] inline-block mb-3">
              ⚡ LIVE SA FIGHT ZONE ANALYSIS
            </span>
            <h2 className="text-4xl sm:text-5xl font-impact font-black italic text-white uppercase tracking-tighter m-0 leading-none">
              THE GENERAL'S <span className="text-[#F5C400]">BATTLE SUMMARY</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-2">
              Combat headlines scanned and synthesized with raw South African fight perspectives.
            </p>
          </div>

          <button
            onClick={generateAISummary}
            disabled={aiLoading || news.length === 0}
            className="self-start sm:self-center bg-[#C8001A] text-white hover:bg-[#F5C400] hover:text-black font-impact text-lg italic px-6 py-2.5 transition-all outline-none border-2 border-black uppercase flex items-center gap-2 shadow-[4px_4px_0_#F5C400] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#F5C400] disabled:opacity-50 select-none"
            id="btn-generate-ai-brief"
          >
            <Sparkles className="w-5 h-5 fill-current animate-pulse text-white hover:text-black" />
            {aiLoading ? "ANALYZING..." : "COMPILE REPORT"}
          </button>
        </div>

        {/* AI response panel */}
        {aiLoading && (
          <div className="bg-black/40 border border-gray-800 p-6 flex flex-col items-center justify-center space-y-3" id="ai-loading">
            <RefreshCw className="w-8 h-8 text-[#F5C400] animate-spin" />
            <p className="font-mono text-xs text-[#F5C400] animate-pulse uppercase tracking-wider">
              Compiling headlines, checking gloves, translation to South African slag...
            </p>
          </div>
        )}

        {aiError && (
          <div className="bg-red-950/80 border border-[#C8001A] p-4 text-xs font-mono text-red-100 uppercase" id="ai-error">
            <AlertCircle className="w-4 h-4 inline mr-2 text-[#F5C400]" />
            {aiError}
          </div>
        )}

        {aiSummary && !aiLoading && (
          <div 
            className="bg-black border border-[#F5C400] p-5 font-sans leading-relaxed text-sm text-gray-200 shadow-inner rounded-none"
            id="ai-results"
          >
            <div className="prose prose-invert prose-red max-w-none text-xs sm:text-sm whitespace-pre-wrap font-sans">
              {aiSummary.summary}
            </div>
            <div className="border-t border-gray-800 mt-4 pt-3 flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>Source Volume: {aiSummary.newsCount} articles parsed</span>
              <span className="text-[#F5C400]">Model: Gemini-3.5-Flash</span>
            </div>
          </div>
        )}

        {!aiSummary && !aiLoading && (
          <div className="bg-black/60 border border-gray-900 p-5 text-center" id="ai-empty">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Ready to process. Press the button above to receive "The General's" high-octane battle report.
            </p>
          </div>
        )}
      </section>

      {/* Main News Stream */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-4 border-[#C8001A] pb-3 mb-6 gap-2">
          <h3 className="font-impact text-3xl sm:text-4xl text-white italic tracking-tighter uppercase flex items-center gap-2">
            <Flame className="w-6 h-6 text-[#C8001A]" />
            LATEST STRIKES <span className="text-[#F5C400]">(LIVE RSS)</span>
          </h3>
          <button
            onClick={fetchNews}
            disabled={loading}
            className="text-xs font-impact italic tracking-wider text-[#F5C400] hover:text-white uppercase flex items-center gap-1.5 bg-[#0D0D0D] border-2 border-[#C8001A] px-4 py-2 disabled:opacity-50 select-none active:translate-y-0.5"
            id="btn-manual-news-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH FEEDS
          </button>
        </div>

        {loading && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4" id="news-spinner">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-b-4 border-transparent border-t-[#C8001A] border-r-[#C8001A] animate-spin" />
              <div className="absolute inset-1.5 rounded-full border-4 border-gray-950 border-t-[#F5C400] animate-spin" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest animate-pulse">
              FETCHING MMA, BOXING, AND BJJ SATELLITE FEEDS...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-black border-4 border-[#C8001A] p-5 text-center text-sm font-mono text-red-100 uppercase" id="news-error">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#C8001A]" />
            {error}
          </div>
        )}

        {!loading && !error && news.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-impact italic uppercase text-lg tracking-wider" id="news-empty">
            No live fight reports currently loaded. Press refresh, bru.
          </div>
        )}

        {/* News Grid Layout */}
        {!loading && !error && news.length > 0 && (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            id="news-cards-grid"
          >
            {news.map((item, index) => (
              <article 
                key={item.id}
                className="bg-[#141414] border-l-4 border-l-[#C8001A] border-y border-r border-neutral-900 flex flex-col hover:bg-[#1C1C1C] hover:border-l-[#F5C400] transition-colors relative group rounded-none"
                id={`news-card-${index}`}
              >
                {/* Category stamp */}
                <div className="absolute top-3 left-3 z-10">
                  <span className={`text-[10px] font-impact italic px-3 py-1 tracking-wider uppercase shadow-md block ${
                    item.category === 'MMA' ? 'bg-[#C8001A] text-white' :
                    item.category === 'BOXING' ? 'bg-[#F26419] text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {item.category}
                  </span>
                </div>

                {/* Source stamp */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-[9px] font-mono bg-black text-gray-300 px-2.5 py-0.5 uppercase tracking-widest border border-gray-800 block font-bold">
                    {item.source}
                  </span>
                </div>

                {/* Thumbnail */}
                <div className="w-full h-44 overflow-hidden relative border-b-2 border-neutral-900 bg-black">
                  <img 
                    src={item.thumbnail} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallbacks: Record<string, string> = {
                        MMA: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&auto=format&fit=crop&q=80",
                        BOXING: "https://images.unsplash.com/photo-1509563268479-0f004cf3f58b?w=500&auto=format&fit=crop&q=80",
                        BJJ: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=500&auto=format&fit=crop&q=80",
                        KICKBOXING: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop&q=80",
                        WRESTLING: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop&q=80"
                      };
                      e.currentTarget.src = fallbacks[item.category] || "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&auto=format&fit=crop&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    {/* Date SAST */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5C400] mb-2.5 font-bold">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatToSAST(item.pubDate)}</span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-xl font-impact font-black italic text-white uppercase tracking-tight leading-tight group-hover:text-[#F5C400] transition-colors mb-2.5">
                      {item.title}
                    </h4>

                    {/* Excerpt */}
                    <p className="text-sm text-gray-200 font-sans leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Outbound Link */}
                  <div className="border-t border-neutral-900 pt-3 flex justify-between items-center">
                    <span className="text-[9px] text-gray-500 font-mono font-bold">SOUTH AFRICA HQ</span>
                    <a 
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-impact italic text-[#F5C400] hover:text-white border border-[#F5C400] hover:bg-[#F5C400] hover:text-black py-1 px-3 uppercase tracking-wider transition-colors inline-flex items-center gap-1 leading-none"
                      id={`news-link-${item.id}`}
                    >
                      READ STORY
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
