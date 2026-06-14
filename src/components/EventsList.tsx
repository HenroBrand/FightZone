import React, { useEffect, useState } from 'react';
import { EventItem, PinnedEvent } from '../types';
import { curatedEvents } from '../data/curatedEvents';
import { formatToSAST } from '../utils/dateHelper';
import { db, collection, setDoc, doc, deleteDoc, onSnapshot } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreError';
import { OperationType } from '../types';
import { Plus, Pin, Check, Calendar, MapPin, Trophy, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface EventsListProps {
  user: any;
  onOpenAuth: () => void;
  events: EventItem[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export default function EventsList({ 
  user, 
  onOpenAuth, 
  events, 
  loading, 
  error, 
  onRefresh 
}: EventsListProps) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [pinLoading, setPinLoading] = useState<string | null>(null);

  // Load pinned events for authenticated user to show "Pinned" flags
  useEffect(() => {
    if (!user) {
      setPinnedIds([]);
      return;
    }

    const path = `users/${user.uid}/pinnedEvents`;
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
        console.error("Could not load pinned state:", err);
        // Fallback or ignore
      }
    );

    return () => unsub();
  }, [user]);

  // Trigger Pinned Event write to Firestore (with rules check & compliant error handling)
  const togglePin = async (event: EventItem) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const isPinned = pinnedIds.includes(event.id);
    const docRef = doc(db, 'users', user.uid, 'pinnedEvents', event.id);
    const path = `users/${user.uid}/pinnedEvents/${event.id}`;
    
    setPinLoading(event.id);
    try {
      if (isPinned) {
        // Delete pin
        await deleteDoc(docRef);
        console.log(`FIGHT ZONE: Event unpinned: ${event.id}`);
      } else {
        // Write pinned event conforming to rules requirements:
        // schema required: ['eventId', 'name', 'date', 'sport', 'pinnedAt', 'userId']
        const newPin: PinnedEvent = {
          eventId: event.id,
          name: event.name,
          date: event.date,
          sport: event.sport,
          location: event.location || 'TBD Arena',
          mainEvent: event.mainEvent || 'Unannounced Clash',
          promotion: event.promotion || 'FIGHT ZONE',
          pinnedAt: new Date().toISOString(),
          userId: user.uid
        };
        await setDoc(docRef, newPin);
        console.log(`FIGHT ZONE: Event successfully pinned with custom Firestore rules verification.`);
      }
    } catch (err: any) {
      console.error(err);
      // Compliant error catch required by system firebase skill
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setPinLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="events-schedule-container">
      {/* Visual poster decoration */}
      <div className="border-l-4 border-[#C8001A] pl-4 mb-6">
        <h2 className="font-impact text-4xl sm:text-5xl text-[#F5C400] italic tracking-tighter leading-none">
          SOUTH AFRICA FIGHT CALENDAR
        </h2>
        <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-2">
          Synchronize major clashes to your dashboard • Converting to local time zone: SAST (UTC+2)
        </p>
      </div>

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4" id="events-spinner">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#C8001A] animate-spin" />
            <div className="absolute inset-1 border-2 border-gray-950 border-t-[#F5C400] rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
          <p className="font-mono text-xs text-gray-400 uppercase tracking-widest animate-pulse">
            Synchronizing global schedules...
          </p>
        </div>
      )}

      {error && !loading && (
        <div className="text-center py-16 bg-[#141414] border-4 border-[#C8001A] p-8 max-w-lg mx-auto shadow-2xl animate-fade-in" id="events-error-state">
          <ShieldAlert className="w-12 h-12 text-[#C8001A] mx-auto mb-4 animate-bounce" />
          <h3 className="font-impact text-3xl text-white italic uppercase tracking-tighter leading-none mb-3">
            SYNCHRONIZATION ERROR
          </h3>
          <p className="font-mono text-xs text-gray-300 uppercase tracking-wide leading-relaxed mb-6">
            {error}
          </p>
          <button 
            type="button"
            onClick={onRefresh}
            className="bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white font-impact text-base italic px-8 py-3 uppercase tracking-wide transition-all rounded-none border border-black shadow-[3px_3px_0_#F5C400] active:translate-y-0.5 active:shadow-[1px_1px_0_#F5C400]"
          >
            RETRY LIVE SYNC
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 bg-black border-4 border-[#C8001A]" id="events-none">
          <ShieldAlert className="w-8 h-8 text-[#C8001A] mx-auto mb-2" />
          <p className="font-mono text-sm text-gray-400 uppercase">
            No battles loaded. Refresh or adjust filters.
          </p>
        </div>
      )}

      {/* Events Grid layout */}
      {!loading && !error && events.length > 0 && (
        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          id="events-grid"
        >
          {events.map((event, index) => {
            const isPinned = pinnedIds.includes(event.id);
            const sourceLabel = event.id.startsWith('sherdog-') ? 'Sherdog' : 'Tapology';

            return (
              <div 
                key={event.id}
                className="bg-[#141414] border-l-4 border-l-[#C8001A] border-y border-r border-[#1a1a1a] hover:bg-[#1C1C1C] hover:border-l-[#F5C400] transition-colors p-5 flex flex-col justify-between relative group rounded-none shadow-md"
                id={`event-card-${event.id}`}
              >
                {/* Visual poster stamp styling */}
                <div className="absolute top-0 right-0 w-20 h-[3px] bg-[#C8001A] group-hover:bg-[#F5C400] transition-colors" />
                <div className="absolute bottom-0 left-0 w-[3px] h-10 bg-neutral-900" />

                <div>
                  {/* Category Pill and Source Info */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`text-[10px] font-impact italic tracking-wider px-3 py-1 text-white uppercase ${
                      event.sport === 'MMA' ? 'bg-[#C8001A]' :
                      event.sport === 'BOXING' ? 'bg-[#F26419]' :
                      event.sport === 'BJJ' ? 'bg-[#33658A]' :
                      event.sport === 'KICKBOXING' ? 'bg-green-700' : 'bg-purple-700'
                    }`}>
                      {event.sport}
                    </span>

                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                      {event.promotion || 'Global Clash'} • {sourceLabel}
                    </span>
                  </div>

                  {/* Bout Name */}
                  <h3 className="font-impact text-3xl text-white group-hover:text-[#F5C400] transition-colors uppercase italic tracking-tight leading-none mb-3">
                    {event.name}
                  </h3>

                  {/* Main Event information */}
                  <div className="bg-black border-l-2 border-[#F5C400] p-3 mb-4 font-mono text-xs">
                    <span className="text-[#F5C400] font-extrabold block uppercase text-[10px] tracking-widest leading-none mb-1">
                      MAIN CARD CLASH:
                    </span>
                    <span className="text-gray-300 font-sans block font-bold leading-tight">
                      {event.mainEvent}
                    </span>
                  </div>

                  {/* Event Meta: Time & Location */}
                  <div className="space-y-2 text-xs text-gray-400 font-sans mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#C8001A] shrink-0" />
                      <span className="font-bold text-gray-200">
                        {formatToSAST(event.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#F5C400] shrink-0" />
                      <span className="truncate text-gray-300">{event.location || 'Announcing Venue'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions: Pin button */}
                <div className="border-t border-neutral-900 pt-4 mt-2 flex items-center justify-between gap-2">
                  {/* Guest login notification banner inside Card */}
                  {!user && (
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                      ⚡ GUEST MODE
                    </span>
                  )}
                  {user && (
                    <span className="text-[10px] font-mono text-[#F5C400] uppercase font-bold tracking-widest flex items-center gap-1">
                      {isPinned && <Check className="w-3.5 h-3.5 text-green-500" />}
                      {isPinned ? "SAVED ON CALENDAR" : "AVAILABLE"}
                    </span>
                  )}

                  <button
                    onClick={() => togglePin(event)}
                    disabled={pinLoading === event.id}
                    className={`font-impact text-sm italic py-1.5 px-4 uppercase tracking-tight transition-all rounded-none border border-black ${
                      isPinned 
                        ? 'bg-transparent border border-[#C8001A] text-[#C8001A] hover:bg-red-950/20 shadow-[2px_2px_0_rgba(200,0,26,0.3)]'
                        : 'bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white shadow-[3px_3px_0_#F5C400] active:translate-y-0.5 active:shadow-[1px_1px_0_#F5C400]'
                    }`}
                    id={`btn-pin-${event.id}`}
                  >
                    {pinLoading === event.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isPinned ? (
                      <span className="flex items-center gap-1.5 leading-none">
                        <Pin className="w-3 h-3 rotate-45 shrink-0" />
                        UNPIN BOUT
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 leading-none">
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        PIN EVENT
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
