import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Camera,
  CheckCircle2,
  Database,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  X,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import UcmLogo from '../components/UcmLogo';
import UserAvatar from '../components/UserAvatar';
import ReportesView from '../components/ReportesView';
import MantenedoresView from '../components/MantenedoresView';

function formatAudLabel(key) {
  const map = {
    id_auditoria: 'ID',
    tabla_afectada: 'Tabla',
    operacion: 'Operación',
    accion: 'Acción',
    id_registro: 'ID Reg.',
    detalle: 'Detalle',
    detalle_cambio: 'Detalle',
    descripcion: 'Detalle',
    usuario_bd: 'Usuario BD',
    usuario_ejecutor: 'Usuario',
    ejecutor_nombre: 'Ejecutor',
    fecha_evento: 'Fecha / Hora',
    fecha_auditoria: 'Fecha / Hora',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function SuperAdminPanel() {
  const { user, logout, updateUserPhoto } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('admins'); // 'admins' | 'auditoria' | 'reportes' | 'mantenedores'
  const [usuarios, setUsuarios] = useState([]);
  const [filtroRol, setFiltroRol] = useState('2'); // '2' = ADMIN, '' = Todos
  const [userSearch, setUserSearch] = useState('');

  const [auditoria, setAuditoria] = useState([]);
  const [audSearch, setAudSearch] = useState('');
  const [audLimite, setAudLimite] = useState(100);

  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [toast, setToast] = useState(null);

  const [showNewAdminModal, setShowNewAdminModal] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    rut: '',
    nombre: '',
    apellido: '',
    correo: '',
    password_inicial: 'Ucm2026!',
  });

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/auth/foto', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUserPhoto(res.data.foto_url);
      showToast('success', 'Foto de perfil actualizada.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo subir la imagen.'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usrRes, audRes] = await Promise.all([
        api.get('/gestores/usuarios'),
        api.get('/gestores/auditoria', { params: { limite: audLimite } }),
      ]);
      setUsuarios(usrRes.data || []);
      setAuditoria(audRes.data || []);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Error al cargar datos de Superadmin.'));
    } finally {
      setLoading(false);
    }
  }, [audLimite]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (filtroRol && String(u.id_rol) !== filtroRol) return false;
      if (!q) return true;
      return `${u.nombre} ${u.apellido} ${u.rut} ${u.correo} ${u.nombre_rol}`
        .toLowerCase()
        .includes(q);
    });
  }, [usuarios, filtroRol, userSearch]);

  const filteredAuditoria = useMemo(() => {
    const q = audSearch.trim().toLowerCase();
    if (!q) return auditoria;
    return auditoria.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [auditoria, audSearch]);

  const audCols = useMemo(() => {
    if (auditoria.length === 0) return [];
    return Object.keys(auditoria[0]);
  }, [auditoria]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreatingAdmin(true);
    try {
      const res = await api.post('/gestores/usuarios/admin', newAdmin);
      showToast('success', res.data.message);
      setShowNewAdminModal(false);
      setNewAdmin({ rut: '', nombre: '', apellido: '', correo: '', password_inicial: 'Ucm2026!' });
      await loadData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleToggleActivo = async (u) => {
    if (u.id_usuario === user.id_usuario) {
      showToast('error', 'No puedes desactivar tu propia cuenta Superadmin.');
      return;
    }
    const nextActivo = u.activo === 'S' ? 'N' : 'S';
    try {
      await api.patch(`/gestores/usuarios/${u.id_usuario}/activo`, { activo: nextActivo });
      showToast(
        'success',
        `${u.nombre} ${u.apellido} actualizado a ${nextActivo === 'S' ? 'Activo' : 'Inactivo'}.`
      );
      await loadData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.id_rol === 1 || u.id_usuario === user.id_usuario) {
      showToast('error', 'La cuenta SUPERADMIN no puede ser eliminada.');
      return;
    }

    const esAdmin = u.id_rol === 2;
    const msgConfirm = esAdmin
      ? `¿Eliminar permanentemente al administrador ${u.nombre} ${u.apellido} (${u.correo})?\n\nSi creó actividades, validaciones o Staff, sus registros se traspasarán automáticamente a otro Admin activo.`
      : `¿Eliminar permanentemente al Staff ${u.nombre} ${u.apellido} (${u.correo})?\n\nSe borrarán su perfil, postulaciones, lista de espera y registros de horas.`;

    if (!window.confirm(msgConfirm)) return;

    setDeletingUserId(u.id_usuario);
    try {
      const endpoint = esAdmin
        ? `/gestores/usuarios/${u.id_usuario}`
        : `/gestores/usuarios/staff/${u.id_usuario}`;
      const res = await api.delete(endpoint);
      showToast(
        'success',
        res.data?.message || `${esAdmin ? 'Administrador' : 'Staff'} eliminado correctamente.`
      );
      await loadData();
    } catch (err) {
      showToast(
        'error',
        getErrorMessage(err, `No se pudo eliminar al ${esAdmin ? 'administrador' : 'Staff'}.`)
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  const navItems = [
    { id: 'admins', label: 'Administradores', mobileLabel: 'Admins', icon: Users },
    { id: 'auditoria', label: 'Auditoría Global', mobileLabel: 'Auditoría', icon: Shield },
    { id: 'reportes', label: 'Reportes', mobileLabel: 'Reportes', icon: BarChart3 },
    { id: 'mantenedores', label: 'Mantenedores', mobileLabel: 'CRUD', icon: Database },
  ];

  const stats = useMemo(
    () => ({
      admins: usuarios.filter((u) => u.id_rol === 2).length,
      staff: usuarios.filter((u) => u.id_rol === 3).length,
      eventos: auditoria.length,
    }),
    [usuarios, auditoria]
  );

  return (
    <div className="min-h-screen flex bg-[#F1F6FA] text-[#0A1931] pb-20 lg:pb-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-[#0F9D75] text-white border-emerald-400/40'
                : 'bg-red-600 text-white border-red-400/40'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* SIDEBAR PC */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0A1931] text-white shrink-0 sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <UcmLogo variant="dark" size="sm" />
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00A9E0]/20 border border-[#00A9E0]/40 text-[#5CE1FF] text-[10px] font-extrabold uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            Superadmin
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-white text-[#0A1931] shadow-md'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#00A9E0]' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            type="button"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            title="Haz clic para cambiar tu foto de perfil"
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/10 transition text-left cursor-pointer"
          >
            <div className="relative shrink-0">
              <UserAvatar
                fotoUrl={user.foto_url}
                nombre={user.nombre}
                apellido={user.apellido}
                size="sm"
                className="border-2 border-white/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00A9E0] text-white flex items-center justify-center border border-[#0A1931]">
                <Camera className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user.nombre} {user.apellido}
              </div>
              <div className="text-[11px] text-sky-300/80 truncate">
                {uploadingPhoto ? 'Subiendo foto...' : 'Cambiar foto'}
              </div>
            </div>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-200 hover:text-red-200 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER MÓVIL */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-2xs">
          <UcmLogo variant="light" size="sm" />
          <div className="flex items-center gap-2">
            {activeTab === 'admins' && (
              <button
                onClick={() => setShowNewAdminModal(true)}
                className="px-3 py-1.5 rounded-full bg-[#00A9E0] text-white text-xs font-bold"
              >
                + Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full"
              title="Cambiar foto"
            >
              <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre} apellido={user.apellido} size="xs" />
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-5 lg:py-7">
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {/* Banner Superadmin */}
              <div className="rounded-3xl ucm-banner-gradient px-6 py-5 lg:px-8 lg:py-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
                    Control Global Superadmin
                  </h1>
                  <p className="text-xs lg:text-sm text-sky-100 mt-0.5">
                    Provisión jerárquica de Administradores UCM y supervisión de cuentas del sistema
                  </p>
                </div>
                <button
                  onClick={() => setShowNewAdminModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#0A1931] hover:bg-sky-50 text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4 text-[#00A9E0]" />
                  Crear Administrador
                </button>
              </div>

              {/* 3 KPIs rápidos */}
              <div className="grid grid-cols-3 gap-3 lg:gap-5">
                <div className="bg-white rounded-3xl p-4 lg:p-6 border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Administradores</div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-[#0A1931] mt-1">{stats.admins}</div>
                </div>
                <div className="bg-white rounded-3xl p-4 lg:p-6 border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Staff Total</div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-[#00A9E0] mt-1">{stats.staff}</div>
                </div>
                <div className="bg-white rounded-3xl p-4 lg:p-6 border border-slate-200/80 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Logs Auditoría</div>
                  <div className="text-2xl lg:text-3xl font-extrabold text-[#0F9D75] mt-1">{stats.eventos}</div>
                </div>
              </div>

              {/* Tabla de usuarios */}
              <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {[
                      { id: '2', label: 'Administradores' },
                      { id: '3', label: 'Staff' },
                      { id: '', label: 'Todos' },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => setFiltroRol(f.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                          filtroRol === f.id
                            ? 'bg-[#0A1931] text-white'
                            : 'bg-[#F4F8FB] text-slate-600 hover:text-[#0A1931]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por nombre, RUT o correo..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931]"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-xs text-slate-400">Cargando usuarios...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F4F8FB] text-slate-600 border-b border-slate-200">
                          <th className="py-3 px-3 rounded-l-xl font-bold">Usuario</th>
                          <th className="py-3 px-3 font-bold">RUT</th>
                          <th className="py-3 px-3 font-bold">Rol</th>
                          <th className="py-3 px-3 font-bold">1er Login</th>
                          <th className="py-3 px-3 rounded-r-xl font-bold text-right">Estado / Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => (
                          <tr key={u.id_usuario} className="hover:bg-[#F7FAFD]">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  fotoUrl={u.foto_url}
                                  nombre={u.nombre}
                                  apellido={u.apellido}
                                  size="xs"
                                />
                                <div>
                                  <div className="font-bold text-[#0A1931]">
                                    {u.nombre} {u.apellido}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{u.correo}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-700">{u.rut}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.nombre_rol === 'SUPERADMIN'
                                    ? 'bg-purple-100 text-purple-800'
                                    : u.nombre_rol === 'ADMIN'
                                      ? 'bg-[#E6F7FD] text-[#007AA8]'
                                      : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {u.nombre_rol}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {u.debe_cambiar_clave === 'S' ? 'Pendiente cambio clave' : 'Completado'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {u.id_rol === 1 ? (
                                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold">
                                  Protegido
                                </span>
                              ) : (
                                <div className="inline-flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActivo(u)}
                                    className={`px-3.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                                      u.activo === 'S'
                                        ? 'bg-[#0F9D75] hover:bg-[#0C8260] text-white'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                    }`}
                                  >
                                    {u.activo === 'S' ? 'Activo' : 'Inactivo'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingUserId === u.id_usuario}
                                    onClick={() => handleDeleteUser(u)}
                                    title={u.id_rol === 2 ? 'Eliminar administrador' : 'Eliminar Staff'}
                                    className="p-1.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB AUDITORÍA GLOBAL */}
          {activeTab === 'auditoria' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl lg:text-2xl font-extrabold text-[#0A1931]">
                    Auditoría Global de Base de Datos
                  </h1>
                  <p className="text-xs lg:text-sm text-slate-500">
                    Bitácora inmutable generada automáticamente por los triggers Oracle (`AUDITORIA_SISTEMA`).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={audLimite}
                    onChange={(e) => setAudLimite(Number(e.target.value))}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931]"
                  >
                    <option value={50}>Últimos 50</option>
                    <option value={100}>Últimos 100</option>
                    <option value={250}>Últimos 250</option>
                  </select>
                  <button
                    onClick={loadData}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00A9E0] text-white text-xs font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refrescar
                  </button>
                </div>
              </div>

              <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
                <div className="mb-4 relative max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={audSearch}
                    onChange={(e) => setAudSearch(e.target.value)}
                    placeholder="Buscar por tabla, operación o detalle..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931]"
                  />
                </div>

                {filteredAuditoria.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-400">
                    No hay eventos de auditoría que coincidan con el filtro.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F4F8FB] text-slate-600 border-b border-slate-200">
                          {audCols.map((col, idx) => (
                            <th
                              key={col}
                              className={`py-3 px-3 font-bold ${idx === 0 ? 'rounded-l-xl' : ''} ${
                                idx === audCols.length - 1 ? 'rounded-r-xl' : ''
                              }`}
                            >
                              {formatAudLabel(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditoria.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F7FAFD]">
                            {audCols.map((col) => {
                              const val = row[col];
                              if (col === 'operacion' || col === 'accion') {
                                const op = String(val || '').toUpperCase();
                                const badge =
                                  op.includes('INS')
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : op.includes('DEL')
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-sky-50 text-sky-700';
                                return (
                                  <td key={col} className="py-3 px-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                                      {op}
                                    </span>
                                  </td>
                                );
                              }
                              const text =
                                col.includes('fecha') && val
                                  ? String(val).replace('T', ' ').slice(0, 19)
                                  : val ?? '—';
                              return (
                                <td key={col} className="py-3 px-3 text-slate-700 font-medium">
                                  {text}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'reportes' && <ReportesView />}
          {activeTab === 'mantenedores' && <MantenedoresView isSuperadmin />}
        </main>
      </div>

      {/* MODAL CREAR ADMIN */}
      {showNewAdminModal && (
        <div
          onClick={() => setShowNewAdminModal(false)}
          className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-[#0A1931]">Nuevo Administrador UCM</h2>
                <p className="text-xs text-slate-500">Deberá actualizar su contraseña en el 1er acceso.</p>
              </div>
              <button
                onClick={() => setShowNewAdminModal(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">RUT</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.rut}
                    onChange={(e) => setNewAdmin({ ...newAdmin, rut: e.target.value })}
                    placeholder="17.111.222-3"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Correo UCM</label>
                  <input
                    type="email"
                    required
                    value={newAdmin.correo}
                    onChange={(e) => setNewAdmin({ ...newAdmin, correo: e.target.value })}
                    placeholder="nombre@ucm.cl"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.nombre}
                    onChange={(e) => setNewAdmin({ ...newAdmin, nombre: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={newAdmin.apellido}
                    onChange={(e) => setNewAdmin({ ...newAdmin, apellido: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña temporal</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={newAdmin.password_inicial}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password_inicial: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewAdminModal(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-6 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {creatingAdmin ? 'Creando...' : 'Crear Administrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR MÓVIL */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-[0_-4px_16px_-6px_rgba(10,25,49,0.08)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
                active ? 'text-[#00A9E0]' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}