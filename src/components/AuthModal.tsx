import React, { useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from '../lib/firebase';
import { Shield, Sparkles, X, Mail, Lock, User, LogIn } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Google Authentication failed. Please check your config.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, {
          displayName: displayName || email.split('@')[0]
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Feel free to use 'Sign Up' if your account is not yet configured!");
      } else {
        setError(err?.message || "Authentication failed. Double check your setup.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="auth-modal-overlay">
      <div 
        className="w-full max-w-md bg-[#141414] border-4 border-[#C8001A] p-6 relative rounded-none shadow-[0_0_40px_rgba(0,0,0,0.95)]"
        id="auth-modal-card"
      >
        {/* Poster accent lines */}
        <div className="absolute top-0 left-0 w-2 h-full bg-[#F5C400]" />
        <div className="absolute top-0 right-0 w-24 h-1 bg-[#C8001A]" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#C8001A] transition-colors"
          aria-label="Close"
          id="btn-close-auth-modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Heading */}
        <div className="space-y-1 mb-6 pl-2" id="auth-modal-header">
          <h2 className="text-3xl font-impact tracking-tight text-white italic uppercase flex items-center gap-2 leading-none">
            <Shield className="w-6 h-6 text-[#C8001A] shrink-0" />
            {isSignUp ? "JOIN THE CAGE" : "ENTER FIGHT ZONE"}
          </h2>
          <p className="text-xs text-[#F5C400] font-mono tracking-widest uppercase font-bold mt-1">
            {isSignUp ? "Create custom fan passport" : "South African Combat Sports HQ"}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-950/95 border-2 border-[#C8001A] text-red-100 text-xs p-3.5 mb-4 font-mono leading-relaxed" id="auth-error-msg">
            <span className="font-extrabold text-[#F5C400]">⚠️ DENIED:</span> {error}
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4 pl-2" id="auth-form">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono font-bold tracking-widest uppercase text-gray-500">DISPLAY NAME</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Bruiser_99"
                  className="w-full bg-[#0D0D0D] border-2 border-neutral-900 text-white pl-10 pr-4 py-2.5 text-sm font-sans focus:outline-none focus:border-[#C8001A] rounded-none uppercase placeholder-neutral-700"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold tracking-widest uppercase text-gray-500">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="slugger@gmail.com"
                className="w-full bg-[#0D0D0D] border-2 border-neutral-900 text-white pl-10 pr-4 py-2.5 text-sm font-sans focus:outline-none focus:border-[#C8001A] rounded-none uppercase placeholder-neutral-700"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono font-bold tracking-widest uppercase text-gray-500">SECRET PASSWORD</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0D0D0D] border-2 border-neutral-900 text-white pl-10 pr-4 py-2.5 text-sm font-sans focus:outline-none focus:border-[#C8001A] rounded-none placeholder-neutral-700"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#C8001A] hover:bg-[#F5C400] hover:text-black text-white font-impact text-xl italic py-3 mt-4 uppercase tracking-wide transition-all flex items-center justify-center gap-2 border border-black shadow-[4px_4px_0_#F5C400] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#F5C400] rounded-none select-none disabled:opacity-50"
            id="auth-submit-btn"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            {loading ? "PROCESSING..." : isSignUp ? "REGISTER ACCOUNT" : "AUTHENTICATE"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 pl-2" id="auth-divider">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-neutral-900"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
            <span className="bg-[#141414] px-3.5 text-gray-500 font-mono">OR JOIN WITH:</span>
          </div>
        </div>

        {/* Social sign in */}
        <div className="space-y-3 pl-2" id="social-auth-action">
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-black hover:bg-[#F5C400] font-impact text-base italic py-2.5 flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 rounded-none border border-black shadow-[4px_4px_0_#C8001A] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#C8001A] select-none"
            id="google-signin-btn"
          >
            <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            GOOGLE CHAMPION ACCESS
          </button>
        </div>

        {/* Toggle Mode Link */}
        <div className="text-center mt-6 text-xs text-gray-500 font-mono" id="auth-mode-toggle">
          {isSignUp ? "Already a citizen of the Fight Zone?" : "Need a custom combat passport?"}{" "}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#F5C400] hover:underline font-bold"
            id="auth-mode-toggle-btn"
          >
            {isSignUp ? "AUTHENTICATE HERE" : "SIGN UP NOW"}
          </button>
        </div>

        <div className="mt-4 border-t border-gray-900 pt-3 text-[10px] text-gray-600 font-mono leading-relaxed text-center">
          <Sparkles className="w-3.5 h-3.5 inline mr-1 text-[#F5C400]" />
          Demo user setup active. Authentication uses native secure sandboxed firebase credentials.
        </div>
      </div>
    </div>
  );
}
