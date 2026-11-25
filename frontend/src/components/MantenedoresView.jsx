import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/client';

const CATALOGS = [
  {
    key: 'facultades',
    label: '1. Facultades',
    idField: 'id_facultad',
    columns: [
      { key: 'id_facultad', label: 'ID' },
      { key: 'siglas', label: 'Siglas' },
      { key: 'nombre_facultad', label: 'Nombre Facultad' },
    ],
    fields: [
      { name: 'nombre_facultad', label: 'Nombre de la Facultad', type: 'text', required: true },
      { name: 'siglas', label: 'Siglas (ej. FCI)', type: 'text', required: true },
    ],
  },
  {
    key: 'carreras',
    label: '2. Carreras',
    idField: 'id_carrera',
    columns: [
      { key: 'id_carrera', label: 'ID' },
      { key: 'nombre_carrera', label: 'Carrera' },
      { key: 'nombre_facultad', label: 'Facultad' },
    ],
    fields: [
      { name: 'id_facultad', label: 'Facultad', type: 'select', source: 'facultades', valueKey: 'id_facultad', labelKey: 'nombre_facultad', required: true },
      { name: 'nombre_carrera', label: 'Nombre de la Carrera', type: 'text', required: true },
    ],
  },
  {
    key: 'regiones',
    label: '3. Regiones',
    idField: 'id_region',
    columns: [
      { key: 'id_region', label: 'ID' },
      { key: 'codigo_romano', label: 'Código' },
      { key: 'nombre_region', label: 'Región' },
    ],
    fields: [
      { name: 'nombre_region', label: 'Nombre de la Región', type: 'text', required: true },
      { name: 'codigo_romano', label: 'Código Romano (ej. VII)', type: 'text', required: true },
    ],
  },
  {
    key: 'ciudades',
    label: '4. Ciudades',
    idField: 'id_ciudad',
    columns: [
      { key: 'id_ciudad', label: 'ID' },
      { key: 'nombre_ciudad', label: 'Ciudad' },
      { key: 'nombre_region', label: 'Región' },
    ],
    fields: [
      { name: 'id_region', label: 'Región', type: 'select', source: 'regiones', valueKey: 'id_region', labelKey: 'nombre_region', required: true },
      { name: 'nombre_ciudad', label: 'Nombre de la Ciudad', type: 'text', required: true },
    ],
  },
  {
    key: 'ubicaciones',
    label: '5. Ubicaciones',
    idField: 'id_ubicacion',
    columns: [
      { key: 'id_ubicacion', label: 'ID' },
      { key: 'nombre_lugar', label: 'Lugar' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'nombre_ciudad', label: 'Ciudad' },
    ],
    fields: [
      { name: 'id_ciudad', label: 'Ciudad', type: 'select', source: 'ciudades', valueKey: 'id_ciudad', labelKey: 'nombre_ciudad', required: true },
      { name: 'nombre_lugar', label: 'Nombre del Lugar', type: 'text', required: true },
      { name: 'direccion', label: 'Dirección', type: 'text', required: true },
      { name: 'url_google_maps', label: 'URL Google Maps (opcional)', type: 'url', required: false },
    ],
  },
  {
    key: 'tipos-actividad',
    label: '6. Tipos Actividad',
    idField: 'id_tipo_actividad',
    columns: [
      { key: 'id_tipo_actividad', label: 'ID' },
      { key: 'nombre_tipo', label: 'Tipo' },
      { key: 'color_hex', label: 'Color', isColor: true },
    ],
    fields: [
      { name: 'nombre_tipo', label: 'Nombre del Tipo', type: 'text', required: true },
      { name: 'color_hex', label: 'Color Hexadecimal', type: 'color', defaultValue: '#00A9E0', required: true },
    ],
  },
  {
    key: 'estados-actividad',
    label: '7. Estados Actividad',
    idField: 'id_estado_actividad',
    columns: [
      { key: 'id_estado_actividad', label: 'ID' },
      { key: 'nombre_estado', label: 'Estado' },
      { key: 'descripcion', label: 'Descripción' },
    ],
    fields: [
      { name: 'nombre_estado', label: 'Nombre Estado', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción (opcional)', type: 'text', required: false },
    ],
  },
  {
    key: 'perfiles-staff',
    label: '8. Perfiles Staff',
    idField: 'id_usuario',
    columns: [
      { key: 'id_usuario', label: 'ID' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'apellido', label: 'Apellido' },
      { key: 'nombre_carrera', label: 'Carrera' },
      { key: 'generacion', label: 'Gen.' },
      { key: 'estado_disponibilidad', label: 'Estado' },
    ],
    fields: [
      { name: 'id_usuario', label: 'Usuario Staff', type: 'select', source: 'staff', valueKey: 'id_usuario', labelKey: 'full_name', required: true, createOnly: true },
      { name: 'id_carrera', label: 'Carrera', type: 'select', source: 'carreras', valueKey: 'id_carrera', labelKey: 'nombre_carrera', required: true },
      { name: 'generacion', label: 'Generación', type: 'number', defaultValue: 2025, required: true },
      { name: 'telefono', label: 'Teléfono', type: 'text', required: false },
      {
        name: 'estado_disponibilidad',
        label: 'Estado Disponibilidad',
        type: 'static-select',
        options: ['DISPONIBLE', 'OCUPADO', 'INACTIVO'],
        defaultValue: 'DISPONIBLE',
        required: true,
      },
    ],
  },
  {
    key: 'disponibilidad-staff',
    label: '9. Disponibilidad Staff',
    idField: 'id_disponibilidad',
    columns: [
      { key: 'id_disponibilidad', label: 'ID' },
      { key: 'nombre_staff', label: 'Staff' },
      { key: 'fecha_disponible', label: 'Fecha', isDate: true },
      { key: 'bloque_horario', label: 'Bloque' },
      { key: 'estado_disp', label: 'Estado' },
    ],
    fields: [
      { name: 'id_usuario', label: 'Estudiante Staff', type: 'select', source: 'staff', valueKey: 'id_usuario', labelKey: 'full_name', required: true, createOnly: true },
      { name: 'fecha_disponible', label: 'Fecha Disponible', type: 'date', defaultValue: '2026-11-30', required: true },
      {
        name: 'bloque_horario',
        label: 'Bloque Horario',
        type: 'static-select',
        options: ['MANANA', 'TARDE', 'COMPLETO'],
        defaultValue: 'MANANA',
        required: true,
      },
      {
        name: 'estado_disp',
        label: 'Estado',
        type: 'static-select',
        options: ['DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'],
        defaultValue: 'DISPONIBLE',
        required: true,
      },
    ],
  },
  {
    key: 'actividades',
    label: '10. Actividades',
    idField: 'id_actividad',
    adminOnlyWrite: true,
    columns: [
      { key: 'id_actividad', label: 'ID' },
      { key: 'titulo', label: 'Título' },
      { key: 'fecha_actividad', label: 'Fecha', isDate: true },
      { key: 'hora_inicio', label: 'Hora' },
      { key: 'cantidad_horas', label: 'Hrs' },
      { key: 'cupos_maximos', label: 'Cupos' },
      { key: 'horas_cierre_postulacion', label: 'Cierre (hrs antes)' },
    ],
    fields: [
      { name: 'titulo', label: 'Título', type: 'text', required: true },
      { name: 'descripcion', label: 'Descripción', type: 'text', required: false },
      { name: 'id_tipo_actividad', label: 'Tipo Actividad', type: 'select', source: 'tipos', valueKey: 'id_tipo_actividad', labelKey: 'nombre_tipo', required: true },
      { name: 'id_ubicacion', label: 'Ubicación', type: 'select', source: 'ubicaciones', valueKey: 'id_ubicacion', labelKey: 'nombre_lugar', required: true },
      { name: 'id_estado_actividad', label: 'Estado', type: 'select', source: 'estados', valueKey: 'id_estado_actividad', labelKey: 'nombre_estado', required: true },
      { name: 'fecha_actividad', label: 'Fecha Actividad', type: 'date', defaultValue: '2026-11-30', required: true },
      { name: 'hora_inicio', label: 'Hora Inicio (HH:MM)', type: 'time', defaultValue: '09:00', required: true },
      { name: 'cantidad_horas', label: 'Cantidad de Horas', type: 'number', step: '0.5', defaultValue: 4, required: true },
      { name: 'cupos_maximos', label: 'Cupos Máximos', type: 'number', defaultValue: 6, required: true },
      { name: 'horas_cierre_postulacion', label: 'Cierre Postulación (hrs antes del inicio)', type: 'number', step: '1', defaultValue: 10, required: true },
    ],
  },
];

export default function MantenedoresView({ isSuperadmin = false }) {
  const [selectedKey, setSelectedKey] = useState('facultades');
  const [rows, setRows] = useState([]);
  const [refs, setRefs] = useState({
    facultades: [],
    carreras: [],
    regiones: [],
    ciudades: [],
    ubicaciones: [],
    tipos: [],
    estados: [],
    staff: [],
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const catalog = useMemo(() => CATALOGS.find((c) => c.key === selectedKey) || CATALOGS[0], [selectedKey]);
  const readOnly = Boolean(catalog.adminOnlyWrite && isSuperadmin);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRefs = useCallback(async () => {
    try {
      const [fac, car, reg, ciu, ub, tip, est, stf] = await Promise.all([
        api.get('/mantenedores/facultades'),
        api.get('/mantenedores/carreras'),
        api.get('/mantenedores/regiones'),
        api.get('/mantenedores/ciudades'),
        api.get('/mantenedores/ubicaciones'),
        api.get('/mantenedores/tipos-actividad'),
        api.get('/mantenedores/estados-actividad'),
        api.get('/gestores/usuarios', { params: { id_rol: 3 } }),
      ]);
      setRefs({
        facultades: fac.data || [],
        carreras: car.data || [],
        regiones: reg.data || [],
        ciudades: ciu.data || [],
        ubicaciones: ub.data || [],
        tipos: tip.data || [],
        estados: est.data || [],
        staff: (stf.data || []).map((u) => ({
          ...u,
          full_name: `${u.nombre} ${u.apellido} (${u.rut})`,
        })),
      });
    } catch {
      // Mantiene referencias previas si alguna falla
    }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/mantenedores/${selectedKey}`);
      setRows(res.data || []);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo cargar el mantenedor.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedKey]);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    setSearch('');
    loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, search]);

  const openCreateModal = () => {
    const initial = {};
    catalog.fields.forEach((f) => {
      if (f.type === 'select') {
        const list = refs[f.source] || [];
        initial[f.name] = list.length > 0 ? String(list[0][f.valueKey]) : '';
      } else {
        initial[f.name] = f.defaultValue !== undefined ? String(f.defaultValue) : '';
      }
    });
    setEditingRow(null);
    setFormData(initial);
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    const initial = {};
    catalog.fields.forEach((f) => {
      let val = row[f.name];
      if (f.type === 'date' && val) val = String(val).slice(0, 10);
      if (f.type === 'time' && val) val = String(val).slice(0, 5);
      initial[f.name] = val !== null && val !== undefined ? String(val) : '';
    });
    setEditingRow(row);
    setFormData(initial);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {};
      catalog.fields.forEach((f) => {
        const raw = formData[f.name];
        if (f.type === 'select' || f.type === 'number') {
          payload[f.name] = raw === '' || raw === undefined ? null : Number(raw);
        } else if (f.type === 'time') {
          payload[f.name] = String(raw || '09:00').slice(0, 5);
        } else {
          payload[f.name] = raw === '' ? null : raw;
        }
      });

      if (editingRow) {
        const id = editingRow[catalog.idField];
        await api.put(`/mantenedores/${selectedKey}/${id}`, payload);
        showToast('success', 'Registro actualizado correctamente.');
      } else {
        await api.post(`/mantenedores/${selectedKey}`, payload);
        showToast('success', 'Registro creado correctamente.');
      }
      setModalOpen(false);
      await Promise.all([loadRows(), loadRefs()]);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo guardar el registro.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const id = row[catalog.idField];
    if (!window.confirm(`¿Eliminar el registro #${id} de ${catalog.label}?`)) return;
    try {
      await api.delete(`/mantenedores/${selectedKey}/${id}`);
      showToast('success', 'Registro eliminado correctamente.');
      await Promise.all([loadRows(), loadRefs()]);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo eliminar (puede tener registros asociados).'));
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-[#E7F7F2] border-emerald-200 text-[#0B7A5A]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-[#0A1931] tracking-tight">
            Mantenedores del Sistema
          </h1>
          <p className="text-xs lg:text-sm text-slate-500">
            Administración directa de tablas maestras conectadas a los 10 packages `pkg_mant_*` en Oracle 21c.
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#00A9E0]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo registro
          </button>
        )}
      </div>

      {/* Selector horizontal de los 10 Mantenedores */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {CATALOGS.map((c) => {
          const active = c.key === selectedKey;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedKey(c.key)}
              className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 border transition cursor-pointer ${
                active
                  ? 'bg-[#0A1931] text-white border-[#0A1931] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#00A9E0]'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {readOnly && (
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-medium">
          Vista de solo lectura para Superadmin: las actividades operativas se crean y editan con rol <strong>ADMIN</strong>.
        </div>
      )}

      {/* Tarjeta principal de tabla */}
      <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#00A9E0]" />
            <h2 className="text-base font-extrabold text-[#0A1931]">{catalog.label}</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#E6F7FD] text-[#007AA8] text-[11px] font-bold">
              {filteredRows.length}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar registros..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931] focus:outline-none focus:border-[#00A9E0]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Cargando registros desde Oracle...</div>
        ) : filteredRows.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No se encontraron registros en este catálogo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F8FB] text-slate-600 border-b border-slate-200">
                  {catalog.columns.map((col, idx) => (
                    <th
                      key={col.key}
                      className={`py-3 px-3 font-bold ${idx === 0 ? 'rounded-l-xl' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  {!readOnly && (
                    <th className="py-3 px-3 rounded-r-xl font-bold text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row[catalog.idField]} className="hover:bg-[#F7FAFD]">
                    {catalog.columns.map((col) => {
                      const val = row[col.key];
                      if (col.isColor) {
                        return (
                          <td key={col.key} className="py-3 px-3">
                            <span className="inline-flex items-center gap-2 font-mono font-bold text-slate-700">
                              <span
                                className="w-4 h-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: val || '#00A9E0' }}
                              />
                              {val}
                            </span>
                          </td>
                        );
                      }
                      const display = col.isDate && val ? String(val).slice(0, 10) : val ?? '—';
                      return (
                        <td key={col.key} className="py-3 px-3 text-slate-700 font-medium">
                          {display}
                        </td>
                      );
                    })}
                    {!readOnly && (
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#00A9E0] hover:bg-sky-50 transition cursor-pointer mr-1"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-[#0A1931]">
                {editingRow ? `Editar en ${catalog.label}` : `Nuevo registro en ${catalog.label}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-[#0A1931] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {catalog.fields.map((f) => {
                const disabled = Boolean(editingRow && f.createOnly);
                return (
                  <div key={f.name}>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        required={f.required}
                        disabled={disabled}
                        value={formData[f.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] disabled:bg-slate-100"
                      >
                        <option value="">Seleccionar...</option>
                        {(refs[f.source] || []).map((opt) => (
                          <option key={opt[f.valueKey]} value={opt[f.valueKey]}>
                            {opt[f.labelKey]}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'static-select' ? (
                      <select
                        required={f.required}
                        value={formData[f.name] || f.defaultValue}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
                      >
                        {f.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'color' ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData[f.name] || '#00A9E0'}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          required
                          pattern="^#[0-9A-Fa-f]{6}$"
                          value={formData[f.name] || '#00A9E0'}
                          onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm font-mono"
                        />
                      </div>
                    ) : (
                      <input
                        type={f.type}
                        step={f.step}
                        required={f.required}
                        disabled={disabled}
                        value={formData[f.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [f.name]: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] disabled:bg-slate-100"
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}