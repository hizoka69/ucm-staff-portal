import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  BarChart3,
  Building2,
  Calendar,
  Clock,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api, { getErrorMessage } from '../api/client';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const UCM_COLORS = ['#00A9E0', '#15367A', '#0F9D75', '#D9941E', '#6D4AFF', '#E11D48'];

const HEADER_LABELS = {
  nombre_staff: 'Staff',
  nombre_completo: 'Staff',
  nombre: 'Nombre',
  apellido: 'Apellido',
  correo: 'Correo',
  nombre_carrera: 'Carrera',
  nombre_facultad: 'Facultad',
  siglas: 'Siglas',
  total_actividades: 'Actividades',
  actividades_participadas: 'Actividades',
  total_asistencias: 'Asistencias',
  asistencias: 'Asistencias',
  inasistencias: 'Inasistencias',
  horas_validadas: 'Horas Validadas',
  horas_efectivas: 'Horas Efectivas',
  total_horas: 'Horas Totales',
  horas_totales: 'Horas Totales',
  tasa_asistencia: 'Asistencia (%)',
  tasa_asistencia_pct: 'Asistencia (%)',
  pct_asistencia: 'Asistencia (%)',
  titulo: 'Actividad',
  fecha_actividad: 'Fecha',
  hora_inicio: 'Inicio',
  cantidad_horas: 'Horas',
  nombre_tipo: 'Tipo',
  nombre_estado: 'Estado',
  nombre_lugar: 'Lugar',
  nombre_ciudad: 'Ciudad',
  cupos_maximos: 'Cupos Máx.',
  cupos_ocupados: 'Ocupados',
  confirmados: 'Confirmados',
  en_espera: 'En Espera',
  lista_espera: 'Lista Espera',
  total_espera: 'En Espera',
  pct_ocupacion: 'Ocupación (%)',
  porcentaje_ocupacion: 'Ocupación (%)',
  cobertura_pct: 'Cobertura (%)',
  demanda_total: 'Demanda Total',
};

const COB_HIDDEN_COLS = new Set([
  'color_hex',
  'demanda_en_espera',
  'tasa_ocupacion_pct',
  'pct_ocupacion',
  'porcentaje_ocupacion',
  'cobertura_pct',
  'en_espera',
  'lista_espera',
  'total_espera',
]);

function pick(row, candidates, fallback = 0) {
  if (!row) return fallback;
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return fallback;
}

