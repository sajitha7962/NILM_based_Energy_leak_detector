import { Activity, Zap, Play, Pause, RotateCcw, Globe, User } from 'lucide-react';
import { DataSourceControls } from '../types/energy';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { Chatbot } from './Chatbot';

interface LayoutProps {
  children: React.ReactNode;
  controls: DataSourceControls | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, controls }) => {
  const { t, i18n } = useTranslation();
  const isSimulating = controls?.isSimulating ?? false;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-brand-text font-sans selection:bg-brand-primary/30 relative">
      {/* Background glow effects for premium feel */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none" />
      
      <header className="glass sticky top-0 z-30 transition-all border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-brand-primary to-brand-accent p-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-white/10">
                <Zap className="h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent tracking-tight drop-shadow-sm">
                  EnergyGuard AI
                </h1>
                <p className="text-xs text-brand-text-muted hidden sm:block font-medium uppercase tracking-widest">
                  {t('nav.dashboard', 'Dashboard')}
                </p>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-4">
              
              {/* Language Selector */}
              <div className="hidden md:flex items-center glass-button px-3 py-1.5 shadow-sm">
                <Globe className="h-4 w-4 text-brand-primary mr-2" />
                <select 
                  className="bg-transparent text-sm font-semibold text-brand-text outline-none cursor-pointer [&>option]:bg-brand-card [&>option]:text-brand-text"
                  value={i18n.language}
                  onChange={handleLanguageChange}
                >
                  <option value="en">English</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="ml">മലയാളം (Malayalam)</option>
                </select>
              </div>

              {/* Playback buttons */}
              <div className="flex items-center glass-button p-1.5 shadow-sm">
                <button
                  onClick={() => controls?.start()}
                  disabled={isSimulating}
                  className={cn("p-2 rounded-lg transition-all", 
                    isSimulating ? "opacity-30 cursor-not-allowed" : "hover:bg-brand-success/20 text-brand-success"
                  )}
                  title="Start Simulation"
                >
                  <Play className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => controls?.pause()}
                  disabled={!isSimulating}
                  className={cn("p-2 rounded-lg transition-all", 
                    !isSimulating ? "opacity-30 cursor-not-allowed" : "hover:bg-brand-warning/20 text-brand-warning"
                  )}
                  title="Pause"
                >
                  <Pause className="h-4 w-4" fill="currentColor" />
                </button>
                <button
                  onClick={() => controls?.reset()}
                  className="p-2 rounded-lg hover:bg-white/10 text-brand-text-muted hover:text-brand-text transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Status pill */}
              <div
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-inner transition-colors",
                  isSimulating
                    ? "bg-brand-success/10 text-brand-success border-brand-success/20 shadow-[inset_0_0_10px_rgba(52,211,153,0.1)]"
                    : "bg-white/5 text-brand-text-muted border-white/10"
                )}
              >
                {isSimulating && <Activity className="h-3 w-3 animate-pulse" />}
                {isSimulating ? 'LIVE' : 'PAUSED'}
              </div>

              {/* Profile */}
              <div className="hidden sm:flex p-2 glass-button cursor-pointer hover:border-brand-primary/30 transition-all">
                <User className="h-5 w-5 text-brand-text" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {children}
      </main>

      <footer className="border-t border-white/5 bg-[#111827]/40 py-6 mt-12 backdrop-blur-md relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-xs text-brand-text-muted font-medium">
          <span>EnergyGuard AI — Premium Edition</span>
          <span>1D CNN NILM Pipeline • ₹8.50/kWh</span>
        </div>
      </footer>
      <Chatbot />
    </div>
  );
};
