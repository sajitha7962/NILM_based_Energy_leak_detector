import { useEffect, useState, useRef } from 'react';
import { Layout } from './components/Layout';
import { dataSource } from './services/dataSource';
import { nilmEngine } from './services/nilmEngine';
import { anomalyDetector, AnomalyAlert } from './services/anomalyDetector';
import { costCalculator } from './services/costCalculator';
import { insightGenerator, Insight } from './services/insightGenerator';
import { EnergyRecord, DataSourceControls } from './types/energy';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, AlertTriangle, Lightbulb, CheckCircle2,
  TrendingUp, BarChart3, Settings as SettingsIcon,
  Activity, Leaf, IndianRupee, Cpu, Power, Wifi, ShieldCheck, Server
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn } from './utils/cn';

const CHART_COLORS = [
  '#F59E0B', '#F97316', '#22C55E', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444',
];

type Tab = 'dashboard' | 'appliances' | 'live' | 'alerts' | 'analysis' | 'settings' | 'modelStatus';

export default function App() {
  const { t } = useTranslation();
  const [liveRecord, setLiveRecord] = useState<EnergyRecord | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [historical, setHistorical] = useState<EnergyRecord[]>([]);
  const [chartData, setChartData] = useState<{ time: string; power: number }[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [recordIndex, setRecordIndex] = useState(0);
  const [tariff, setTariff] = useState(8.50);
  const controlsRef = useRef<DataSourceControls | null>(null);
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

    const id = setInterval(() => setTick((t) => t + 1), 400);
    return () => { controls.pause(); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (liveRecord && historical.length > 0) {
      setInsights(insightGenerator.generateInsights(liveRecord, historical));
    }
  }, [liveRecord, historical]);

  const activeAppliances = liveRecord?.appliances.filter((a) => (a.powerWatts ?? 0) > 0) ?? [];
  const totalWatts = liveRecord?.aggregatePowerWatts ?? 0;
  const estMonthlyCost = Math.round((totalWatts / 1000) * 24 * 30 * tariff);
  const todayKwh = Number(((totalWatts / 1000) * (recordIndex * 6 / 3600)).toFixed(2));
  const carbonKg = Number((todayKwh * 0.82).toFixed(2));

  const histAnalysis = historical.length > 0
    ? costCalculator.analyzeHistoricalCosts(historical)
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard',  label: t('nav.dashboard', 'Dashboard') },
    { key: 'appliances', label: t('nav.appliances', 'Appliances') },
    { key: 'live',       label: t('nav.liveGraph', 'Live Graph') },
    { key: 'alerts',     label: `${t('nav.alerts', 'Alerts')} (${alerts.length})` },
    { key: 'analysis',   label: t('nav.analysis', 'Analysis') },
    { key: 'modelStatus',label: t('nav.modelStatus', 'AI Models') },
    { key: 'settings',   label: t('nav.settings', 'Settings') },
  ];

  if (!liveRecord) {
    return (
      <Layout controls={controlsRef.current}>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Zap className="h-16 w-16 text-brand-primary mb-6 animate-pulse drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
          <h2 className="text-3xl font-black bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent mb-2 drop-shadow-sm">{t('app.readyTitle', 'EnergyGuard Ready')}</h2>
          <p className="text-brand-text-muted mb-8 font-medium">{t('app.readyDesc', 'Press Play ▶ in the header to begin the 1D CNN NILM simulation.')}</p>
        </div>
      </Layout>
    );
  }

  // ─────────────────── DASHBOARD ───────────────────
  const renderDashboard = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI icon={<Zap className="h-6 w-6 text-brand-primary" />} label={t('kpi.currentPower', 'Current Power')} value={`${totalWatts} W`} />
        <KPI icon={<TrendingUp className="h-6 w-6 text-brand-accent" />} label={t('kpi.todayEnergy', "Today's Energy")} value={`${todayKwh} kWh`} />
        <KPI icon={<IndianRupee className="h-6 w-6 text-brand-success" />} label={t('kpi.estCost', 'Est. Monthly Cost')} value={`₹${estMonthlyCost.toLocaleString()}`} />
        <KPI icon={<Leaf className="h-6 w-6 text-emerald-500" />} label={t('kpi.carbonFootprint', 'Carbon Footprint')} value={`${carbonKg} kg`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-base font-bold text-brand-text flex items-center mb-4">
            <Activity className="h-5 w-5 mr-2 text-brand-primary" /> {t('dashboard.livePower', 'Live Aggregate Power')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gpowMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', color: '#F8FAFC' }} />
                <Area type="monotone" dataKey="power" stroke="#10B981" strokeWidth={3} fill="url(#gpowMain)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-base font-bold text-brand-text mb-4">{t('dashboard.activeDevices', 'Active Devices')}</h3>
          {activeAppliances.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-brand-text-muted">
              <Power className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">{t('dashboard.noDevices', 'No devices active')}</p>
            </div>
          ) : (
            <ul className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-hide">
              <AnimatePresence>
                {activeAppliances.map((a) => (
                  <motion.li initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} key={a.id} className="flex justify-between items-center glass px-4 py-3 rounded-xl border border-white/10 shadow-sm hover:border-brand-primary/30 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-brand-text">{a.name}</span>
                      <span className="text-[10px] text-brand-primary font-bold">{Math.round((a.confidence ?? 0) * 100)}% {t('dashboard.cnnConf', 'CNN Conf')}</span>
                    </div>
                    <span className="text-sm font-black text-brand-text">{a.powerWatts} W</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-brand-primary/20 bg-brand-primary/10">
            <h3 className="text-sm font-bold text-brand-primary flex items-center drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              <Lightbulb className="h-5 w-5 mr-2 text-brand-primary" /> {t('dashboard.aiRecommendations', 'AI Recommendations')}
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {insights.length === 0 ? <p className="text-sm text-brand-text-muted text-center py-4">{t('dashboard.analyzing', 'Analyzing patterns…')}</p>
              : insights.map((ins) => (
                <div key={ins.id} className="text-sm text-brand-text glass rounded-xl p-4 border border-white/10 shadow-sm flex items-start gap-3 transition hover:shadow-md hover:border-brand-accent/30">
                  <span className="text-brand-accent mt-0.5">💡</span>
                  <span className="font-medium leading-relaxed">{ins.message}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="glass-card overflow-hidden border-brand-danger/30">
          <div className="p-4 border-b border-brand-danger/20 bg-brand-danger/10 flex justify-between items-center">
            <h3 className="text-sm font-bold text-brand-danger flex items-center drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="h-5 w-5 mr-2 text-brand-danger" /> {t('dashboard.anomalyDetection', 'Anomaly Detection')}
            </h3>
            {alerts.length > 0 && <span className="bg-brand-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>}
          </div>
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
            {alerts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-brand-success/50 mx-auto mb-3" />
                <p className="text-sm text-brand-text-muted font-medium">{t('dashboard.allClear', 'All clear — no anomalies detected.')}</p>
              </div>
            ) : (
              [...alerts].reverse().slice(0, 5).map((a) => (
                <div key={a.id} className="p-4 border-b border-white/5 border-l-4 border-l-brand-danger glass bg-[#111827]/40 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold text-brand-danger text-[10px] uppercase tracking-wider">{a.type}</span>
                    <span className="text-[10px] font-bold text-brand-primary">IF Score: {a.isolationForestScore}</span>
                  </div>
                  <p className="text-brand-text font-semibold mt-1">{a.message}</p>
                  <p className="text-brand-text-muted text-xs mt-1 italic">{a.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────── APPLIANCES ───────────────────
  const renderAppliances = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {liveRecord.appliances.slice().sort((a, b) => (b.powerWatts ?? 0) - (a.powerWatts ?? 0)).map((app) => {
        const on = (app.powerWatts ?? 0) > 0;
        return (
          <div key={app.id} className={cn("glass-card p-6 flex flex-col justify-between transition-all hover:-translate-y-1 hover:shadow-xl", on ? "border-brand-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "border-white/5 opacity-80")}>
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl border", on ? "bg-gradient-to-br from-brand-primary to-brand-accent text-brand-bg shadow-[0_0_15px_rgba(16,185,129,0.4)] border-brand-primary/50" : "glass border-white/10 text-brand-text-muted")}>
                  <Cpu className="h-6 w-6" />
                </div>
                <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", on ? "bg-brand-success/20 text-brand-success border-brand-success/30 shadow-[inset_0_0_8px_rgba(52,211,153,0.2)]" : "bg-white/5 text-brand-text-muted border-white/10")}>
                  {on ? t('appliances.active', 'ACTIVE') : t('appliances.standby', 'STANDBY')}
                </div>
              </div>
              <h3 className="text-lg font-black text-brand-text">{app.name}</h3>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-text-muted">{t('appliances.powerDraw', 'Power Draw')}</span>
                  <span className={cn("font-black", on ? "text-brand-primary" : "text-brand-text-muted")}>{app.powerWatts} W</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-text-muted">{t('appliances.monthlyEst', 'Monthly Est.')}</span>
                  <span className="font-bold text-brand-text">₹{((app.powerWatts ?? 0) / 1000 * 24 * 30 * tariff).toFixed(0)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-brand-secondary/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-text/50 font-medium">1D CNN Confidence</span>
                <span className="font-bold text-brand-primary">{Math.round((app.confidence ?? 0) * 100)}%</span>
              </div>
              <div className="w-full bg-black/5 rounded-full h-1.5 mt-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-primary to-brand-accent h-1.5 rounded-full" style={{ width: `${(app.confidence ?? 0) * 100}%` }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </motion.div>
  );

  // ─────────────────── LIVE GRAPH ───────────────────
  const renderLive = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="glass-card p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-brand-text flex items-center">
            <Activity className="h-6 w-6 mr-3 text-brand-primary" /> Real-Time Energy Usage
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-white/60 text-brand-primary px-3 py-1.5 rounded-lg font-bold border border-brand-primary/20 shadow-sm">
              Dataset: UK-DALE Sample
            </span>
          </div>
        </div>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gpowLive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#FFEDD5" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#8b8782' }} tickMargin={12} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8b8782' }} axisLine={false} tickLine={false} label={{ value: 'Watts (W)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#8b8782', fontWeight: 600 } }} />
              <RechartsTooltip contentStyle={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="power" stroke="#F97316" strokeWidth={4} fill="url(#gpowLive)" isAnimationActive={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#F59E0B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────── ALERTS ───────────────────
  const renderAlerts = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden max-w-4xl mx-auto">
      <div className="p-6 border-b border-white/50 bg-brand-danger/5 flex justify-between items-center">
        <h2 className="text-xl font-black text-brand-danger flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3 text-brand-danger" /> Anomaly Events Log
        </h2>
        <span className="bg-brand-danger text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="p-20 text-center">
          <ShieldCheck className="h-16 w-16 text-brand-success/40 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-brand-text mb-2">System Secure</h3>
          <p className="text-brand-text/60">No anomalies detected yet. The Isolation Forest algorithm is monitoring.</p>
        </div>
      ) : (
        <div className="divide-y divide-brand-secondary/30">
          {[...alerts].reverse().map((a) => (
            <div key={a.id} className="p-6 border-l-4 border-l-brand-danger hover:bg-white/40 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black text-brand-danger uppercase tracking-widest bg-brand-danger/10 px-2 py-0.5 rounded">{a.type}</span>
                    <span className="text-xs text-brand-text/40 font-semibold">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-lg font-black text-brand-text mb-1">{a.applianceName}</p>
                  <p className="text-sm font-medium text-brand-text/80">{a.message}</p>
                  <div className="mt-3 bg-white/60 p-3 rounded-lg border border-brand-secondary/50 text-sm">
                    <p className="font-bold text-brand-text mb-1 text-xs uppercase tracking-wider text-brand-primary">XAI Explanation</p>
                    <p className="text-brand-text/80 italic mb-2">"{a.reason}"</p>
                    <p className="text-brand-success font-semibold flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {a.recommendation}</p>
                  </div>
                </div>
                <div className="flex gap-4 md:flex-col md:text-right">
                  <div>
                    <p className="text-[10px] text-brand-text/50 font-bold uppercase">IF Score</p>
                    <p className="text-lg font-black text-brand-primary">{a.isolationForestScore}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-brand-text/50 font-bold uppercase">CNN Conf</p>
                    <p className="text-lg font-black text-brand-text">{a.confidence}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  // ─────────────────── MONTHLY ANALYSIS ───────────────────
  const renderAnalysis = () => {
    if (!histAnalysis) return <p className="text-center text-brand-text/40 font-bold py-20">Loading models…</p>;

    const costEntries = Object.values(histAnalysis.applianceCosts).filter((e) => e.kwh > 0).sort((a, b) => b.cost - a.cost);
    const barData = costEntries.map((e) => ({ name: e.name, cost: Number(e.cost.toFixed(1)), kwh: Number(e.kwh.toFixed(2)) }));
    const pieData = costEntries.map((e, i) => ({ name: e.name, value: Number(e.kwh.toFixed(2)), fill: CHART_COLORS[i % CHART_COLORS.length] }));

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI icon={<BarChart3 className="h-6 w-6 text-brand-accent" />} label="Total Energy (30 d)" value={`${histAnalysis.totalEnergyKwh.toFixed(1)} kWh`} />
          <KPI icon={<IndianRupee className="h-6 w-6 text-brand-primary" />} label="Total Cost (30 d)" value={`₹${histAnalysis.totalCost.toFixed(0)}`} />
          <KPI icon={<Leaf className="h-6 w-6 text-brand-success" />} label="Carbon (30 d)" value={`${(histAnalysis.totalEnergyKwh * 0.82).toFixed(1)} kg`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-black text-brand-text mb-6">Appliance Cost Breakdown</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#FFEDD5" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#8b8782' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12, fill: '#2D2A26', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} cursor={{ fill: '#F59E0B', opacity: 0.1 }} />
                  <Bar dataKey="cost" name="Cost (₹)" radius={[0, 6, 6, 0]} barSize={24}>
                    {barData.map((_e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-black text-brand-text mb-6">Energy Share by Appliance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} stroke="none">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ─────────────────── MODEL STATUS ───────────────────
  const renderModelStatus = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <div className="glass-card p-8 text-center bg-gradient-to-br from-brand-primary to-brand-accent text-white border-none shadow-xl">
        <Server className="h-12 w-12 mx-auto mb-4 opacity-90" />
        <h2 className="text-3xl font-black mb-2">AI Inference Engine</h2>
        <p className="opacity-80 font-medium max-w-xl mx-auto">Operating locally via WebGL/WASM execution for maximum privacy. Simulated metrics represent production behavior on UK-DALE architecture.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-brand-primary">
          <h3 className="text-lg font-black text-brand-text mb-4">1D CNN Classifier</h3>
          <ul className="space-y-3 text-sm font-medium text-brand-text/80">
            <li className="flex justify-between"><span className="text-brand-text/50">Status</span> <span className="text-brand-success font-bold flex items-center"><CheckCircle2 className="h-4 w-4 mr-1"/> Active</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Inference Time</span> <span className="font-bold">12ms</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Accuracy</span> <span className="font-bold">96.4%</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Window Size</span> <span className="font-bold">60 seconds</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Model Version</span> <span className="font-bold">v2.4.1 (Quantized)</span></li>
          </ul>
        </div>
        
        <div className="glass-card p-6 border-l-4 border-l-brand-accent">
          <h3 className="text-lg font-black text-brand-text mb-4">Isolation Forest (Anomalies)</h3>
          <ul className="space-y-3 text-sm font-medium text-brand-text/80">
            <li className="flex justify-between"><span className="text-brand-text/50">Status</span> <span className="text-brand-success font-bold flex items-center"><CheckCircle2 className="h-4 w-4 mr-1"/> Active</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Contamination Rate</span> <span className="font-bold">0.05</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">Estimators</span> <span className="font-bold">100</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">False Positive Rate</span> <span className="font-bold">&lt; 2%</span></li>
            <li className="flex justify-between"><span className="text-brand-text/50">XAI Subsystem</span> <span className="font-bold">Enabled</span></li>
          </ul>
        </div>
      </div>
    </motion.div>
  );

  // ─────────────────── SETTINGS ───────────────────
  const renderSettings = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="glass-card p-8">
        <h2 className="text-2xl font-black text-brand-text mb-6 flex items-center">
          <SettingsIcon className="h-6 w-6 mr-3 text-brand-primary" /> Settings
        </h2>

        <div className="space-y-8">
          <div>
            <label className="block text-sm font-black text-brand-text mb-2">Electricity Tariff (₹ per kWh)</label>
            <input
              type="number"
              value={tariff}
              onChange={(e) => setTariff(Number(e.target.value) || 0)}
              className="w-full bg-white/60 border border-brand-secondary rounded-xl p-3 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary outline-none transition shadow-sm font-medium text-brand-text"
            />
            <p className="text-xs text-brand-text/50 mt-2 font-medium">Default: ₹8.50/kWh — adjust to match your local utility rate.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-8">
        <h3 className="text-lg font-black text-brand-text mb-3 flex items-center">
          <Wifi className="h-5 w-5 mr-3 text-brand-accent" /> Hardware Integration (Phase 3)
        </h3>
        <p className="text-sm text-brand-text/70 mb-6 font-medium leading-relaxed">
          Future versions will stream real-time data from CT clamp sensors via ESP32 + MQTT directly into our CNN pipeline.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-sm font-bold">
          {['CT Clamp → ESP32', 'ESP32 → MQTT', 'CNN NILM Model'].map((s) => (
            <div key={s} className="bg-brand-primary/5 border border-brand-primary/20 text-brand-primary rounded-xl p-4 shadow-sm">
              {s}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  return (
    <Layout controls={controlsRef.current}>
      {/* Tabs */}
      <div className="mb-8 overflow-x-auto">
        <nav className="flex gap-2 p-1.5 bg-brand-primary/5 rounded-2xl w-fit border border-brand-primary/10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn("whitespace-nowrap py-2.5 px-6 rounded-xl text-sm font-bold transition-all", 
                activeTab === t.key
                  ? "bg-white text-brand-primary shadow-sm ring-1 ring-black/5"
                  : "text-brand-text/60 hover:text-brand-text hover:bg-white/50"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {activeTab === 'dashboard'  && renderDashboard()}
          {activeTab === 'appliances' && renderAppliances()}
          {activeTab === 'live'       && renderLive()}
          {activeTab === 'alerts'     && renderAlerts()}
          {activeTab === 'analysis'   && renderAnalysis()}
          {activeTab === 'modelStatus'&& renderModelStatus()}
          {activeTab === 'settings'   && renderSettings()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function KPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default">
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-brand-secondary/30">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-brand-text/50 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-xl font-black text-brand-text">{value}</p>
      </div>
    </div>
  );
}