function formatColLabel(key) {
  return (
    HEADER_LABELS[key] ||
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

function formatCellValue(key, val) {
  if (val === null || val === undefined || val === '') return '—';
  if (key.includes('fecha')) return String(val).slice(0, 10);
  if (key.includes('pct') || key.includes('porcentaje') || key.includes('tasa')) {
    return `${Number(val).toFixed(1)}%`;
  }
  return String(val);
}

export default function ReportesView() {
  const [anio, setAnio] = useState(2026);
  const [mes, setMes] = useState(''); // '' = Todo el año
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [kpis, setKpis] = useState({});
  const [tendencia, setTendencia] = useState([]);
  const [horasFacultad, setHorasFacultad] = useState([]);
  const [demandaTipo, setDemandaTipo] = useState([]);
  const [rankingStaff, setRankingStaff] = useState([]);
  const [cobertura, setCobertura] = useState([]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = { anio };
    if (mes) params.mes = Number(mes);

    try {
      const [kpiRes, tendRes, facRes, demRes, rankRes, cobRes] = await Promise.all([
        api.get('/reportes/kpis', { params }),
        api.get('/reportes/tendencia-mensual', { params: { anio } }),
        api.get('/reportes/horas-facultad', { params }),
        api.get('/reportes/demanda-tipo', { params: { anio } }),
        api.get('/reportes/ranking-staff', { params }),
        api.get('/reportes/cobertura-actividades', { params }),
      ]);

      setKpis(kpiRes.data || {});
      setTendencia(tendRes.data || []);
      setHorasFacultad(facRes.data || []);
      setDemandaTipo(demRes.data || []);
      setRankingStaff(rankRes.data || []);
      setCobertura(cobRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudieron cargar los reportes desde Oracle.'));
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Normalización resiliente para los gráficos Recharts
  const chartTendencia = useMemo(() => {
    return tendencia.map((r, idx) => {
      const numMes = Number(pick(r, ['mes', 'num_mes', 'mes_num'], idx + 1));
      const label =
        r.nombre_mes || (numMes >= 1 && numMes <= 12 ? MESES_CORTOS[numMes - 1] : `M${idx + 1}`);
      return {
        mes: String(label).slice(0, 3),
        actividades: Number(pick(r, ['total_actividades', 'actividades', 'cant_actividades'], 0)),
        horas: Number(pick(r, ['total_horas', 'horas_validadas', 'horas_efectivas', 'horas'], 0)),
      };
    });
  }, [tendencia]);

  const chartFacultad = useMemo(() => {
    return horasFacultad.map((r) => ({
      facultad: pick(r, ['siglas', 'nombre_facultad', 'facultad'], 'UCM'),
      nombreCompleto: pick(r, ['nombre_facultad', 'facultad', 'siglas'], 'UCM'),
      horas: Number(pick(r, ['total_horas', 'horas_validadas', 'horas_totales', 'horas'], 0)),
      staff: Number(pick(r, ['total_staff', 'staff_participantes', 'cant_staff'], 0)),
    }));
  }, [horasFacultad]);

  const chartDemanda = useMemo(() => {
    return demandaTipo.map((r) => ({
      tipo: pick(r, ['nombre_tipo', 'tipo_actividad', 'tipo'], 'Tipo'),
      cupos: Number(pick(r, ['total_cupos_ofertados', 'total_cupos', 'cupos_maximos', 'cupos_ofrecidos'], 0)),
      ocupados: Number(
        pick(r, ['total_cupos_ocupados', 'total_postulaciones', 'cupos_ocupados', 'confirmados', 'postulaciones'], 0)
      ),
      espera: Number(
        pick(r, ['total_lista_espera', 'total_espera', 'lista_espera', 'en_espera', 'demanda_insatisfecha'], 0)
      ),
    }));
  }, [demandaTipo]);

  const kpiCards = useMemo(() => {
    const entries = Object.entries(kpis);
    if (entries.length === 0) return [];
    const icons = [Calendar, Clock, Users, TrendingUp, Award, Building2];
    const styles = [
      'from-white to-[#E6F7FD] border-sky-200/80 text-[#00A9E0]',
      'from-white to-[#D8F3E8] border-emerald-200/80 text-[#0F9D75]',
      'from-white to-[#DBEAFE] border-blue-200/80 text-[#1D4ED8]',
      'from-white to-[#FEF0C7] border-amber-200/80 text-[#D9941E]',
      'from-white to-[#EDE9FE] border-violet-200/80 text-[#6D4AFF]',
      'from-white to-[#FFE4E6] border-rose-200/80 text-[#E11D48]',
    ];
    return entries.map(([key, val], idx) => ({
      key,
      label: formatColLabel(key),
      value: formatCellValue(key, val),
      Icon: icons[idx % icons.length],
      style: styles[idx % styles.length],
    }));
  }, [kpis]);

  const rankCols = useMemo(() => {
    if (rankingStaff.length === 0) return [];
    return Object.keys(rankingStaff[0]).filter((k) => !k.startsWith('id_') && k !== 'foto_url');
  }, [rankingStaff]);

  const cobCols = useMemo(() => {
    if (cobertura.length === 0) return [];
    return Object.keys(cobertura[0]).filter(
      (k) => !k.startsWith('id_') && !COB_HIDDEN_COLS.has(k)
    );
  }, [cobertura]);

  return (
    <div className="space-y-6">
      {/* Encabezado y filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-[#0A1931] tracking-tight">
            Reportes Estratégicos UCM
          </h1>
          <p className="text-xs lg:text-sm text-slate-500">
            Métricas en tiempo real calculadas desde Oracle 21c (Desempeño Staff, Cobertura y Dashboard Ejecutivo).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931] shadow-2xs"
          >
            <option value="">Todo el año</option>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931] shadow-2xs"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadReports}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">
          Consultando paquetes analíticos PL/SQL...
        </div>
      ) : (
        <>
          {/* REPORTE 3A: KPIs EJECUTIVOS */}
          {kpiCards.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((card) => {
                const Icon = card.Icon;
                return (
                  <div
                    key={card.key}
                    className={`rounded-3xl p-5 bg-gradient-to-br ${card.style} border shadow-xs flex items-center justify-between gap-3`}
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">
                        {card.label}
                      </p>
                      <p className="text-2xl lg:text-3xl font-extrabold text-[#0A1931] mt-1">
                        {card.value}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REPORTE 3B + REPORTE 1B: TENDENCIA ANUAL Y HORAS POR FACULTAD */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <section className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#0A1931]">
                    Tendencia Mensual de Horas y Actividades ({anio})
                  </h2>
                  <p className="text-xs text-slate-500">Evolución acumulada mes a mes</p>
                </div>
                <BarChart3 className="w-5 h-5 text-[#00A9E0]" />
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartTendencia} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ucmHorasGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00A9E0" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00A9E0" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="horas"
                      name="Horas Validadas"
                      stroke="#00A9E0"
                      strokeWidth={2.5}
                      fill="url(#ucmHorasGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="actividades"
                      name="Actividades"
                      stroke="#15367A"
                      strokeWidth={2}
                      fillOpacity={0}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="xl:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-[#0A1931]">Horas Validadas por Facultad</h2>
                <p className="text-xs text-slate-500">Contribución estudiantil por unidad académica</p>
              </div>

              {chartFacultad.length === 0 ? (
                <div className="h-72 flex items-center justify-center text-xs text-slate-400">
                  Sin datos de horas validadas para el período seleccionado.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartFacultad} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="facultad" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="horas" name="Horas Validadas" radius={[10, 10, 0, 0]}>
                        {chartFacultad.map((_, idx) => (
                          <Cell key={idx} fill={UCM_COLORS[idx % UCM_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* REPORTE 2B: DEMANDA Y LISTA DE ESPERA POR TIPO */}
          <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-[#0A1931]">
                Cobertura y Demanda Insatisfecha por Tipo de Actividad ({anio})
              </h2>
              <p className="text-xs text-slate-500">
                Comparación entre cupos ofrecidos, confirmados y solicitudes derivadas a lista de espera
              </p>
            </div>

            {chartDemanda.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Sin registros para el año seleccionado.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDemanda} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="cupos" name="Cupos Ofrecidos" fill="#15367A" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="ocupados" name="Confirmados" fill="#00A9E0" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="espera" name="Lista de Espera" fill="#D9941E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* REPORTE 1A: RANKING DE STAFF */}
          <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0A1931]">
                  Ranking de Desempeño y Horas Staff
                </h2>
                <p className="text-xs text-slate-500">
                  Estudiantes ordenados por horas efectivas validadas
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#E6F7FD] text-[#007AA8] text-xs font-bold">
                {rankingStaff.length} registros
              </span>
            </div>

            {rankingStaff.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No hay registros de desempeño en este período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4F8FB] text-slate-600 border-b border-slate-200">
                      <th className="py-3 px-3 rounded-l-xl font-bold">#</th>
                      {rankCols.map((col, idx) => (
                        <th
                          key={col}
                          className={`py-3 px-3 font-bold ${idx === rankCols.length - 1 ? 'rounded-r-xl' : ''}`}
                        >
                          {formatColLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rankingStaff.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F7FAFD]">
                        <td className="py-3 px-3 font-extrabold text-[#00A9E0]">{rIdx + 1}</td>
                        {rankCols.map((col) => (
                          <td key={col} className="py-3 px-3 text-slate-700 font-medium">
                            {formatCellValue(col, row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* REPORTE 2A: RESUMEN DE ACTIVIDADES */}
          <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-[#0A1931]">
                  Resumen de Actividades
                </h2>
                <p className="text-xs text-slate-500">Estado de cupos y disponibilidad</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                {cobertura.length} actividades
              </span>
            </div>

            {cobertura.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Sin actividades en el período seleccionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F4F8FB] text-slate-600 border-b border-slate-200">
                      {cobCols.map((col, idx) => (
                        <th
                          key={col}
                          className={`py-3 px-3 font-bold ${idx === 0 ? 'rounded-l-xl' : ''}`}
                        >
                          {formatColLabel(col)}
                        </th>
                      ))}
                      <th className="py-3 px-3 rounded-r-xl font-bold text-right">
                        Disponibilidad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cobertura.map((row, rIdx) => {
                      const libres = Math.max(
                        Number(row.cupos_maximos || 0) - Number(row.cupos_ocupados || 0),
                        0
                      );
                      return (
                        <tr key={rIdx} className="hover:bg-[#F7FAFD]">
                          {cobCols.map((col) => (
                            <td key={col} className="py-3 px-3 text-slate-700 font-medium">
                              {formatCellValue(col, row[col])}
                            </td>
                          ))}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            {libres > 0 ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                {libres} {libres === 1 ? 'cupo libre' : 'cupos libres'}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold">
                                Llena
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}