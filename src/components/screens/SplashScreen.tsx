import { useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface Props { onComplete: () => void; }

export default function SplashScreen({ onComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 px-6">
      <div className="flex flex-col items-center gap-6 mb-12 animate-fadeIn">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl">
          <MapPin className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight mb-2">Opusly</h1>
          <p className="text-white/70 text-lg">Find your perfect workspace</p>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full max-w-xs py-4 bg-white text-indigo-600 font-semibold text-base rounded-2xl shadow-lg hover:bg-white/95 active:scale-95 transition-all"
      >
        Get Started
      </button>

      <p className="text-white/40 text-xs mt-8">v1.0 beta</p>
    </div>
  );
}
