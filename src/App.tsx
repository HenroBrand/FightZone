import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import NewsFeed from './components/NewsFeed';
import EventsList from './components/EventsList';
import MyCalendar from './components/MyCalendar';
import SearchFilter from './components/SearchFilter';

import { auth, onAuthStateChanged, db, collection, setDoc, doc, deleteDoc, onSnapshot } from './lib/firebase';
import { handleFirestoreError } from './lib/firestoreError';
import { crawlLiveEvents } from './utils/fightCrawl';
import { fetchAllRssFeeds } from './utils/rssFetcher';
import { NewsItem, EventItem, PinnedEvent, OperationType } from './types';
import { Flame, Trophy, Calendar, Sparkles, Plus, Check } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'events' | 'calendar' | 'search'>('home');
  
  // Shared state to enable live instant search across news and upcoming matches
  const [sharedNews, setSharedNews] = useState<NewsItem[]>([]);
  const [sharedEvents, setSharedEvents] = useState<EventItem[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');

  // Monitor Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch News at root-level once to feed the live interactive search system
  useEffect(() => {
    const fetchRootNews = async () => {
      setNewsLoading(true);
      try {
        const data = await fetchAllRssFeeds();
        setSharedNews(data);
      } catch (err) {
        console.warn("FIGHT ZONE: Root-level news cached fetch bypassed:", err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchRootNews();
  }, []);

  // Synchronize live events feed from Sherdog and Tapology at the root level
  const fetchLiveEventsList = async () => {
    setEventsLoading(true);
    setEventsError('');
    try {
      const data = await crawlLiveEvents();
      setSharedEvents(data);
    } catch (err: any) {
      console.warn("FIGHT ZONE: Events refreshed in offline fallback context.");
      setEventsError(err.message || "Could not load events - deploying offline mode.");
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEventsList();
  }, []);

  // Monitor user pinned events lists in real-time
  useEffect(() => {
    if (!user) {
      setPinnedIds([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'pinnedEvents'),
      (snapshot) => {
        const ids: string[] = [];
        snapshot.forEach((doc) => {
          ids.push(doc.id);
        });
        setPinnedIds(ids);
      },
      (err) => {
        console.error("FIGHT ZONE: Could not refresh global user pin indexes:", err);
      }
    );

    return () => unsub();
  }, [user]);

  // Root Pin Callback For Search View
  const handlePinEvent = async (event: EventItem) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const isPinned = pinnedIds.includes(event.id);
    const docRef = doc(db, 'users', user.uid, 'pinnedEvents', event.id);
    const path = `users/${user.uid}/pinnedEvents/${event.id}`;

    try {
      if (isPinned) {
        await deleteDoc(docRef);
        console.log(`FIGHT ZONE APP: Unpinned from search: ${event.id}`);
      } else {
        const pinPayload: PinnedEvent = {
          eventId: event.id,
          name: event.name,
          date: event.date,
          sport: event.sport,
          location: event.location || 'TBD Stadium',
          mainEvent: event.mainEvent || 'Combat Showcase',
          promotion: event.promotion || 'FIGHT ZONE GLOBAL',
          pinnedAt: new Date().toISOString(),
          userId: user.uid
        };
        await setDoc(docRef, pinPayload);
        console.log(`FIGHT ZONE APP: Saved onto personal calendar dashboard: ${event.id}`);
      }
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D0D0D] cage-bg text-gray-100" id="fight-zone-application-root">
      
      {/* Header element */}
      <Header 
        user={user} 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        onOpenAuth={() => setIsAuthOpen(true)} 
      />

      {/* Main visual Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Auth status loader wrapper */}
        {authLoading ? (
          <div className="py-40 flex flex-col items-center justify-center space-y-4" id="main-auth-loader">
            <div className="w-10 h-10 border-4 border-[#C8001A] border-t-transparent rounded-full animate-spin" />
            <p className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse">
              LOADING FIGHT PASSPORTS...
            </p>
          </div>
        ) : (
          <div id="dynamic-tab-outlet">
            {currentTab === 'home' && (
              <NewsFeed />
            )}

            {currentTab === 'events' && (
              <EventsList 
                events={sharedEvents}
                loading={eventsLoading}
                error={eventsError}
                onRefresh={fetchLiveEventsList}
                user={user} 
                onOpenAuth={() => setIsAuthOpen(true)} 
              />
            )}

            {currentTab === 'calendar' && (
              user ? (
                <MyCalendar user={user} />
              ) : (
                <div className="text-center py-16 bg-[#141414] border-4 border-[#C8001A] p-8 max-w-md mx-auto shadow-2xl rounded-none" id="calendar-login-prompt">
                  <Flame className="w-12 h-12 text-[#F5C400] mx-auto mb-4 animate-pulse" />
                  <h3 className="font-impact text-4xl text-[#F5C400] italic uppercase tracking-tighter leading-none mb-3">LOCKED SCHEDULE</h3>
                  <p className="text-xs text-gray-300 font-sans mb-6 leading-relaxed uppercase">
                    Register a champion pass to accrue pinned matches, lock in custom combat reminders, and track fight maps in South African Standard Time.
                  </p>
                  <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white font-impact text-lg italic px-8 py-2.5 uppercase tracking-wide transition-all rounded-none border border-black shadow-[4px_4px_0_#F5C400] active:translate-x-1 active:translate-y-1 active:shadow-[1px_1px_0_#F5C400] select-none"
                  >
                    AUTHENTICATE SECURELY
                  </button>
                </div>
              )
            )}

            {currentTab === 'search' && (
              <SearchFilter 
                newsList={sharedNews} 
                eventsList={sharedEvents} 
                user={user}
                onOpenAuth={() => setIsAuthOpen(true)}
                onPinEvent={handlePinEvent}
                pinnedIds={pinnedIds}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="bg-black border-t-2 border-[#C8001A] py-8 text-center text-gray-600 text-xs font-mono" id="fight-zone-system-footer">
        <div className="max-w-7xl mx-auto px-4 space-y-3">
          <div className="flex justify-center gap-2 items-center">
            <span className="w-2.5 h-2.5 bg-[#C8001A] skew-x-6 inline-block" />
            <span className="font-bebas text-xl text-white uppercase tracking-wider">FIGHT ZONE SA</span>
            <span className="w-2.5 h-2.5 bg-[#F5C400] -skew-x-6 inline-block" />
          </div>
          <p className="max-w-md mx-auto text-[10px] leading-relaxed uppercase">
            All match times are configured and displayed strictly in South Africa Standard Time (SAST = UTC+2). No affiliation with UFC, EFC, GLORY, or boxing bodies. Pure fan tracking action.
          </p>
          <p className="text-[9px] text-[#C8001A] font-extrabold pb-2">
            🇿🇦 DESIGNED AND CRAFTED FOR THE SOUTH AFRICAN FIGHT CITIZENS 🇿🇦
          </p>
        </div>
      </footer>

      {/* Auth Passport Modal element */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
      />
    </div>
  );
}

