// Layout component — receives controls as a prop from App
import { Activity, Zap, Server, Play, Pause, RotateCcw } from 'lucide-react';
import { DataSourceControls } from '../types/energy';

interface LayoutProps {
  children: React.ReactNode;
  controls: DataSourceControls | null;
}

export const Layout: React.FC<LayoutProps> = ({ children, controls }) => {
  const isSimulating = controls?.isSimulating ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">EnergyGuard</h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  See the waste. Find the cause. Save the money.
                </p>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-4">
              {/* Data source badge */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                  Data Source
                </span>
                <span className="flex items-center text-sm font-medium text-slate-700">
                  <Server className="h-3.5 w-3.5 mr-1 text-blue-500" />
                  UK-DALE House 1
                </span>
              </div>

              {/* Playback buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => controls?.start()}
                  disabled={isSimulating}
                  className={`p-2 rounded-md transition-colors ${
                    isSimulating
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white hover:shadow-sm text-green-600'
                  }`}
                  title="Start Simulation"
                >
                  <Play className="h-4 w-4" />
                </button>
                <button
                  onClick={() => controls?.pause()}
                  disabled={!isSimulating}
                  className={`p-2 rounded-md transition-colors ${
                    !isSimulating
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-white hover:shadow-sm text-amber-500'
                  }`}
                  title="Pause"
                >
                  <Pause className="h-4 w-4" />
                </button>
                <button
                  onClick={() => controls?.reset()}
                  className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-600 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Status pill */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  isSimulating
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isSimulating && <Activity className="h-3 w-3 animate-pulse" />}
                {isSimulating ? 'LIVE' : 'PAUSED'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center text-xs text-slate-400">
          <span>EnergyGuard v1.0 — Phase 1 Prototype</span>
          <span>Ground-Truth NILM Replay Engine • ₹8.50/kWh</span>
        </div>
      </footer>
    </div>
  );
};
