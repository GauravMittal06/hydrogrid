import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  Bell,
  CheckCircle2,
  Droplets,
  Factory,
  Gauge,
  Leaf,
  Map as MapIcon,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Switch } from "./components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { Progress } from "./components/ui/progress";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, BarChart, Bar } from "recharts"

// ------------------------- MOCK DATA LAYERS ------------------------- //

type GridCell = {
  id: string;
  row: number;
  col: number;
  wqi: number; // 0 - 100
  pressure: number; // psi
  flow: number; // L/min
  leakRisk: number; // 0-1
};

type AlertItem = {
  id: string;
  type: "Leak Suspected" | "Pressure Drop" | "Unauthorized Usage" | "Quality Alert";
  severity: "low" | "medium" | "high";
  cellId: string;
  timestamp: string;
  description: string;
  assignedTo?: string;
  status: "open" | "ack" | "dispatched" | "resolved";
};

const seedGrid: GridCell[] = Array.from({ length: 36 }).map((_, i) => {
  const row = Math.floor(i / 6);
  const col = i % 6;
  const baseWqi = 80 + Math.sin(i) * 10 - (row === 3 && col > 2 ? 25 : 0);
  const wqi = Math.max(40, Math.min(98, Math.round(baseWqi)));
  const pressure = 45 + (Math.cos(i) * 8 - (row === 3 ? 12 : 0));
  const flow = 120 + (Math.sin(i / 2) * 20);
  const leakRisk = Math.max(0, Math.min(1, (75 - wqi) / 40 + (pressure < 36 ? 0.3 : 0)));
  return {
    id: `C${row + 1}-${col + 1}`,
    row,
    col,
    wqi,
    pressure: Math.round(pressure * 10) / 10,
    flow: Math.round(flow * 10) / 10,
    leakRisk: Math.round(leakRisk * 100) / 100,
  } as GridCell;
});

const demoUsage = Array.from({ length: 12 }).map((_, m) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m],
  usageKL: 8 + (m % 3) * 1.2 + Math.max(0, Math.sin(m / 1.8)) * 2.4,
  bill: 320 + m * 6 + (m % 2 ? 18 : 0),
}));

const initialAlerts: AlertItem[] = [
  {
    id: "AL-2091",
    type: "Leak Suspected",
    severity: "high",
    cellId: "C4-4",
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    description: "Rapid flow spike + pressure dip at junction C4-4.",
    status: "open",
  },
  {
    id: "AL-2092",
    type: "Quality Alert",
    severity: "medium",
    cellId: "C4-5",
    timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    description: "WQI trending down (potential contamination pathway).",
    status: "ack",
    assignedTo: "Team-Blue",
  },
  {
    id: "AL-2093",
    type: "Pressure Drop",
    severity: "low",
    cellId: "C5-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    description: "Localized pressure dip; monitoring ongoing.",
    status: "dispatched",
    assignedTo: "Team-Green",
  },
];

// ------------------------- UTILS ------------------------- //

const wqiBand = (wqi: number) => {
  if (wqi >= 90) return { label: "Excellent", tone: "bg-emerald-400/30", text: "text-emerald-400" };
  if (wqi >= 75) return { label: "Good", tone: "bg-teal-400/30", text: "text-teal-400" };
  if (wqi >= 60) return { label: "Moderate", tone: "bg-amber-400/30", text: "text-amber-400" };
  return { label: "Poor", tone: "bg-rose-500/30", text: "text-rose-400" };
};

const leakColor = (risk: number) =>
  risk > 0.66 ? "fill-rose-500" : risk > 0.33 ? "fill-amber-400" : "fill-emerald-400";

// ------------------------- SVG GRID MAP ------------------------- //

type GridMapProps = {
  cells: GridCell[];
  onSelect: (cell: GridCell) => void;
  highlight?: string | null;
};

