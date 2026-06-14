import React, { useEffect, useState } from 'react';
import { db, collection, onSnapshot, doc, deleteDoc } from '../lib/firebase';
import { PinnedEvent, OperationType } from '../types';
import { handleFirestoreError } from '../lib/firestoreError';
import { formatToSAST, getCalendarContext } from '../utils/dateHelper';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Trash2, Trophy, Clock, X, Info } from 'lucide-react';

interface MyCalendarProps {
  user: any;
}

export default function MyCalendar({ user }: MyCalendarProps) {
  const [pinnedEvents, setPinnedEvents] = useState<PinnedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    // Current date in South Africa Standard Time context
    const saContext = getCalendarContext(new Date());
    return new Date(saContext.year, saContext.month, 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    return getCalendarContext(new Date()).day;
  });
  const [selectedEvent, setSelectedEvent] = useState<PinnedEvent | null>(null);

  // Load pinned events in real-time from Firestore
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users', user.uid, 'pinnedEvents'),
      (snapshot) => {
        const list: PinnedEvent[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as PinnedEvent);
        });
        setPinnedEvents(list);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to sync pinned calendar database:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  // Handle unpinning
  const handleUnpin = async (eventId: string) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid, 'pinnedEvents', eventId);
    const path = `users/${user.uid}/pinnedEvents/${eventId}`;
    try {
      if (selectedEvent?.eventId === eventId) {
        setSelectedEvent(null);
      }
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Month navigation helpers
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  // Calendar rendering math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday: 0, Monday: 1...

  // Helper to get events happening on a specific day in SAST
  const getEventsForDay = (dayNum: number): PinnedEvent[] => {
    return pinnedEvents.filter(event => {
      try {
        const evDate = new Date(event.date);
        const saEventContext = getCalendarContext(evDate);
        return saEventContext.year === year && saEventContext.month === month && saEventContext.day === dayNum;
      } catch (e) {
        return false;
      }
    });
  };

  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthsNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  // Selected day events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in" id="personal-calendar-dashboard">
      
      {/* Grid Left: Monthly Grid Calendar (Takes 2 Columns) */}
      <div className="lg:col-span-2 bg-[#141414] border-l-4 border-l-[#C8001A] border-y border-r border-[#1a1a1a] p-6 rounded-none relative">
        <div className="absolute top-0 left-0 w-2 h-[2px] bg-[#F5C400]" />

        {/* Month Selector Header */}
        <div className="flex items-center justify-between mb-6 pl-2" id="calendar-header-actions">
          <div>
            <h2 className="font-impact text-3xl sm:text-4xl text-white italic tracking-tighter uppercase m-0 leading-none">
              {monthsNames[month]} <span className="text-[#F5C400]">{year}</span>
            </h2>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mt-2 font-bold">
              🇿🇦 PERSONALIZED COMBAT SCHEDULE
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black p-1 border-2 border-[#C8001A]">
            <button
              onClick={prevMonth}
              className="p-1 px-3 bg-transparent hover:bg-neutral-900 border-r border-neutral-900 text-gray-400 hover:text-[#F5C400]"
              title="Previous Month"
              id="btn-calendar-prev"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 px-3 bg-transparent hover:bg-neutral-900 text-gray-400 hover:text-[#F5C400]"
              title="Next Month"
              id="btn-calendar-next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading overlay for DB Sync */}
        {loading && (
          <div className="text-center py-10" id="calendar-sync-spinner">
            <div className="w-6 h-6 border-2 border-t-[#C8001A] border-r-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-[10px] font-mono text-gray-500 uppercase">Syncing combat board...</p>
          </div>
        )}

        {/* Calendar Grid rendering */}
        {!loading && (
          <div id="calendar-render-grid">
            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {weekdays.map(d => (
                <div key={d} className="py-2.5 font-mono text-[10px] font-bold text-gray-500 border-b border-gray-900 tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Padding empty block until first day of month */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="py-6 bg-black/10 border border-transparent select-none opacity-25" />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dailyEvents = getEventsForDay(dayNum);
                const isSelected = selectedDay === dayNum;
                
                // Get today context to highlight current SAST day
                const todaySA = getCalendarContext(new Date());
                const isToday = todaySA.year === year && todaySA.month === month && todaySA.day === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    onClick={() => {
                      setSelectedDay(dayNum);
                      setSelectedEvent(null);
                    }}
                    className={`py-4 focus:outline-none relative flex flex-col justify-between items-center border hover:border-gray-600 transition-colors ${
                      isSelected 
                        ? 'border-[#C8001A] bg-red-950/20' 
                        : isToday 
                        ? 'border-[#F5C400] bg-black' 
                        : 'border-transparent bg-black/40 text-gray-300'
                    }`}
                    id={`calendar-day-btn-${dayNum}`}
                  >
                    {/* Day number stamp */}
                    <span className={`text-sm font-mono font-black ${
                      isToday ? 'text-[#F5C400]' : isSelected ? 'text-white' : 'text-gray-300'
                    }`}>
                      {dayNum}
                    </span>

                    {/* Colored indicators of pinned matches */}
                    <div className="flex gap-0.5 justify-center mt-1.5 h-1.5 w-full overflow-hidden">
                      {dailyEvents.slice(0, 3).map((ev, itemIdx) => (
                        <div 
                          key={`${ev.eventId}-${itemIdx}`} 
                          title={`${ev.sport}: ${ev.name}`}
                          className={`w-1.5 h-1.5 rounded-full ${
                            ev.sport === 'MMA' ? 'bg-[#C8001A]' :
                            ev.sport === 'BOXING' ? 'bg-[#F26419]' :
                            ev.sport === 'BJJ' ? 'bg-[#33658A]' : 'bg-[#e0a96d]'
                          }`} 
                        />
                      ))}
                      {dailyEvents.length > 3 && (
                        <div className="w-1 h-1 rounded-full bg-white animate-pulse" title="More events pinned!" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend Panel */}
        <div className="mt-6 border-t border-gray-900 pt-4 flex flex-wrap gap-4 text-[10px] font-mono text-gray-500 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C8001A]" />
            <span>MMA (MIXED MARTIAL ARTS)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#F26419]" />
            <span>BOXING CARD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#33658A]" />
            <span>BJJ / GRAPPLING</span>
          </div>
        </div>
      </div>

      {/* Grid Right: Sidebar Detail Viewer / Actions Dashboard (Takes 1 Column) */}
      <div className="bg-[#141414] border-l-4 border-l-gray-600 border-y border-r border-[#1a1a1a] p-6 rounded-none flex flex-col justify-between shadow-md">
        <div>
          <div className="border-b border-[#1a1a1a] pb-3 mb-4">
            <h3 className="font-impact text-2xl text-white italic tracking-tight uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C8001A]" />
              DAY INSPECTOR
            </h3>
            <p className="text-[10px] font-mono text-gray-400 uppercase mt-1.5 font-bold">
              {selectedDay ? `${selectedDay} ${monthsNames[month]} ${year}` : "Select a matchday to inspect"}
            </p>
          </div>

          {!selectedDay && (
            <div className="text-center py-12 text-gray-500 font-impact italic text-base uppercase tracking-wider" id="day-inspector-no-day">
              Select a date on the calendar matrix to inspect combat scheduling.
            </div>
          )}

          {selectedDay && selectedDayEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500 font-impact italic text-sm uppercase border-2 border-dashed border-neutral-900 px-4" id="day-inspector-empty">
              No battle events pinned on this date. Open the Bouts Table tab to pin some fight action, bru!
            </div>
          )}

          {/* List of Pinned events on selected day */}
          {selectedDay && selectedDayEvents.length > 0 && (
            <div className="space-y-4" id="inspector-day-events-list">
              {selectedDayEvents.map((event) => (
                <div 
                  key={event.eventId}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-3.5 border transition-all cursor-pointer relative rounded-none ${
                    selectedEvent?.eventId === event.eventId 
                      ? 'border-[#F5C400] bg-black shadow-lg' 
                      : 'border-neutral-900 hover:border-[#C8001A] bg-neutral-900/30'
                  }`}
                  id={`inspector-item-${event.eventId}`}
                >
                  <span className={`absolute top-0 right-0 text-[9px] font-impact italic px-2 py-0.5 text-white uppercase ${
                    event.sport === 'MMA' ? 'bg-[#C8001A]' :
                    event.sport === 'BOXING' ? 'bg-[#F26419]' : 'bg-blue-600'
                  }`}>
                    {event.sport}
                  </span>

                  <h4 className="font-impact text-xl text-white italic uppercase leading-none tracking-tight pr-8 mt-1">
                    {event.name}
                  </h4>
                  <p className="text-[10px] font-mono text-[#F5C400] mt-1 uppercase font-bold">
                    {event.promotion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-gray-400 pt-2 border-t border-neutral-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C8001A]" />
                      {formatToSAST(event.date).split('•')[1]?.trim() || 'Evening'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpin(event.eventId);
                      }}
                      className="text-red-500 hover:text-red-400 p-1 font-impact italic uppercase tracking-wider text-xs border border-transparent hover:border-red-950 px-2"
                      title="Unpin event"
                    >
                      UNPIN
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slide-in Expanded Detail Panel */}
          {selectedEvent && (
            <div 
              className="mt-6 p-4 bg-black border-2 border-[#C8001A] space-y-3.5 relative shadow-xl rounded-none"
              id="pinned-event-details-drawer"
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3.5 right-3 text-gray-500 hover:text-white"
                id="btn-close-drawer"
              >
                <X className="w-4 h-4" />
              </button>

              <div id="drawer-main-info">
                <span className="text-[9px] font-impact italic bg-[#C8001A] text-white px-2 py-0.5 uppercase tracking-wider">
                  {selectedEvent.sport} SPEC
                </span>
                <h3 className="font-impact text-2.5xl text-white italic uppercase tracking-tight mt-2.5 mb-1 leading-none">
                  {selectedEvent.name}
                </h3>
                <span className="text-xs font-mono text-[#F5C400] uppercase block font-bold">
                  {selectedEvent.promotion} Show
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-gray-300 font-sans border-t border-neutral-900 pt-3" id="drawer-meta-info">
                <div className="flex gap-2 items-center">
                  <Clock className="w-4 h-4 text-[#C8001A] shrink-0" />
                  <div>
                    <span className="block font-bold">SAST DATE & TIME:</span>
                    <span className="text-[11px] font-mono text-[#F5C400] font-bold">{formatToSAST(selectedEvent.date)}</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <MapPin className="w-4 h-4 text-[#F5C400] shrink-0" />
                  <div>
                    <span className="block font-bold">VENUE LOCATION:</span>
                    <span className="text-[11px] font-mono text-gray-300">{selectedEvent.location || 'TBD Arena'}</span>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="block font-bold">BOUT HEADLINERS:</span>
                    <span className="text-[11px] font-mono text-white font-bold italic">{selectedEvent.mainEvent || 'MMA Main Combats'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleUnpin(selectedEvent.eventId)}
                className="w-full bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white font-impact italic text-sm py-2.5 px-4 mt-4 uppercase tracking-wider flex items-center justify-center gap-1.5 border border-black shadow-[4px_4px_0_#F5C400] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#F5C400] transition-all rounded-none select-none"
                id="btn-drawer-unpin"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                DELETE FROM SOUTH AFRICA CALENDAR
              </button>
            </div>
          )}
        </div>

        {/* Footer info lockup */}
        <div className="mt-8 border-t border-neutral-900 pt-3 text-[9px] font-mono text-gray-500 leading-relaxed uppercase font-bold">
          <Info className="w-3.5 h-3.5 inline mr-1 text-[#F5C400]" />
          Synchronized to live secure cloud storage. Access remains synchronized on mobile login, active and persistent.
        </div>
      </div>

    </div>
  );
}
