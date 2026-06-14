import React, { useState, useMemo, useEffect } from 'react';
import { NewsItem, EventItem } from '../types';
import { formatToSAST } from '../utils/dateHelper';
import { Search, Compass, RefreshCw, Pin, Check, ExternalLink, Calendar, MapPin, Sparkles } from 'lucide-react';
import { db, collection, onSnapshot } from '../lib/firebase';

interface SearchFilterProps {
  newsList: NewsItem[];
  eventsList: EventItem[];
  user: any;
  onOpenAuth: () => void;
  onPinEvent: (event: EventItem) => void;
  pinnedIds: string[];
}

type SportFilter = 'ALL' | 'MMA' | 'BOXING' | 'BJJ' | 'KICKBOXING' | 'WRESTLING';

export default function SearchFilter({ 
  newsList, 
  eventsList, 
  user, 
  onOpenAuth, 
  onPinEvent,
  pinnedIds
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<SportFilter>('ALL');

  const filterOptions: SportFilter[] = ['ALL', 'MMA', 'BOXING', 'BJJ', 'KICKBOXING', 'WRESTLING'];

  // Filter headlines
  const filteredNews = useMemo(() => {
    return newsList.filter(item => {
      // 1. Filter by category
      if (activeFilter !== 'ALL') {
        if (item.category.toUpperCase() !== activeFilter) return false;
      }
      // 2. Filter by Search keyword
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(query);
        const inDesc = item.description.toLowerCase().includes(query);
        const inSource = item.source.toLowerCase().includes(query);
        return inTitle || inDesc || inSource;
      }
      return true;
    });
  }, [newsList, activeFilter, searchTerm]);

  // Filter schedules
  const filteredEvents = useMemo(() => {
    return eventsList.filter(event => {
      // 1. Filter by category
      if (activeFilter !== 'ALL') {
        if (event.sport.toUpperCase() !== activeFilter) return false;
      }
      // 2. Filter by Search keyword
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const inName = event.name.toLowerCase().includes(query);
        const inFighters = event.mainEvent.toLowerCase().includes(query);
        const inLoc = event.location.toLowerCase().includes(query);
        const inPromo = event.promotion.toLowerCase().includes(query);
        return inName || inFighters || inLoc || inPromo;
      }
      return true;
    });
  }, [eventsList, activeFilter, searchTerm]);

  return (
    <div className="space-y-8 animate-fade-in" id="unified-fight-search-hub">
      
      {/* Search Input Station */}
      <div className="bg-[#141414] border-l-4 border-l-[#C8001A] border-y border-r border-[#1a1a1a] p-6 relative rounded-none shadow-md animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-[3px] bg-[#F5C400]" />
        
        <div className="max-w-2xl" id="search-input-inner">
          <h2 className="font-impact text-3xl sm:text-4xl text-white italic tracking-tighter uppercase mb-1 leading-none">
            COMBAT RADAR
          </h2>
          <p className="text-xs text-gray-400 font-mono mb-4 uppercase font-bold tracking-widest">
            Live filter loaded fight databases and schedule boards instantly
          </p>

          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-gray-500 absolute left-4" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. Dricus, Adesanya, Heavyweight, UFC, Wembley, Rico..."
              className="w-full bg-[#0D0D0D] border-2 border-neutral-900 text-white pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:border-[#C8001A] font-sans font-semibold tracking-wide uppercase placeholder-neutral-700 rounded-none shadow-[2px_2px_0_#C8001A]"
              id="fight-search-input"
            />
          </div>
        </div>

        {/* Filter Pill Badges */}
        <div className="mt-6 border-t border-neutral-900 pt-5 pr-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase block mb-2.5 font-bold tracking-widest">
            DISCIPLINE SELECTORS:
          </span>
          <div className="flex flex-wrap gap-2" id="filter-pill-badges">
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setActiveFilter(opt)}
                className={`font-impact text-lg italic px-4 py-1.5 transition-all outline-none rounded-none tracking-tight leading-none uppercase ${
                  activeFilter === opt
                    ? 'bg-[#C8001A] text-white border-2 border-black shadow-[2px_2px_0_#F5C400]'
                    : 'bg-black text-gray-400 border border-neutral-900 hover:border-gray-500'
                }`}
                id={`filter-pill-${opt.toLowerCase()}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cross-Search Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="search-cross-results">
        
        {/* Results Column 1: Filtered Upcoming Matches */}
        <div className="space-y-4" id="results-events-section">
          <div className="border-b-4 border-[#C8001A] pb-2.5 flex justify-between items-end">
            <h3 className="font-impact text-2xl text-white italic tracking-tight uppercase leading-none">
              MATCHED FIGHT CARDS ({filteredEvents.length})
            </h3>
            <span className="text-[10px] font-mono text-[#F5C400] font-bold">SAST Context</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 bg-[#121212]/30 border border-dashed border-gray-900 text-gray-500 font-mono text-xs uppercase rounded-none">
              No matching schedules found. Try refining your fighter search term.
            </div>
          ) : (
            <div className="space-y-3" id="search-matched-events-list">
              {filteredEvents.map((event) => {
                const isPinned = pinnedIds.includes(event.id);
                return (
                  <div 
                    key={event.id}
                    className="bg-[#141414] border-l-4 border-[#C8001A] border-y border-r border-[#1a1a1a] p-4 relative group rounded-none shadow-md"
                    id={`search-match-event-${event.id}`}
                  >
                    <span className="absolute top-1 right-1 text-[8px] font-mono bg-black text-gray-400 px-1.5 py-0.5 border border-neutral-900 uppercase shrink-0 font-bold">
                      {event.sport}
                    </span>

                    <h4 className="font-impact text-2xl text-white italic uppercase mt-1.5 leading-none tracking-tight pr-14 group-hover:text-[#F5C400] transition-colors">
                      {event.name}
                    </h4>
                    <p className="text-[10px] font-mono text-[#F5C400] mt-1.5 uppercase font-bold">
                      {event.promotion} • <span className="text-gray-300 font-sans italic font-normal">{event.mainEvent}</span>
                    </p>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-neutral-900 text-[10px] font-mono text-gray-400 font-bold">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C8001A]" />
                          <span className="text-gray-200">{formatToSAST(event.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#F5C400]" />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onPinEvent(event)}
                        className={`font-impact text-xs italic py-1.5 px-3 uppercase tracking-wide transition-all rounded-none border border-black shrink-0 ${
                          isPinned 
                            ? 'bg-transparent border border-[#C8001A] text-[#C8001A] hover:bg-neutral-950/20'
                            : 'bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white shadow-[2px_2px_0_#F5C400] active:translate-y-0.5'
                        }`}
                        id={`search-pin-btn-${event.id}`}
                      >
                        {isPinned ? "SAVED" : "PIN EVENT"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Column 2: Filtered News */}
        <div className="space-y-4" id="results-news-section">
          <div className="border-b-4 border-[#C8001A] pb-2.5">
            <h3 className="font-impact text-2xl text-white italic tracking-tight uppercase leading-none">
              MATCHED FIGHT REPORTS ({filteredNews.length})
            </h3>
          </div>

          {filteredNews.length === 0 ? (
            <div className="text-center py-10 bg-[#121212]/30 border border-dashed border-gray-900 text-gray-500 font-mono text-xs uppercase rounded-none">
              No matching fight articles found. Keep looking, bru.
            </div>
          ) : (
            <div className="space-y-3" id="search-matched-news-list">
              {filteredNews.map((item) => (
                <div 
                  key={item.id}
                  className="bg-[#141414] border-l-4 border-l-[#C8001A] border-y border-r border-[#1a1a1a] p-4 flex gap-4 items-start shadow-md rounded-none hover:border-r-[#F5C400] transition-all"
                  id={`search-match-news-${item.id}`}
                >
                  <img 
                    src={item.thumbnail} 
                    alt={item.title} 
                    className="w-16 h-16 object-cover border-2 border-neutral-900 shrink-0"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallbacks: Record<string, string> = {
                        MMA: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=120&auto=format&fit=crop&q=80",
                        BOXING: "https://images.unsplash.com/photo-1509563268479-0f004cf3f58b?w=120&auto=format&fit=crop&q=80",
                        BJJ: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=120&auto=format&fit=crop&q=80",
                        KICKBOXING: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=120&auto=format&fit=crop&q=80",
                        WRESTLING: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=120&auto=format&fit=crop&q=80"
                      };
                      e.currentTarget.src = fallbacks[item.category] || "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=120&auto=format&fit=crop&q=80";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[8px] font-mono mb-1.5 font-bold">
                      <span className="text-[#C8001A] uppercase">{item.category}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 uppercase">{item.source}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400 uppercase">{formatToSAST(item.pubDate).split('•')[0]?.trim()}</span>
                    </div>

                    <h4 className="font-sans font-bold text-sm text-white leading-snug hover:text-[#F5C400] transition-colors">
                      <a href={item.link} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h4>
                    
                    <p className="text-xs text-gray-200 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-right mt-2">
                      <a 
                        href={item.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-impact italic text-[#C8001A] hover:text-[#F5C400] uppercase inline-flex items-center gap-1 transition-colors"
                      >
                        LAUNCH REPORT
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