const GridMap: React.FC<GridMapProps> = ({ cells, onSelect, highlight }) => {
  const size = 6;
  const tile = 52;
  const padding = 16;
  return (
    <div className="w-full">
      <svg
        className="w-full"
        viewBox={`0 0 ${padding * 2 + tile * size} ${padding * 2 + tile * size}`}
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>
        <g transform={`translate(${padding},${padding})`}>
          {cells.map((c) => {
            const x = c.col * tile;
            const y = c.row * tile;
            const band = wqiBand(c.wqi);
            const isHL = highlight === c.id;
            return (
              <g key={c.id} transform={`translate(${x},${y})`}>
                <rect
                  width={tile - 6}
                  height={tile - 6}
                  rx={10}
                  className={`stroke-slate-700/60 ${band.tone} ${isHL ? "stroke-2" : "stroke"}`}
                  filter="url(#shadow)"
                  onClick={() => onSelect(c)}
                  style={{ cursor: "pointer" }}
                />
                {/* Leak risk dot */}
                <circle
                  cx={tile - 16}
                  cy={14}
                  r={6}
                  className={leakColor(c.leakRisk)}
                />
                {/* Label */}
                <text x={10} y={20} className={`text-[10px] ${band.text} select-none`}>
                  {c.id}
                </text>
                <text x={10} y={34} className="text-[9px] fill-slate-400 select-none">
                  WQI {c.wqi}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"/> Low risk</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"/> Medium</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500 inline-block"/> High</span>
        <span className="ml-auto">Tap a tile to inspect</span>
      </div>
    </div>
  );
};

// ------------------------- CITIZEN PORTAL ------------------------- //

type CitizenProps = {
  grid: GridCell[];
  onReport: (payload: { cellId?: string; type: string; notes: string; photo?: string }) => void;
};

const CitizenPortal: React.FC<CitizenProps> = ({ grid, onReport }) => {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [ecoPoints, setEcoPoints] = useState<number>(420);
  const [billDue] = useState({ amount: 486, due: "Sep 18, 2025" });
  const avgUsage = useMemo(() => demoUsage.reduce((a, b) => a + b.usageKL, 0) / demoUsage.length, []);

  const selected = grid.find((g) => g.id === highlight) ?? grid[0];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Wallet className="w-5 h-5"/> Bill & Usage</CardTitle>
            <CardDescription>Track your household water footprint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Amount due</span>
                <span className="text-slate-100 font-semibold">₹{billDue.amount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Due date</span>
                <span className="text-slate-100 font-medium">{billDue.due}</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demoUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="usageKL" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-slate-400">Avg monthly usage: {avgUsage.toFixed(1)} KL</div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="secondary" className="bg-slate-800">Pay Bill</Button>
          </CardFooter>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Leaf className="w-5 h-5"/> Eco Rewards</CardTitle>
            <CardDescription>Earn points by saving water & reporting issues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-100">{ecoPoints}</div>
                <div className="text-xs text-slate-400">Current points</div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Silver Tier</Badge>
            </div>
            <Progress value={(ecoPoints % 500) / 5} />
            <div className="text-xs text-slate-400">Next reward at 500 pts – free leak inspection</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Daily Saver", pts: "+5" },
                { label: "Report Leak", pts: "+25" },
                { label: "On-time Bill", pts: "+10" },
              ].map((r) => (
                <div key={r.label} className="rounded-2xl border border-slate-800 p-3 text-center bg-slate-900/40">
                  <Trophy className="w-5 h-5 mx-auto" />
                  <div className="text-xs mt-1 text-slate-300">{r.label}</div>
                  <div className="text-[10px] text-emerald-300">{r.pts}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setEcoPoints((p) => p + 25)}>Claim Leak Report Bonus</Button>
              <Button variant="outline" className="flex-1" onClick={() => setEcoPoints((p) => p + 10)}>Pay-on-time Bonus</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><MapIcon className="w-5 h-5"/> Water Grid & WQI</CardTitle>
            <CardDescription>Tap a section to inspect quality & pressure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <GridMap
              cells={grid}
              onSelect={(c) => setHighlight(c.id)}
              highlight={highlight}
            />
            {selected && (
              <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-300">Section <span className="font-semibold text-slate-100">{selected.id}</span></div>
                  <Badge className={`${wqiBand(selected.wqi).tone} ${wqiBand(selected.wqi).text} border-slate-700`}>{wqiBand(selected.wqi).label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div className="rounded-lg bg-slate-950/40 p-2"><div className="text-[11px] text-slate-400">WQI</div><div className="text-slate-100 font-semibold">{selected.wqi}</div></div>
                  <div className="rounded-lg bg-slate-950/40 p-2"><div className="text-[11px] text-slate-400">Pressure</div><div className="text-slate-100 font-semibold">{selected.pressure} psi</div></div>
                  <div className="rounded-lg bg-slate-950/40 p-2"><div className="text-[11px] text-slate-400">Flow</div><div className="text-slate-100 font-semibold">{selected.flow} L/min</div></div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <ReportDialog onSubmit={onReport} defaultCell={highlight ?? undefined} />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

// ------------------------- REPORT DIALOG ------------------------- //

type ReportProps = {
  defaultCell?: string;
  onSubmit: (payload: { cellId?: string; type: string; notes: string; photo?: string }) => void;
};

const ReportDialog: React.FC<ReportProps> = ({ defaultCell, onSubmit }) => {
  const [cellId, setCellId] = useState<string | undefined>(defaultCell);
  const [type, setType] = useState("Leak");
  const [notes, setNotes] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2"><AlertCircle className="w-4 h-4"/> Report an Issue</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle>Report a Problem</DialogTitle>
          <DialogDescription>
            Help your city act faster. Reports earn eco points after verification.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Nearest Grid Cell</div>
              <Input placeholder="e.g. C4-4" value={cellId ?? ""} onChange={(e) => setCellId(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Type</div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leak">Leak</SelectItem>
                  <SelectItem value="Quality">Water Quality</SelectItem>
                  <SelectItem value="Theft">Theft/Illegal Tap</SelectItem>
                  <SelectItem value="Pressure">Low Pressure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Notes</div>
            <Textarea rows={4} placeholder="Describe what you observed..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="text-xs text-slate-500">(Optional) Photo upload disabled in demo</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="bg-slate-800" onClick={() => { setCellId(undefined); setType("Leak"); setNotes(""); }}>Reset</Button>
          <Button onClick={() => onSubmit({ cellId, type, notes })}>Submit Report</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ------------------------- DEPARTMENT CONSOLE ------------------------- //

type DeptProps = {
  grid: GridCell[];
  initialAlerts: AlertItem[];
};

const DepartmentConsole: React.FC<DeptProps> = ({ grid, initialAlerts }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [selected, setSelected] = useState<GridCell | null>(grid.find((g) => g.id === "C4-4") ?? grid[0]);
  const [autoDispatch, setAutoDispatch] = useState(true);

  const wqiTrend = useMemo(() =>
    Array.from({ length: 14 }).map((_, i) => ({ t: `T-${14 - i}`, wqi: Math.max(42, Math.min(98, (selected?.wqi ?? 80) + Math.sin(i / 1.7) * 4 - (selected?.id === "C4-4" ? 10 : 0))) })),
  [selected]);

  const acknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "ack" } : a)));
  };
  const dispatch = (id: string, team: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "dispatched", assignedTo: team } : a)));
  };
  const resolve = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "resolved" } : a)));
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Factory className="w-5 h-5"/> City Grid – Live View</CardTitle>
            <CardDescription>WQI overlay, pressure & flow by section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <GridMap
              cells={grid}
              onSelect={(c) => setSelected(c)}
              highlight={selected?.id ?? null}
            />
            {selected && (
              <div className="rounded-xl border border-slate-800 p-3 bg-slate-900/60">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`${wqiBand(selected.wqi).tone} ${wqiBand(selected.wqi).text} border-slate-700`}>WQI {selected.wqi} – {wqiBand(selected.wqi).label}</Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">Pressure {selected.pressure} psi</Badge>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">Flow {selected.flow} L/min</Badge>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wqiTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="t" />
                      <YAxis />
                      <RTooltip />
                      <Line type="monotone" dataKey="wqi" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Switch checked={autoDispatch} onCheckedChange={setAutoDispatch} />
              <span className="text-sm">Auto-dispatch critical leaks</span>
            </div>
            <Button variant="outline" className="bg-slate-800 text-slate-100 border-slate-700"><ShieldCheck className="w-4 h-4 mr-1"/> Safe Mode</Button>
          </CardFooter>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Bell className="w-5 h-5"/> Alerts & Dispatch</CardTitle>
            <CardDescription>AI-ranked anomalies with one-click workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {alerts.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-slate-800 p-3 bg-slate-950/60"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${a.severity === "high" ? "bg-rose-500/20 text-rose-300" : a.severity === "medium" ? "bg-amber-400/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"}`}>{a.type}</Badge>
                        <span className="text-xs text-slate-400">{new Date(a.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-sm mt-1 text-slate-200">{a.description} <span className="text-slate-400">(cell {a.cellId})</span></div>
                      <div className="text-[11px] text-slate-500 mt-1">Status: {a.status}{a.assignedTo ? ` → ${a.assignedTo}` : ""}</div>
                    </div>
                    <div className="flex gap-1">
                      {a.status === "open" && (
                        <Button size="sm" variant="secondary" className="bg-slate-800" onClick={() => acknowledge(a.id)}>Acknowledge</Button>
                      )}
                      {a.status !== "resolved" && (
                        <Select onValueChange={(team) => dispatch(a.id, team)}>
                          <SelectTrigger className="w-[120px] text-xs">{a.status === "dispatched" ? a.assignedTo : "Dispatch"}</SelectTrigger>
                          <SelectContent>
                            {['Team-Blue','Team-Green','Night-Shift'].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      )}
                      {a.status !== "resolved" && (
                        <Button size="sm" onClick={() => resolve(a.id)} className="bg-emerald-600 hover:bg-emerald-500">Resolve</Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <div className="text-xs text-slate-400">Critical alerts will auto-dispatch when enabled.</div>
          </CardFooter>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Users className="w-5 h-5"/> Citizen Reports</CardTitle>
            <CardDescription>Verify and convert reports to work orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[{ id: "R-8841", type: "Leak", cellId: "C4-4", notes: "Water pooling near manhole", user: "@gaurav" }, { id: "R-8842", type: "Quality", cellId: "C2-2", notes: "Rusty taste since morning", user: "@neha" }].map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-800 p-3 bg-slate-950/50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-100 font-medium">{r.type} • {r.id}</div>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-200">{r.cellId}</Badge>
                </div>
                <div className="text-xs text-slate-400 mt-1">{r.notes} — <span className="text-slate-300">{r.user}</span></div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">Approve & Dispatch</Button>
                  <Button size="sm" variant="outline" className="bg-slate-800 text-slate-100 border-slate-700">Mark Duplicate</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Wrench className="w-5 h-5"/> Workforce</CardTitle>
            <CardDescription>Team availability & SLA tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[{ team: "Team-Blue", eta: "18 min", jobs: 2 }, { team: "Team-Green", eta: "25 min", jobs: 3 }, { team: "Night-Shift", eta: "—", jobs: 0 }].map((t) => (
              <div key={t.team} className="flex items-center justify-between rounded-xl border border-slate-800 p-3 bg-slate-950/50">
                <div className="text-slate-200">{t.team}</div>
                <div className="text-xs text-slate-400">Active jobs: {t.jobs}</div>
                <Badge className="bg-indigo-500/20 text-indigo-300">ETA {t.eta}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100"><Activity className="w-5 h-5"/> System Health</CardTitle>
            <CardDescription>Uptime, sensors and data quality</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <Metric label="Uptime" value="99.96%" icon={<CheckCircle2 className="w-4 h-4"/>} />
              <Metric label="Sensors" value="214" icon={<Droplets className="w-4 h-4"/>} />
              <Metric label="Data Valid" value="98.1%" icon={<Gauge className="w-4 h-4"/>} />
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={Array.from({length:20}).map((_,i)=>({i, err: Math.max(0, Math.sin(i/2)*2 + (i%5===0?1.5:0))}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="i" />
                  <YAxis />
                  <RTooltip />
                  <Line type="monotone" dataKey="err" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-800 p-3 bg-slate-950/50">
    <div className="text-[11px] text-slate-400 flex items-center gap-1">{icon}{label}</div>
    <div className="text-slate-100 font-semibold">{value}</div>
  </div>
);

// ------------------------- ROOT APP (DUAL EXPERIENCE) ------------------------- //

export default function HydroGrid() {
  const [mode, setMode] = useState<"citizen" | "dept">("citizen");
  const [grid, setGrid] = useState<GridCell[]>(seedGrid);
  const [toast, setToast] = useState<string | null>(null);

  const handleReport = (payload: { cellId?: string; type: string; notes: string }) => {
    setToast(`Report received: ${payload.type}${payload.cellId ? ` @ ${payload.cellId}` : ""}. +25 eco points after verification.`);
    // Simulate a slight WQI impact for quality reports to visualize feedback
    if (payload.type === "Quality" && payload.cellId) {
      setGrid((g) => g.map((c) => (c.id === payload.cellId ? { ...c, wqi: Math.max(40, c.wqi - 3), leakRisk: Math.min(1, c.leakRisk + 0.05) } : c)));
    }
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 bg-slate-950/40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500"/>
            <div className="leading-tight">
              <div className="font-semibold text-slate-100">HydroGrid</div>
              <div className="text-[11px] text-slate-400">IoT + AI water grid</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hidden md:inline-flex">Hackathon Prototype</Badge>
            <div className="hidden md:flex items-center rounded-full border border-slate-800 bg-slate-900/50 p-1">
              <Button variant={mode === "citizen" ? "default" : "ghost"} className={`rounded-full ${mode === "citizen" ? "bg-cyan-600" : ""}`} onClick={() => setMode("citizen")}>
                <Smartphone className="w-4 h-4 mr-1"/> Citizen
              </Button>
              <Button variant={mode === "dept" ? "default" : "ghost"} className={`rounded-full ${mode === "dept" ? "bg-indigo-600" : ""}`} onClick={() => setMode("dept")}>
                <Factory className="w-4 h-4 mr-1"/> Department
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero / Summary */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid md:grid-cols-[1.3fr,1fr] gap-4 items-stretch">
          <Card className="bg-slate-900/60 border-slate-800 overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2">
                <div className="p-6">
                  <div className="text-xs uppercase tracking-wide text-cyan-300 mb-1">Smart • Secure • Sustainable</div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-100">Build resilient water cities with <span className="text-cyan-300">AI insight</span> + <span className="text-emerald-300">citizen action</span>.</h1>
                  <p className="text-slate-400 mt-2">Real-time leak detection, WQI monitoring, and gamified eco-rewards — all in one interface.</p>
                  <div className="flex gap-2 mt-4 md:hidden">
                    <Button onClick={() => setMode("citizen")} className="flex-1 bg-cyan-600"><Smartphone className="w-4 h-4 mr-1"/> Citizen</Button>
                    <Button onClick={() => setMode("dept")} className="flex-1 bg-indigo-600"><Factory className="w-4 h-4 mr-1"/> Department</Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <MiniStat icon={<Droplets className="w-4 h-4"/>} label="Leaks Cut" value="30–40%" hint="pilot estimate"/>
                    <MiniStat icon={<ShieldCheck className="w-4 h-4"/>} label="WQI Guard" value=">=75" hint="city target"/>
                    <MiniStat icon={<Trophy className="w-4 h-4"/>} label="Eco Points" value="500k" hint="citizens engaged"/>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 border-l border-slate-800">
                  <div className="text-sm font-medium text-slate-100 mb-2">Live Grid Snapshot</div>
                  <GridMap cells={grid} onSelect={()=>{}} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100"><MapIcon className="w-5 h-5"/> WQI Overview</CardTitle>
              <CardDescription>City sections by water quality band</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { k: "Excellent", n: grid.filter(g=>wqiBand(g.wqi).label==="Excellent").length },
                  { k: "Good", n: grid.filter(g=>wqiBand(g.wqi).label==="Good").length },
                  { k: "Moderate", n: grid.filter(g=>wqiBand(g.wqi).label==="Moderate").length },
                  { k: "Poor", n: grid.filter(g=>wqiBand(g.wqi).label==="Poor").length },
                ].map((b)=> (
                  <div key={b.k} className="flex items-center justify-between rounded-xl border border-slate-800 p-3 bg-slate-950/50">
                    <span className="text-slate-200">{b.k}</span>
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200">{b.n}</Badge>
                  </div>
                ))}
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={["Excellent","Good","Moderate","Poor"].map((k)=>({ band:k, count: grid.filter(g=>wqiBand(g.wqi).label===k).length }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="band" />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Body: Dual Tabs */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={mode} onValueChange={(v)=>setMode(v as any)}>
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="citizen" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white"><Smartphone className="w-4 h-4 mr-1"/> Citizen Portal</TabsTrigger>
            <TabsTrigger value="dept" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"><Factory className="w-4 h-4 mr-1"/> Water Department</TabsTrigger>
          </TabsList>

          <TabsContent value="citizen" className="mt-4">
            <CitizenPortal grid={grid} onReport={handleReport} />
          </TabsContent>

          <TabsContent value="dept" className="mt-4">
            <DepartmentConsole grid={grid} initialAlerts={initialAlerts} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-4 right-4 z-50 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-lg"
        >
          <div className="text-sm text-slate-100">{toast}</div>
        </motion.div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 pb-8 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-2"><ShieldCheck className="w-3 h-3"/> Demo data only</div>
        <div>© 2025 TexhSnatxhers • HydroGrid</div>
      </footer>
    </div>
  );
}

const MiniStat: React.FC<{ icon: React.ReactNode; label: string; value: string; hint?: string }> = ({ icon, label, value, hint }) => (
  <div className="rounded-2xl border border-slate-800 p-3 bg-slate-950/50">
    <div className="flex items-center gap-2 text-slate-300 text-sm">{icon}{label}</div>
    <div className="text-2xl font-semibold text-slate-100">{value}</div>
    {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
  </div>
);
