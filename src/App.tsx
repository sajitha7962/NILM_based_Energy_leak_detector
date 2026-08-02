import { useEffect, useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { dataSource } from './services/dataSource';
import { nilmEngine } from './services/nilmEngine';
import { anomalyDetector, AnomalyAlert } from './services/anomalyDetector';
import { costCalculator } from './services/costCalculator';
import { insightGenerator, Insight } from './services/insightGenerator';
import { EnergyRecord, DataSourceControls } from './types/energy';
import {
  Zap, AlertTriangle, Lightbulb, Clock, CheckCircle2,
  TrendingUp, BarChart3, Settings as SettingsIcon,
  Activity, Leaf, IndianRupee, Cpu, Power, Wifi,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

// ─── Colour palette ───
const CHART_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

type Tab = 'dashboard' | 'appliances' | 'live' | 'alerts' | 'analysis' | 'settings';

function App() {
  const [liveRecord, setLiveRecord] = useState<EnergyRecord | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [historical, setHistorical] = useState<EnergyRecord[]>([]);
  const [chartData, setChartData] = useState<{ time: string; power: number }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [recordIndex, setRecordIndex] = useState(0);
  const [tariff, setTariff] = useState(8.50);
  const controlsRef = useRef<DataSourceControls | null>(null);
  // force re-render so Layout picks up isSimulating changes
  const [, setTick] = useState(0);

  useEffect(() => {
    dataSource.getHistoricalData().then(setHistorical);

    const controls = dataSource.getLiveControls((raw) => {
      const processed = nilmEngine.processRecord(raw);
      setLiveRecord(processed);

      anomalyDetector.processLiveRecord(processed);
      setAlerts([...anomalyDetector.getActiveAlerts()]);

      setRecordIndex((p) => p + 1);

      setChartData((prev) => {
        const next = [
          ...prev,
          {
            time: new Date(processed.timestamp).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            }),
            power: processed.aggregatePowerWatts ?? 0,
          },
        ];
        return next.length > 30 ? next.slice(-30) : next;
      });
    });

    controlsRef.current = controls;

    // tick so Layout can read isSimulating
    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => { controls.pause(); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (liveRecord && historical.length > 0) {
      setInsights(insightGenerator.generateInsights(liveRecord, historical));
    }
  }, [liveRecord, historical]);

  // ─── Derived values ───
  const activeAppliances = liveRecord?.appliances.filter((a) => (a.powerWatts ?? 0) > 0) ?? [];
  const totalWatts = liveRecord?.aggregatePowerWatts ?? 0;
  const estMonthlyCost = Math.round((totalWatts / 1000) * 24 * 30 * tariff);
  const todayKwh = Number(((totalWatts / 1000) * (recordIndex * 6 / 3600)).toFixed(2));
  const carbonKg = Number((todayKwh * 0.82).toFixed(2)); // India grid average

  const histAnalysis = historical.length > 0
    ? costCalculator.analyzeHistoricalCosts(historical)
    : null;

  // ─── Tab list ───
  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard',  label: 'Dashboard' },
    { key: 'appliances', label: 'Appliances' },
    { key: 'live',       label: 'Live Graph' },
    { key: 'alerts',     label: `Alerts (${alerts.length})` },
    { key: 'analysis',   label: 'Monthly Analysis' },
    { key: 'settings',   label: 'Settings' },
  ];

  // ─────────────────── LANDING ───────────────────
  if (!liveRecord) {
    return (
      <Layout controls={controlsRef.current}>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Zap className="h-16 w-16 text-green-300 mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">EnergyGuard Ready</h2>
          <p className="text-slate-500 mb-8">Press <strong>Play ▶</strong> above to begin the UK-DALE simulation.</p>
        </div>
      </Layout>
    );
  }

  // ─────────────────── DASHBOARD ───────────────────
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<Zap className="h-5 w-5 text-green-500" />}    label="Current Power"    value={`${totalWatts} W`} />
        <KPI icon={<TrendingUp className="h-5 w-5 text-blue-500" />} label="Today's Energy"  value={`${todayKwh} kWh`} />
        <KPI icon={<IndianRupee className="h-5 w-5 text-amber-500" />} label="Est. Monthly Cost" value={`₹${estMonthlyCost.toLocaleString()}`} />
        <KPI icon={<Leaf className="h-5 w-5 text-emerald-500" />} label="Carbon Footprint" value={`${carbonKg} kg`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-800 flex items-center mb-3">
            <Activity className="h-4 w-4 mr-2 text-green-500" /> Live Aggregate Power
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gpow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="power" stroke="#22c55e" strokeWidth={2} fill="url(#gpow)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active appliances summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-800 mb-3">Active Devices</h3>
          {activeAppliances.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No devices active</p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-y-auto">
              {activeAppliances.map((a) => (
                <li key={a.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">{a.name}</span>
                  <span className="text-sm font-bold text-slate-900">{a.powerWatts} W</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Insights & alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-amber-50">
            <h3 className="text-sm font-bold text-amber-900 flex items-center">
              <Lightbulb className="h-4 w-4 mr-2 text-amber-500" /> Energy Saving Suggestions
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {insights.length === 0
              ? <p className="text-sm text-slate-400 text-center py-4">Gathering data…</p>
              : insights.map((ins) => (
                <div key={ins.id} className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  💡 {ins.message}
                </div>
              ))}
          </div>
        </div>

        {/* Recent alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-red-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-red-900 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" /> Recent Alerts
            </h3>
            {alerts.length > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All clear — no anomalies detected.</p>
              </div>
            ) : (
              [...alerts].reverse().slice(0, 5).map((a) => (
                <div key={a.id} className="p-3 border-b border-slate-100 border-l-4 border-l-red-500 text-sm">
                  <span className="font-bold text-red-600 text-[10px] uppercase tracking-wider">{a.type}</span>
                  <p className="text-slate-700 mt-0.5">{a.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────── APPLIANCES ───────────────────
  const renderAppliances = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800 flex items-center">
          <Cpu className="h-5 w-5 mr-2 text-blue-500" /> Detected Appliances
        </h2>
        <span className="text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded border border-slate-200">
          {new Date(liveRecord.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {liveRecord.appliances
          .slice()
          .sort((a, b) => (b.powerWatts ?? 0) - (a.powerWatts ?? 0))
          .map((app) => {
            const on = (app.powerWatts ?? 0) > 0;
            return (
              <div key={app.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${on ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <Power className={`h-5 w-5 ${on ? 'text-blue-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{app.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {on
                        ? <><CheckCircle2 className="h-3 w-3 text-green-500" /> Active</>
                        : <><Clock className="h-3 w-3" /> Off / Standby</>}
                      <span className="mx-1">•</span>
                      Confidence {Math.round((app.confidence ?? 0) * 100)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${on ? 'text-slate-900' : 'text-slate-400'}`}>
                    {app.powerWatts} <span className="text-sm font-normal text-slate-500">W</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ₹{((app.powerWatts ?? 0) / 1000 * 24 * 30 * tariff).toFixed(0)}/mo
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  // ─────────────────── LIVE GRAPH ───────────────────
  const renderLive = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-500" /> Real-Time Energy Usage
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium border border-blue-100">
              Data Source: UK-DALE Sample
            </span>
            <span className={`px-2 py-1 rounded font-bold border ${controlsRef.current?.isSimulating ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              Simulation: {controlsRef.current?.isSimulating ? 'Active' : 'Paused'}
            </span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gpow2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} tickMargin={8} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} label={{ value: 'Watts', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#94a3b8' } }} />
              <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="power" stroke="#22c55e" strokeWidth={2.5} fill="url(#gpow2)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Record {recordIndex} / 1000 — updates every 2.5 s — 6-second native sampling interval
        </p>
      </div>
    </div>
  );

  // ─────────────────── ALERTS ───────────────────
  const renderAlerts = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-red-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-red-900 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" /> Abnormal Energy Events
        </h2>
        <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
          <p className="text-slate-500">No anomalies detected yet. Keep the simulation running.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
          {[...alerts].reverse().map((a) => (
            <div key={a.id} className="p-4 border-l-4 border-l-red-500 hover:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">{a.type}</span>
                <span className="text-[10px] text-slate-400 font-mono">{new Date(a.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{a.applianceName}</p>
              <p className="text-sm text-slate-600 mt-0.5">{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─────────────────── MONTHLY ANALYSIS ───────────────────
  const renderAnalysis = () => {
    if (!histAnalysis) {
      return <p className="text-center text-slate-400 py-20">Loading historical data…</p>;
    }

    const costEntries = Object.values(histAnalysis.applianceCosts)
      .filter((e) => e.kwh > 0)
      .sort((a, b) => b.cost - a.cost);

    const barData = costEntries.map((e) => ({
      name: e.name,
      cost: Number(e.cost.toFixed(1)),
      kwh: Number(e.kwh.toFixed(2)),
    }));

    const pieData = costEntries.map((e, i) => ({
      name: e.name,
      value: Number(e.kwh.toFixed(2)),
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI icon={<BarChart3 className="h-5 w-5 text-blue-500" />}  label="Total Energy (30 d)"  value={`${histAnalysis.totalEnergyKwh.toFixed(1)} kWh`} />
          <KPI icon={<IndianRupee className="h-5 w-5 text-amber-500" />} label="Total Cost (30 d)"    value={`₹${histAnalysis.totalCost.toFixed(0)}`} />
          <KPI icon={<Leaf className="h-5 w-5 text-emerald-500" />}   label="Carbon (30 d)"       value={`${(histAnalysis.totalEnergyKwh * 0.82).toFixed(1)} kg CO₂`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Appliance Cost Breakdown</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#334155' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="cost" name="Cost (₹)" radius={[0, 4, 4, 0]}>
                    {barData.map((_e, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4">Energy Share by Appliance</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-base font-bold text-slate-800 mb-3">Recommendations</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {costEntries.slice(0, 3).map((e) => (
              <li key={e.name} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                ⚡ <strong>{e.name}</strong> used {e.kwh.toFixed(1)} kWh (₹{e.cost.toFixed(0)}) this month.
                {e.kwh > 30 && ' Consider upgrading to a more energy-efficient model.'}
                {e.kwh <= 30 && e.kwh > 5 && ' Review usage patterns to reduce consumption.'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // ─────────────────── SETTINGS ───────────────────
  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center">
          <SettingsIcon className="h-5 w-5 mr-2 text-slate-500" /> Settings
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Electricity Tariff (₹ per kWh)</label>
            <input
              type="number"
              value={tariff}
              onChange={(e) => setTariff(Number(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1">Default: ₹8.50/kWh — adjust to match your local utility rate.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Simulation Speed</label>
            <p className="text-sm text-slate-500">Records play every 2.5 seconds (native 6-second UK-DALE interval).</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
          <Wifi className="h-5 w-5 mr-2 text-blue-500" /> Hardware Integration (Phase 3)
        </h3>
        <p className="text-sm text-slate-600 mb-4">
          Future versions will stream real-time data from CT clamp sensors via ESP32 + MQTT.
          The <code className="bg-slate-100 px-1 rounded text-xs">EnergyDataSource</code> interface
          is designed to swap seamlessly between the UK-DALE replay engine and a live hardware source.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-sm">
          {['CT Clamp → ESP32', 'ESP32 → WiFi / MQTT', 'NILM AI Model'].map((s) => (
            <div key={s} className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-slate-400 font-medium">
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─────────────────── RENDER ───────────────────
  return (
    <Layout controls={controlsRef.current}>
      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-bold transition-colors ${
                activeTab === t.key
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard'  && renderDashboard()}
      {activeTab === 'appliances' && renderAppliances()}
      {activeTab === 'live'       && renderLive()}
      {activeTab === 'alerts'     && renderAlerts()}
      {activeTab === 'analysis'   && renderAnalysis()}
      {activeTab === 'settings'   && renderSettings()}
    </Layout>
  );
}

// ─── Reusable KPI card ───
function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">{icon}</div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default App;
