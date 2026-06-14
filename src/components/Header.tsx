import React from 'react';
import { User, LogIn, LogOut, Flame, Sparkle } from 'lucide-react';
import { auth, signOut } from '../lib/firebase';

interface HeaderProps {
  user: any;
  currentTab: 'home' | 'events' | 'calendar' | 'search';
  onTabChange: (tab: 'home' | 'events' | 'calendar' | 'search') => void;
  onOpenAuth: () => void;
}

export default function Header({ user, currentTab, onTabChange, onOpenAuth }: HeaderProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-black/95 border-b-2 border-[#C8001A] shadow-[0_4px_12px_rgba(0,0,0,0.8)] backdrop-blur-md">
      {/* Top Banner Alert (South Africa Combat Vibe) */}
      <div className="bg-[#C8001A] text-white text-[10px] sm:text-xs font-mono py-1 px-4 text-center tracking-widest font-extrabold uppercase flex justify-center items-center gap-2">
        <Flame className="w-3.5 h-3.5 animate-pulse text-[#F5C400]" />
        South African Combat Sports Tracker • SAST (UTC+2) Time Zone Active • 🇿🇦
        <Flame className="w-3.5 h-3.5 animate-pulse text-[#F5C400]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#C8001A] flex items-center justify-center font-impact font-black text-2xl rotate-3 border-2 border-[#F5C400] text-white shadow-xl select-none">
            FZ
          </div>
          <div>
            <h1 className="font-impact text-3xl sm:text-4xl text-[#F5C400] italic tracking-tighter uppercase m-0 p-0 leading-none">
              FIGHT ZONE <span className="text-white">SA</span>
            </h1>
            <span className="text-[10px] font-mono text-gray-400 tracking-wider uppercase block mt-1">
              THE SOUTH AFRICAN COMBAT HQ • UPDATING LIVE
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-[#090909] p-1 border-2 border-[#C8001A] rounded-none w-full md:w-auto overflow-x-auto justify-center">
          <button
            onClick={() => onTabChange('home')}
            className={`font-impact text-base italic tracking-tight px-4 py-1.5 uppercase transition-all rounded-none ${
              currentTab === 'home'
                ? 'bg-[#C8001A] text-white border-b-2 border-[#F5C400]'
                : 'text-gray-300 hover:text-[#F5C400] hover:bg-white/5'
            }`}
            id="tab-home"
          >
            Home / News
          </button>
          
          <button
            onClick={() => onTabChange('events')}
            className={`font-impact text-base italic tracking-tight px-4 py-1.5 uppercase transition-all rounded-none ${
              currentTab === 'events'
                ? 'bg-[#C8001A] text-white border-b-2 border-[#F5C400]'
                : 'text-gray-300 hover:text-[#F5C400] hover:bg-white/5'
            }`}
            id="tab-events"
          >
            Bouts Table
          </button>

          {user && (
            <button
              onClick={() => onTabChange('calendar')}
              className={`font-impact text-base italic tracking-tight px-4 py-1.5 uppercase transition-all rounded-none ${
                currentTab === 'calendar'
                  ? 'bg-[#C8001A] text-white border-b-2 border-[#F5C400]'
                  : 'text-gray-300 hover:text-[#F5C400] hover:bg-white/5'
              }`}
              id="tab-calendar"
            >
              My Calendar
            </button>
          )}

          <button
            onClick={() => onTabChange('search')}
            className={`font-impact text-base italic tracking-tight px-4 py-1.5 uppercase transition-all rounded-none ${
              currentTab === 'search'
                ? 'bg-[#C8001A] text-white border-b-2 border-[#F5C400]'
                : 'text-gray-300 hover:text-[#F5C400] hover:bg-white/5'
            }`}
            id="tab-search"
          >
            Search
          </button>
        </nav>

        {/* User Account Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 bg-[#121212] border border-gray-800 p-2 pl-3" id="user-profile-widget">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-mono font-bold text-[#F5C400] uppercase block">
                  {user.displayName || "Fan Warrior"}
                </span>
                <span className="text-[9px] text-gray-400 font-mono block">
                  {user.email}
                </span>
              </div>
              
              {/* Avatar placeholder with UFC fighter frame */}
              <div className="relative w-9 h-9 border-2 border-[#C8001A] rounded-none overflow-hidden bg-black flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#F5C400] rounded-none ring-2 ring-black" />
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-1 px-2.5 text-gray-400 hover:text-[#C8001A] hover:bg-red-950/20 transition-all font-mono text-xs uppercase font-extrabold flex items-center gap-1.5"
                title="Sign Out of Fight Zone"
                id="btn-signout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">EXIT</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="bg-transparent border-2 border-[#C8001A] text-[#F5C400] hover:bg-[#F5C400] hover:text-black hover:border-black font-impact text-lg italic px-5 py-1.5 transition-all flex items-center gap-2 uppercase tracking-tight shadow-[3px_3px_0_#C8001A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#C8001A] rounded-none select-none"
              id="btn-signin-trigger"
            >
              <LogIn className="w-4.5 h-4.5 shrink-0" />
              CHAMPION SIGN IN
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
