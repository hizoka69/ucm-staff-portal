import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  KeyRound,
  ListChecks,
  LogOut,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Store,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import api, { getErrorMessage, resolveAssetUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import UcmLogo from '../components/UcmLogo';
import UserAvatar from '../components/UserAvatar';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { getProcesoStyle } from '../utils/statusStyles';
import { compressImage } from '../utils/imageCompress';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FILTROS_TIPO = ['Todas', 'Feria', 'Charla', 'Visita'];

function parseIsoDate(raw) {
  if (!raw) return null;
  const part = String(raw).slice(0, 10);
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function formatFechaLarga(raw) {
  const p = parseIsoDate(raw);
  if (!p) return 'Por confirmar';
  return `${p.day} de ${MESES[p.month - 1]}, ${p.year}`;
}

function calcHoraFin(horaInicio, horas) {
  if (!horaInicio || !horaInicio.includes(':')) return '';
  const [hh, mm] = horaInicio.split(':').map(Number);
  const totalMin = hh * 60 + mm + Math.round((Number(horas) || 0) * 60);
  const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
  const endM = String(totalMin % 60).padStart(2, '0');
  return `${horaInicio} - ${endH}:${endM}`;
}

function formatFechaCierre(raw) {
  if (!raw) return null;
  const s = String(raw).replace('T', ' ').slice(0, 16);
  const [datePart, timePart] = s.split(' ');
  if (!datePart || !timePart) return s;
  const [, m, d] = datePart.split('-');
  if (!m || !d) return s;
  return `${d}/${m} ${timePart}`;
}

function normalizeSearchText(s = '') {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCategory(nombreTipo = '') {
  const t = nombreTipo.toLowerCase();
  if (t.includes('feria')) return 'Feria';
  if (t.includes('charla')) return 'Charla';
  if (t.includes('puertas') || t.includes('visita') || t.includes('inducci')) return 'Visita';
  return 'Feria';
}

function getTypeVisual(nombreTipo = '') {
  const cat = normalizeCategory(nombreTipo);
  if (cat === 'Charla') {
    return {
      cat: 'Charla',
      badgeLabel: 'CHARLA',
      Icon: MessageSquare,
      iconBox: 'bg-[#EEF4FF] text-[#1D4ED8] border-[#DBEAFE]',
      pill: 'bg-[#EEF4FF] text-[#1D4ED8] border-[#BFDBFE]',
      accentBar: 'bg-[#2563EB]',
    };
  }
  if (cat === 'Visita') {
    return {
      cat: 'Visita',
      badgeLabel: 'VISITA',
      Icon: Compass,
      iconBox: 'bg-[#E6F8F5] text-[#0F766E] border-[#CCFBF1]',
      pill: 'bg-[#E6F8F5] text-[#0F766E] border-[#99F6E4]',
      accentBar: 'bg-[#0F9D75]',
    };
  }
  return {
    cat: 'Feria',
    badgeLabel: 'FERIA',
    Icon: Store,
    iconBox: 'bg-[#E6F7FD] text-[#0086B8] border-[#BAE8FA]',
    pill: 'bg-[#E6F7FD] text-[#007AA8] border-[#BAE8FA]',
    accentBar: 'bg-[#00A9E0]',
  };
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function StaffPortal() {
  const { user, logout, updateUserPhoto } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('actividades');
  const [mes, setMes] = useState(11);
  const [anio, setAnio] = useState(2026);
  const [filtroTipo, setFiltroTipo] = useState('Todas');
  const [actSearch, setActSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [perfilSearch, setPerfilSearch] = useState('');
  const [perfilDayFilter, setPerfilDayFilter] = useState(null);
  const [perfilStatusFilter, setPerfilStatusFilter] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [actividades, setActividades] = useState([]);
  const [todasActividades, setTodasActividades] = useState([]);
  const [misPostulaciones, setMisPostulaciones] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [resumenMes, setResumenMes] = useState({ horas_totales: 0, total_asistencias: 0, detalle: [] });
  const [disponibilidades, setDisponibilidades] = useState([]);

  // Notificaciones desplegables en la campanita
  const notifKey = `ucm_read_notifs_${user.id_usuario}`;
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(notifKey) || '[]');
    } catch {
      return [];
    }
  });
  const notifDesktopRef = useRef(null);
  const notifMobileRef = useRef(null);

  const [selectedActId, setSelectedActId] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);

  const [dispFecha, setDispFecha] = useState('2026-11-29');
  const [dispBloque, setDispBloque] = useState('MANANA');
  const [savingDisp, setSavingDisp] = useState(false);

  // Modal de experiencia y fotos de recuerdo (hasta 5 fotos por postulación)
  const expPhotoInputRef = useRef(null);
  const [expModalPost, setExpModalPost] = useState(null);
  const [expComment, setExpComment] = useState('');
  const [expPhotos, setExpPhotos] = useState([]);
  const [expLoadingPhotos, setExpLoadingPhotos] = useState(false);
  const [expSavingComment, setExpSavingComment] = useState(false);
  const [expUploadingPhotos, setExpUploadingPhotos] = useState(false);
  const [expDeletingPhotoId, setExpDeletingPhotoId] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const optimized = await compressImage(file, { maxSide: 400, quality: 0.85 });
      const formData = new FormData();
      formData.append('file', optimized);
      const res = await api.post('/auth/foto', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUserPhoto(res.data.foto_url);
      showToast('success', 'Foto de perfil guardada permanentemente.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo subir la imagen.'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const openExpModal = async (post) => {
    setExpModalPost(post);
    setExpComment(post.comentario_experiencia || '');
    setExpPhotos([]);
    setExpLoadingPhotos(true);
    try {
      const res = await api.get(`/gestores/postulaciones/${post.id_postulacion}/fotos`);
      setExpPhotos(res.data || []);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudieron cargar las fotografías.'));
    } finally {
      setExpLoadingPhotos(false);
    }
  };

  const handleSaveExperiencia = async (e) => {
    e.preventDefault();
    if (!expModalPost) return;
    setExpSavingComment(true);
    try {
      const texto = expComment.trim() || null;
      await api.put(`/gestores/postulaciones/${expModalPost.id_postulacion}/experiencia`, {
        comentario: texto,
      });
      setExpModalPost((prev) => (prev ? { ...prev, comentario_experiencia: texto } : null));
      setMisPostulaciones((prev) =>
        prev.map((item) =>
          item.id_postulacion === expModalPost.id_postulacion
            ? { ...item, comentario_experiencia: texto }
            : item
        )
      );
      showToast('success', 'Experiencia guardada correctamente.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo guardar tu experiencia.'));
    } finally {
      setExpSavingComment(false);
    }
  };

  const handleUploadExpPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length || !expModalPost) return;

    const disponibles = Math.max(5 - expPhotos.length, 0);
    if (disponibles === 0) {
      showToast('error', 'Ya alcanzaste el máximo de 5 fotografías en esta actividad.');
      return;
    }

    const toUpload = files.slice(0, disponibles);
    if (files.length > disponibles) {
      showToast('error', `Solo quedaban ${disponibles} cupo(s) de foto; se subirán las primeras ${disponibles}.`);
    }

    setExpUploadingPhotos(true);
    let subidas = 0;
    try {
      for (const rawFile of toUpload) {
        const optimized = await compressImage(rawFile, { maxSide: 1600, quality: 0.85 });
        const fd = new FormData();
        fd.append('file', optimized);
        const res = await api.post(`/gestores/postulaciones/${expModalPost.id_postulacion}/fotos`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setExpPhotos((prev) => [...prev, res.data]);
        subidas += 1;
      }
      if (subidas > 0) {
        setMisPostulaciones((prev) =>
          prev.map((item) =>
            item.id_postulacion === expModalPost.id_postulacion
              ? { ...item, total_fotos: Number(item.total_fotos || 0) + subidas }
              : item
          )
        );
        showToast(
          'success',
          subidas === 1 ? 'Fotografía subida correctamente.' : `${subidas} fotografías subidas correctamente.`
        );
      }
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Error al subir fotografía.'));
    } finally {
      setExpUploadingPhotos(false);
    }
  };

  const handleDeleteExpPhoto = async (idFoto) => {
    if (!expModalPost) return;
    setExpDeletingPhotoId(idFoto);
    try {
      await api.delete(`/gestores/postulaciones/fotos/${idFoto}`);
      setExpPhotos((prev) => prev.filter((f) => f.id_foto !== idFoto));
      setMisPostulaciones((prev) =>
        prev.map((item) =>
          item.id_postulacion === expModalPost.id_postulacion
            ? { ...item, total_fotos: Math.max(Number(item.total_fotos || 1) - 1, 0) }
            : item
        )
      );
      showToast('success', 'Fotografía eliminada.');
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo eliminar la fotografía.'));
    } finally {
      setExpDeletingPhotoId(null);
    }
  };

  const loadCoreData = useCallback(async () => {
    setLoading(true);
    try {
      const [actRes, allActRes, postRes, perfRes, dispRes] = await Promise.all([
        api.get('/gestores/actividades/calendario', { params: { mes, anio } }),
        api.get('/gestores/actividades/calendario'),
        api.get('/gestores/postulaciones/mis-postulaciones'),
        api.get(`/mantenedores/perfiles-staff/${user.id_usuario}`).catch(() => ({ data: null })),
        api.get('/mantenedores/disponibilidad-staff'),
      ]);
      const list = actRes.data || [];
      const allList = allActRes.data || [];
      setActividades(list);
      setTodasActividades(allList);
      setMisPostulaciones(postRes.data || []);
      if (perfRes.data) setPerfil(perfRes.data);
      setDisponibilidades(dispRes.data || []);

      setSelectedActId((prev) => {
        if (prev && (list.some((a) => a.id_actividad === prev) || allList.some((a) => a.id_actividad === prev))) {
          return prev;
        }
        return list.length > 0 ? list[0].id_actividad : null;
      });
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudieron cargar las actividades.'));
    } finally {
      setLoading(false);
    }
  }, [mes, anio, user.id_usuario]);

  const loadResumenMes = useCallback(async () => {
    try {
      const res = await api.get('/gestores/trabajo/resumen-mensual', { params: { mes, anio } });
      setResumenMes(res.data || { horas_totales: 0, total_asistencias: 0, detalle: [] });
    } catch {
      setResumenMes({ horas_totales: 0, total_asistencias: 0, detalle: [] });
    }
  }, [mes, anio]);

  useEffect(() => {
    loadCoreData();
    loadResumenMes();
  }, [loadCoreData, loadResumenMes]);

  // Cierra el desplegable de notificaciones al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!notifOpen) return undefined;
    const handleClickOutside = (e) => {
      const insideDesktop = notifDesktopRef.current?.contains(e.target);
      const insideMobile = notifMobileRef.current?.contains(e.target);
      if (!insideDesktop && !insideMobile) {
        setNotifOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [notifOpen]);

  const filteredActividades = useMemo(() => {
    const q = normalizeSearchText(actSearch);
    const base = q ? todasActividades : actividades;
    return base.filter((a) => {
      if (filtroTipo !== 'Todas' && normalizeCategory(a.nombre_tipo) !== filtroTipo) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${a.titulo} ${a.descripcion || ''} ${a.nombre_lugar} ${a.nombre_ciudad} ${a.nombre_tipo} ${a.fecha_actividad}`
      ).includes(q);
    });
  }, [actividades, todasActividades, filtroTipo, actSearch]);

  const selectedAct = useMemo(
    () =>
      todasActividades.find((a) => a.id_actividad === selectedActId) ||
      actividades.find((a) => a.id_actividad === selectedActId) ||
      filteredActividades[0] ||
      null,
    [todasActividades, actividades, selectedActId, filteredActividades]
  );

  const filteredMisPostulaciones = useMemo(() => {
    const q = normalizeSearchText(postSearch);
    if (!q) return misPostulaciones;
    return misPostulaciones.filter((p) =>
      normalizeSearchText(
        `${p.titulo} ${p.nombre_lugar} ${p.nombre_ciudad} ${p.nombre_tipo} ${p.estado_postulacion} ${p.fecha_actividad} ${
          p.asistio === 'S' ? 'validada asistio' : p.asistio === 'N' ? 'inasistencia' : ''
        }`
      ).includes(q)
    );
  }, [misPostulaciones, postSearch]);

  // Notificaciones reales derivadas de Oracle (asignaciones, validaciones y actividades nuevas abiertas)
  const notifications = useMemo(() => {
    const list = [];

    // 1. Actividades donde fuiste asignado (por Admin o promovido desde Lista de Espera)
    misPostulaciones.forEach((p) => {
      if (p.estado_postulacion === 'ASIGNADA' && !p.asistio) {
        list.push({
          id: `asignada-${p.id_postulacion}`,
          tipo: 'ASIGNADA',
          titulo: `Fuiste seleccionado para ${p.titulo}`,
          subtitulo: `${formatFechaLarga(p.fecha_actividad)} · ${p.hora_inicio} · ${p.nombre_lugar}`,
          actionLabel: 'Ver actividad asignada',
          idActividad: p.id_actividad,
          fechaActividad: p.fecha_actividad,
          targetTab: 'actividades',
        });
      }
    });

    // 2. Nuevas actividades publicadas abiertas para postular (en cualquier mes)
    todasActividades.forEach((a) => {
      const yaInscrito =
        a.mi_estado_postulacion === 'CONFIRMADA' || a.mi_estado_postulacion === 'ASIGNADA';
      const enEspera = a.mi_estado_espera === 'PENDIENTE';
      if (!yaInscrito && !enEspera && a.postulacion_cerrada !== 'S') {
        const isFull = a.cupos_disponibles <= 0;
        list.push({
          id: `nueva-act-${a.id_actividad}`,
          tipo: isFull ? 'PENDIENTE' : 'CONFIRMADA',
          badgeText: isFull ? 'Lista de espera' : 'Nueva actividad',
          titulo: isFull
            ? `Cupos llenos (lista de espera): ${a.titulo}`
            : `Nueva actividad disponible: ${a.titulo}`,
          subtitulo: `${formatFechaLarga(a.fecha_actividad)} · ${a.hora_inicio} · ${
            isFull ? 'Unirse a espera' : `${a.cupos_disponibles} cupo(s)`
          }`,
          actionLabel: 'Ver detalle y postular',
          idActividad: a.id_actividad,
          fechaActividad: a.fecha_actividad,
          targetTab: 'actividades',
        });
      }
    });

    // 3. Turnos confirmados próximos sin validar aún
    misPostulaciones.forEach((p) => {
      if (p.estado_postulacion === 'CONFIRMADA' && !p.asistio && p.nombre_estado !== 'FINALIZADA') {
        list.push({
          id: `confirmada-${p.id_postulacion}`,
          tipo: 'CONFIRMADA',
          badgeText: 'Confirmada',
          titulo: `Turno confirmado: ${p.titulo}`,
          subtitulo: `${formatFechaLarga(p.fecha_actividad)} · ${p.hora_inicio} · ${p.nombre_lugar}`,
          actionLabel: 'Ver actividad',
          idActividad: p.id_actividad,
          fechaActividad: p.fecha_actividad,
          targetTab: 'actividades',
        });
      }
    });

    // 4. Últimas validaciones de asistencia / horas
    misPostulaciones
      .filter((p) => p.asistio === 'S' || p.asistio === 'N')
      .slice(0, 4)
      .forEach((p) => {
        list.push({
          id: `validada-${p.id_postulacion}-${p.asistio}`,
          tipo: p.asistio === 'S' ? 'VALIDADA' : 'INASISTENCIA',
          badgeText: p.asistio === 'S' ? `Validada · ${p.horas_efectivas}h` : 'Inasistencia',
          titulo:
            p.asistio === 'S'
              ? `Asistencia validada en ${p.titulo}`
              : `Inasistencia registrada en ${p.titulo}`,
          subtitulo: `${formatFechaLarga(p.fecha_actividad)} · ${p.nombre_lugar}`,
          actionLabel: 'Ver en Mis Postulaciones',
          idActividad: p.id_actividad,
          fechaActividad: p.fecha_actividad,
          targetTab: 'calendario',
        });
      });

    return list;
  }, [todasActividades, misPostulaciones]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readNotifIds.includes(n.id)).length,
    [notifications, readNotifIds]
  );

  const markNotifRead = (id) => {
    setReadNotifIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(notifKey, JSON.stringify(next));
      return next;
    });
  };

  const markAllNotifsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem(notifKey, JSON.stringify(allIds));
  };

  const handleNotificationClick = (notif) => {
    markNotifRead(notif.id);
    setNotifOpen(false);

    if (notif.targetTab === 'actividades') {
      const existsInPublished = todasActividades.some((a) => a.id_actividad === notif.idActividad);
      if (existsInPublished) {
        const parsed = parseIsoDate(notif.fechaActividad);
        if (parsed) {
          setMes(parsed.month);
          setAnio(parsed.year);
        }
        setFiltroTipo('Todas');
        setActSearch('');
        setActiveTab('actividades');
        setSelectedActId(notif.idActividad);
        if (window.innerWidth < 1024) {
          setMobileDetailOpen(true);
        }
        return;
      }
    }

    // Si la actividad ya no está en el feed publicado (ej. finalizada), lleva directo a Mis Postulaciones
    setPostSearch('');
    setActiveTab('calendario');
  };

  const handlePostular = async (actividad) => {
    setSubmittingId(actividad.id_actividad);
    try {
      const res = await api.post('/gestores/postulaciones/postular', {
        id_actividad: actividad.id_actividad,
      });
      showToast('success', res.data.message);
      await loadCoreData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancelarPostulacion = async (idPostulacion) => {
    try {
      const res = await api.patch(`/gestores/postulaciones/${idPostulacion}/cancelar`);
      showToast('success', res.data.message);
      await loadCoreData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleCrearDisponibilidad = async (e) => {
    e.preventDefault();
    setSavingDisp(true);
    try {
      await api.post('/mantenedores/disponibilidad-staff', {
        fecha_disponible: dispFecha,
        bloque_horario: dispBloque,
        estado_disp: 'DISPONIBLE',
      });
      showToast('success', 'Disponibilidad agregada correctamente.');
      const res = await api.get('/mantenedores/disponibilidad-staff');
      setDisponibilidades(res.data || []);
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSavingDisp(false);
    }
  };

  const handleEliminarDisponibilidad = async (idDisp) => {
    try {
      await api.delete(`/mantenedores/disponibilidad-staff/${idDisp}`);
      setDisponibilidades((prev) => prev.filter((d) => d.id_disponibilidad !== idDisp));
      showToast('success', 'Disponibilidad eliminada.');
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const changeMonth = (delta) => {
    let nextM = mes + delta;
    let nextY = anio;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    } else if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setMes(nextM);
    setAnio(nextY);
    setPerfilDayFilter(null);
  };

  const todayInfo = useMemo(() => {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() };
  }, []);

  const perfilAllMonthActivities = useMemo(() => {
    const seen = new Set();
    const rows = [];
    (resumenMes.detalle || []).forEach((d) => {
      seen.add(d.id_actividad);
      const parsed = parseIsoDate(d.fecha_actividad);
      rows.push({
        id: `reg-${d.id_registro}`,
        idActividad: d.id_actividad,
        titulo: d.titulo,
        horas: d.horas_efectivas,
        horaInicio: d.hora_inicio || '',
        lugar: d.nombre_lugar || '',
        ciudad: d.nombre_ciudad || '',
        estado: d.asistio === 'S' ? 'Validada' : 'Inasistencia',
        procesoKey: d.asistio === 'S' ? 'VALIDADA' : 'INASISTENCIA',
        completed: d.asistio === 'S',
        fecha: d.fecha_actividad,
        day: parsed?.day || null,
      });
    });
    misPostulaciones.forEach((p) => {
      const parsed = parseIsoDate(p.fecha_actividad);
      if (
        parsed &&
        parsed.month === mes &&
        parsed.year === anio &&
        ['CONFIRMADA', 'ASIGNADA'].includes(p.estado_postulacion) &&
        !seen.has(p.id_actividad)
      ) {
        rows.push({
          id: `post-${p.id_postulacion}`,
          idActividad: p.id_actividad,
          titulo: p.titulo,
          horas: p.cantidad_horas,
          horaInicio: p.hora_inicio || '',
          lugar: p.nombre_lugar || '',
          ciudad: p.nombre_ciudad || '',
          estado: p.estado_postulacion === 'ASIGNADA' ? 'Asignada' : 'Confirmada',
          procesoKey: p.estado_postulacion,
          completed: false,
          fecha: p.fecha_actividad,
          day: parsed.day,
        });
      }
    });
    return rows.sort((a, b) => (a.day || 0) - (b.day || 0));
  }, [resumenMes, misPostulaciones, mes, anio]);

  const monthDaysMap = useMemo(() => {
    const map = {};
    perfilAllMonthActivities.forEach((item) => {
      if (item.day && !map[item.day]) {
        map[item.day] = item.procesoKey;
      }
    });
    return map;
  }, [perfilAllMonthActivities]);

  const monthDayTitlesMap = useMemo(() => {
    const map = {};
    perfilAllMonthActivities.forEach((item) => {
      if (!item.day) return;
      if (!map[item.day]) map[item.day] = [];
      map[item.day].push(`${item.titulo} (${item.estado})`);
    });
    return map;
  }, [perfilAllMonthActivities]);

  const perfilMonthActivities = useMemo(() => {
    const q = normalizeSearchText(perfilSearch);
    return perfilAllMonthActivities.filter((r) => {
      if (perfilDayFilter && r.day !== perfilDayFilter) return false;
      if (perfilStatusFilter && r.procesoKey !== perfilStatusFilter) return false;
      if (!q) return true;
      return normalizeSearchText(
        `${r.titulo} ${r.estado} ${r.lugar} ${r.ciudad} ${r.fecha}`
      ).includes(q);
    });
  }, [perfilAllMonthActivities, perfilDayFilter, perfilStatusFilter, perfilSearch]);

  const proximosTurnosCount = useMemo(
    () =>
      misPostulaciones.filter(
        (p) =>
          ['CONFIRMADA', 'ASIGNADA'].includes(p.estado_postulacion) &&
          !p.asistio &&
          p.nombre_estado !== 'FINALIZADA'
      ).length,
    [misPostulaciones]
  );

  const handleOpenPerfilActivity = (item) => {
    const existsInPublished = todasActividades.some((a) => a.id_actividad === item.idActividad);
    if (existsInPublished) {
      setFiltroTipo('Todas');
      setActSearch('');
      setActiveTab('actividades');
      setSelectedActId(item.idActividad);
      if (window.innerWidth < 1024) {
        setMobileDetailOpen(true);
      }
      return;
    }
    setPostSearch(item.titulo || '');
    setActiveTab('calendario');
  };

  const monthCells = useMemo(() => buildMonthGrid(anio, mes), [anio, mes]);

  const renderPostularStatus = (act) => {
    if (act.mi_estado_postulacion === 'ASIGNADA') {
      return {
        label: 'Asignado',
        disabled: true,
        style: getProcesoStyle('ASIGNADA').badge,
      };
    }
    if (act.mi_estado_postulacion === 'CONFIRMADA') {
      return {
        label: 'Confirmado',
        disabled: true,
        style: getProcesoStyle('CONFIRMADA').badge,
      };
    }
    if (act.mi_estado_espera === 'PENDIENTE') {
      return {
        label: 'En lista de espera',
        disabled: true,
        style: getProcesoStyle('PENDIENTE').badge,
      };
    }
    if (act.postulacion_cerrada === 'S') {
      return {
        label: 'Postulación cerrada',
        disabled: true,
        isClosed: true,
        style: getProcesoStyle('CERRADA').badge,
      };
    }
    const isFull = act.cupos_disponibles <= 0;
    return {
      label: isFull ? 'Lista de espera' : 'Postular',
      disabled: false,
      isFull,
      style: isFull
        ? 'bg-[#FEF7E6] hover:bg-[#FCECC5] border border-[#F5D68E] text-[#9A6700] shadow-2xs'
        : 'bg-[#00A9E0] hover:bg-[#0092C4] text-white shadow-sm shadow-[#00A9E0]/25',
    };
  };

  const renderNotifDropdown = () => (
    <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden text-left">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-[#F8FBFD]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#0A1931]">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#E6F5FC] text-[#0369A1] text-[10px] font-bold">
              {unreadCount} nueva(s)
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllNotifsRead}
            title="Marcar todas como leídas"
            className="p-1.5 rounded-lg text-[#00A9E0] hover:bg-[#E6F5FC] transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-10 px-4 text-center text-xs text-slate-400">
            No tienes notificaciones pendientes por ahora.
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !readNotifIds.includes(n.id);
            const pStyle = getProcesoStyle(n.tipo);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-[#F4F8FB] transition cursor-pointer flex items-start gap-3 ${
                  isUnread ? 'bg-[#F8FCFF]' : 'bg-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isUnread ? pStyle.dot : 'bg-slate-200'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pStyle.badge}`}>
                      {n.badgeText || pStyle.label}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#0A1931] leading-snug">{n.titulo}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{n.subtitulo}</p>
                  <span className="inline-block mt-1.5 text-[11px] font-semibold text-[#0092C4]">
                    {n.actionLabel} →
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setNotifOpen(false);
          setActiveTab('calendario');
        }}
        className="w-full py-2.5 text-center text-xs font-bold text-[#0086B8] hover:bg-[#F4F8FB] border-t border-slate-100 transition cursor-pointer"
      >
        Ver todo
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-20 lg:pb-0 bg-[#F4F8FB] text-[#0A1931]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* ===================================================================== */}
      {/* TOAST FLOTANTE                                                        */}
      {/* ===================================================================== */}
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

      {/* ===================================================================== */}
      {/* NAVBAR SUPERIOR PC — Blanco limpio con logo oficial UCM a color       */}
      {/* ===================================================================== */}
      <header className="hidden lg:flex items-center justify-between px-8 h-[72px] sticky top-0 z-30 bg-white border-b border-slate-200/90 shadow-[0_2px_12px_-6px_rgba(10,25,49,0.08)]">
        <div className="flex items-center gap-7">
          <button
            onClick={() => setActiveTab('actividades')}
            className="flex items-center gap-3.5 cursor-pointer"
          >
            <UcmLogo variant="light" size="sm" />
            <span className="h-6 w-px bg-slate-200" />
            <span className="text-sm font-bold text-[#0A1931] tracking-tight">
              Portal Staff
            </span>
          </button>

          <nav className="flex items-center gap-1 ml-2">
            {[
              { id: 'actividades', label: 'Actividades' },
              { id: 'calendario', label: 'Calendario' },
              { id: 'perfil', label: 'Mi Perfil' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                    active ? 'text-[#0086B8]' : 'text-slate-500 hover:text-[#0A1931]'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[21px] h-[3px] rounded-t-full bg-[#00A9E0]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'actividades' && (
            <>
              <div className="flex items-center gap-1 bg-[#F4F8FB] border border-slate-200 rounded-xl px-2 py-1 text-sm text-[#0A1931]">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 cursor-pointer transition"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold min-w-[125px] text-center text-xs">
                  {MESES[mes - 1]} {anio}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1 rounded-lg hover:bg-white text-slate-600 cursor-pointer transition"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-[#F4F8FB] p-1 rounded-full border border-slate-200">
                {FILTROS_TIPO.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroTipo(f)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                      filtroTipo === f
                        ? 'bg-[#00A9E0] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#0A1931]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="relative" ref={notifDesktopRef}>
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative p-2 rounded-xl transition cursor-pointer ${
                  notifOpen
                    ? 'bg-[#E6F5FC] text-[#0369A1]'
                    : 'text-slate-500 hover:text-[#00A9E0] hover:bg-sky-50'
                }`}
                title="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00A9E0] text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && renderNotifDropdown()}
            </div>
            <button
              onClick={() => setActiveTab('perfil')}
              title={`${user.nombre} ${user.apellido}`}
              className="rounded-full cursor-pointer"
            >
              <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre} apellido={user.apellido} size="sm" />
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* CABECERA MÓVIL FIJA — Blanca con logo oficial UCM a color             */}
      {/* ===================================================================== */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200/90 px-4 h-16 flex items-center justify-between shadow-2xs">
        <UcmLogo variant="light" size="sm" />
        <div className="flex items-center gap-2">
          <div className="relative" ref={notifMobileRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className={`relative p-2 rounded-xl border transition ${
                notifOpen
                  ? 'bg-[#E6F5FC] text-[#0369A1] border-[#A8DDF5]'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-[#00A9E0] text-white text-[9px] font-extrabold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && renderNotifDropdown()}
          </div>
          <button
            onClick={() => setActiveTab('perfil')}
            title={`${user.nombre} ${user.apellido}`}
            className="rounded-full"
          >
            <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre} apellido={user.apellido} size="xs" />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* VISTA 1: ACTIVIDADES (Blanco limpio + celeste UCM — PC y Celular)     */}
      {/* ===================================================================== */}
      {activeTab === 'actividades' && (
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 lg:px-8 py-5 lg:py-8">
          {/* Encabezado y filtros MÓVIL */}
          <div className="lg:hidden mb-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#00A9E0]">
                  Portal Staff UCM
                </p>
                <h1 className="text-xl font-extrabold text-[#0A1931] truncate">
                  Actividades · {MESES[mes - 1]}
                </h1>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-200 rounded-xl p-1">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg text-slate-600 active:bg-slate-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-[#0A1931] px-1">{anio}</span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg text-slate-600 active:bg-slate-100"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {FILTROS_TIPO.map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroTipo(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 border transition ${
                    filtroTipo === f
                      ? 'bg-[#00A9E0] border-[#00A9E0] text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Buscador global de actividades (PC y Móvil) */}
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={actSearch}
                onChange={(e) => setActSearch(e.target.value)}
                placeholder="Buscar actividad en cualquier mes por título, lugar o tipo..."
                className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm text-[#0A1931] placeholder:text-slate-400 focus:outline-none focus:border-[#00A9E0] transition shadow-2xs"
              />
              {actSearch && (
                <button
                  type="button"
                  onClick={() => setActSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {actSearch.trim() && (
              <span className="text-xs font-semibold text-slate-500">
                Mostrando {filteredActividades.length} resultado(s) en todos los meses
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Cargando actividades desde Oracle 21c...
            </div>
          ) : filteredActividades.length === 0 ? (
            <div className="py-16 px-6 rounded-3xl bg-white border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
              <Calendar className="w-10 h-10 text-[#00A9E0] mx-auto mb-3" />
              <h2 className="text-lg font-bold text-[#0A1931]">
                Sin actividades publicadas en {MESES[mes - 1]} {anio}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Usa las flechas de mes para explorar Noviembre o Diciembre 2026.
              </p>
              <button
                onClick={() => {
                  setMes(11);
                  setAnio(2026);
                  setFiltroTipo('Todas');
                }}
                className="mt-4 px-5 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-semibold cursor-pointer transition"
              >
                Ir a Noviembre 2026
              </button>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* TARJETAS MÓVIL */}
              <div className="lg:hidden w-full space-y-3.5">
                {filteredActividades.map((act) => {
                  const vis = getTypeVisual(act.nombre_tipo);
                  const isFull = act.cupos_disponibles <= 0;
                  const isClosed = act.postulacion_cerrada === 'S';
                  return (
                    <div
                      key={act.id_actividad}
                      onClick={() => {
                        setSelectedActId(act.id_actividad);
                        setMobileDetailOpen(true);
                      }}
                      className="relative rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden active:scale-[0.99] transition cursor-pointer"
                    >
                      <div className={`h-1.5 w-full ${isClosed ? 'bg-slate-300' : isFull ? 'bg-amber-400' : vis.accentBar}`} />
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${vis.pill}`}
                          >
                            {vis.badgeLabel} · {act.cantidad_horas}h
                          </span>
                          {act.mi_estado_postulacion === 'ASIGNADA' ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getProcesoStyle('ASIGNADA').badge}`}>
                              Asignado
                            </span>
                          ) : act.mi_estado_postulacion === 'CONFIRMADA' ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getProcesoStyle('CONFIRMADA').badge}`}>
                              Confirmado
                            </span>
                          ) : act.mi_estado_espera === 'PENDIENTE' ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getProcesoStyle('PENDIENTE').badge}`}>
                              En espera
                            </span>
                          ) : isClosed ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getProcesoStyle('CERRADA').badge}`}>
                              Cerrada
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400">
                              {formatFechaLarga(act.fecha_actividad)}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-extrabold text-[#0A1931] leading-snug pr-8">
                          {act.titulo}
                        </h3>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          {isClosed ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                              Postulación cerrada ({formatFechaCierre(act.fecha_cierre_postulacion)})
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                              Cupos llenos · Lista de espera
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 font-medium truncate flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#00A9E0] shrink-0" />
                              <span className="truncate">
                                {act.nombre_lugar} · {act.cupos_disponibles} cupos
                              </span>
                            </span>
                          )}
                          <div className="w-7 h-7 rounded-full bg-[#F4F8FB] border border-slate-200 flex items-center justify-center shrink-0 text-[#00A9E0]">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GRILLA DE TARJETAS PC */}
              <div className="hidden lg:grid flex-1 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
                {filteredActividades.map((act) => {
                  const vis = getTypeVisual(act.nombre_tipo);
                  const Icon = vis.Icon;
                  const isFull = act.cupos_disponibles <= 0;
                  const isSelected = selectedAct?.id_actividad === act.id_actividad;
                  const pct = Math.min(100, Math.round((act.cupos_ocupados / act.cupos_maximos) * 100));
                  const btn = renderPostularStatus(act);

                  return (
                    <div
                      key={act.id_actividad}
                      onClick={() => setSelectedActId(act.id_actividad)}
                      className={`rounded-3xl bg-white transition-all cursor-pointer flex flex-col justify-between overflow-hidden border ${
                        isSelected
                          ? isFull
                            ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                            : 'border-[#00A9E0] ring-2 ring-[#00A9E0]/20 shadow-md'
                          : 'border-slate-200/90 hover:border-[#00A9E0]/60 shadow-xs hover:shadow-md'
                      }`}
                    >
                      <div className={`h-1.5 w-full ${isFull ? 'bg-amber-400' : 'bg-[#00A9E0]'}`} />

                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start gap-3.5 mb-4">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                                isFull
                                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                                  : vis.iconBox
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-base font-bold text-[#0A1931] leading-snug line-clamp-2">
                                {act.titulo}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {formatFechaLarga(act.fecha_actividad)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2 truncate">
                              <MapPin className="w-3.5 h-3.5 text-[#00A9E0] shrink-0" />
                              <span className="truncate">
                                {act.nombre_lugar}, {act.nombre_ciudad}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#00A9E0] shrink-0" />
                              <span>
                                {act.cantidad_horas} hrs ({act.hora_inicio})
                              </span>
                            </div>
                            {act.fecha_cierre_postulacion && (
                              <div className="flex items-center gap-2">
                                <AlertCircle
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    act.postulacion_cerrada === 'S' ? 'text-red-500' : 'text-slate-400'
                                  }`}
                                />
                                <span
                                  className={
                                    act.postulacion_cerrada === 'S'
                                      ? 'text-red-600 font-semibold'
                                      : 'text-slate-500'
                                  }
                                >
                                  {act.postulacion_cerrada === 'S'
                                    ? `Cerró: ${formatFechaCierre(act.fecha_cierre_postulacion)}`
                                    : `Cierre postul.: ${formatFechaCierre(act.fecha_cierre_postulacion)}`}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mb-4">
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
                              <span className={isFull ? 'text-amber-700' : 'text-[#0086B8]'}>
                                {isFull ? 'Cupos completos' : `${act.cupos_disponibles} disponibles`}
                              </span>
                              <span className="text-slate-500">
                                Cupos: {act.cupos_ocupados}/{act.cupos_maximos}
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFull ? 'bg-amber-400' : 'bg-[#00A9E0]'
                                }`}
                                style={{ width: `${Math.max(pct, 8)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={btn.disabled || submittingId === act.id_actividad}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostular(act);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-80 disabled:cursor-default ${btn.style}`}
                        >
                          {submittingId === act.id_actividad ? 'Procesando...' : btn.label}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PANEL LATERAL DERECHO PC */}
              {selectedAct && (
                <aside className="hidden lg:flex flex-col w-[370px] shrink-0 rounded-3xl bg-white border border-slate-200/90 p-6 shadow-md sticky top-[96px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#E6F7FD] text-[#007AA8] border border-[#BAE8FA] text-[11px] font-bold tracking-wider uppercase mb-2">
                        {selectedAct.nombre_tipo}
                      </span>
                      <h2 className="text-xl font-extrabold text-[#0A1931] leading-snug">
                        {selectedAct.titulo}
                      </h2>
                    </div>
                    <button
                      onClick={() => setSelectedActId(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A1931] hover:bg-slate-100 cursor-pointer"
                      title="Cerrar detalle"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedAct.descripcion && (
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                      {selectedAct.descripcion}
                    </p>
                  )}

                  <div className="mt-5 space-y-2.5 text-sm text-slate-700 bg-[#F4F8FB] rounded-2xl p-4 border border-slate-200/60">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-[#00A9E0] shrink-0" />
                      <span>
                        <strong>Fecha:</strong> {formatFechaLarga(selectedAct.fecha_actividad)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#00A9E0] shrink-0" />
                      <span>
                        <strong>Horario:</strong>{' '}
                        {calcHoraFin(selectedAct.hora_inicio, selectedAct.cantidad_horas)} (
                        {selectedAct.cantidad_horas} hrs)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-[#00A9E0] shrink-0" />
                      <span>
                        <strong>Cupos:</strong> {selectedAct.cupos_disponibles}/
                        {selectedAct.cupos_maximos} disponibles
                      </span>
                    </div>
                    {selectedAct.fecha_cierre_postulacion && (
                      <div className="flex items-center gap-3">
                        <AlertCircle
                          className={`w-4 h-4 shrink-0 ${
                            selectedAct.postulacion_cerrada === 'S' ? 'text-red-500' : 'text-[#00A9E0]'
                          }`}
                        />
                        <span className={selectedAct.postulacion_cerrada === 'S' ? 'text-red-700 font-semibold' : ''}>
                          <strong>
                            {selectedAct.postulacion_cerrada === 'S'
                              ? 'Postulación cerrada:'
                              : 'Cierre postulación:'}
                          </strong>{' '}
                          {formatFechaCierre(selectedAct.fecha_cierre_postulacion)} (
                          {selectedAct.horas_cierre_postulacion ?? 10}h antes)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vista previa Google Maps */}
                  <div className="mt-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                    <div className="relative h-40 w-full">
                      <iframe
                        title={`Mapa ${selectedAct.nombre_lugar}`}
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(
                          `${selectedAct.nombre_lugar}, ${selectedAct.nombre_ciudad}, Chile`
                        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        className="w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 flex items-center justify-between gap-2 bg-white border-t border-slate-200">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0A1931] truncate">
                          {selectedAct.nombre_lugar}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {selectedAct.direccion}
                        </div>
                      </div>
                      {selectedAct.url_google_maps && (
                        <a
                          href={selectedAct.url_google_maps}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-[#E6F7FD] hover:bg-[#00A9E0] text-[#007AA8] hover:text-white shrink-0 transition"
                          title="Abrir en Google Maps"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const btn = renderPostularStatus(selectedAct);
                    return (
                      <button
                        type="button"
                        disabled={btn.disabled || submittingId === selectedAct.id_actividad}
                        onClick={() => handlePostular(selectedAct)}
                        className={`mt-5 w-full py-3.5 px-5 rounded-2xl text-sm font-bold transition cursor-pointer disabled:opacity-80 disabled:cursor-default ${btn.style}`}
                      >
                        {submittingId === selectedAct.id_actividad
                          ? 'Registrando en Oracle...'
                          : btn.disabled
                            ? btn.label
                            : btn.isFull
                              ? 'Ingresar a Lista de Espera'
                              : 'Confirmar Postulación'}
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setSelectedActId(null)}
                    className="mt-2.5 text-center text-xs text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                </aside>
              )}
            </div>
          )}

          {/* MODAL DESLIZABLE DE DETALLE PARA CELULAR */}
          {mobileDetailOpen && selectedAct && (
            <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center bg-[#0A1931]/50 backdrop-blur-xs">
              <div className="w-full max-w-lg rounded-t-3xl bg-white border-t border-slate-200 p-6 max-h-[88vh] overflow-y-auto text-[#0A1931] shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-block px-3 py-0.5 rounded-full bg-[#E6F7FD] text-[#007AA8] border border-[#BAE8FA] text-[11px] font-bold uppercase mb-2">
                      {selectedAct.nombre_tipo}
                    </span>
                    <h2 className="text-xl font-extrabold leading-snug">{selectedAct.titulo}</h2>
                  </div>
                  <button
                    onClick={() => setMobileDetailOpen(false)}
                    className="p-2 rounded-full bg-slate-100 text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {selectedAct.descripcion && (
                  <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
                    {selectedAct.descripcion}
                  </p>
                )}

                <div className="mt-4 space-y-2.5 text-sm text-slate-700 bg-[#F4F8FB] p-4 rounded-2xl border border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#00A9E0]" />
                    <span>{formatFechaLarga(selectedAct.fecha_actividad)}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#00A9E0]" />
                    <span>
                      {calcHoraFin(selectedAct.hora_inicio, selectedAct.cantidad_horas)} (
                      {selectedAct.cantidad_horas} hrs)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-[#00A9E0]" />
                    <span>
                      {selectedAct.nombre_lugar} — {selectedAct.direccion}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-[#00A9E0]" />
                    <span>
                      Cupos: {selectedAct.cupos_disponibles}/{selectedAct.cupos_maximos} disponibles
                    </span>
                  </div>
                  {selectedAct.fecha_cierre_postulacion && (
                    <div className="flex items-center gap-2.5">
                      <AlertCircle
                        className={`w-4 h-4 shrink-0 ${
                          selectedAct.postulacion_cerrada === 'S' ? 'text-red-500' : 'text-[#00A9E0]'
                        }`}
                      />
                      <span className={selectedAct.postulacion_cerrada === 'S' ? 'text-red-700 font-semibold' : ''}>
                        {selectedAct.postulacion_cerrada === 'S'
                          ? 'Postulación cerrada:'
                          : 'Cierre postulación:'}{' '}
                        {formatFechaCierre(selectedAct.fecha_cierre_postulacion)} (
                        {selectedAct.horas_cierre_postulacion ?? 10}h antes)
                      </span>
                    </div>
                  )}
                </div>

                {selectedAct.url_google_maps && (
                  <a
                    href={selectedAct.url_google_maps}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 w-full py-2.5 px-4 rounded-xl bg-[#E6F7FD] border border-[#BAE8FA] text-xs font-bold text-[#007AA8] flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Ver ubicación en Google Maps
                  </a>
                )}

                {(() => {
                  const btn = renderPostularStatus(selectedAct);
                  return (
                    <button
                      type="button"
                      disabled={btn.disabled || submittingId === selectedAct.id_actividad}
                      onClick={() => handlePostular(selectedAct)}
                      className={`mt-4 w-full py-3.5 px-5 rounded-2xl text-sm font-bold transition disabled:opacity-80 ${btn.style}`}
                    >
                      {submittingId === selectedAct.id_actividad
                        ? 'Procesando...'
                        : btn.disabled
                          ? btn.label
                          : btn.isFull
                            ? 'Ingresar a Lista de Espera'
                            : 'Confirmar Postulación'}
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      )}

      {/* ===================================================================== */}
      {/* VISTA 2: CALENDARIO, MIS POSTULACIONES Y DISPONIBILIDAD               */}
      {/* ===================================================================== */}
      {activeTab === 'calendario' && (
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6">
          <div className="lg:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#00A9E0]">
              Agenda Personal
            </p>
            <h1 className="text-xl font-extrabold text-[#0A1931]">Mis Postulaciones y Horarios</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0A1931]">Mis Postulaciones</h2>
                  <p className="text-xs text-slate-500">
                    Historial completo de turnos confirmados, asignados y validados
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1] text-xs font-bold">
                  {filteredMisPostulaciones.length} registros
                </span>
              </div>

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={postSearch}
                  onChange={(e) => setPostSearch(e.target.value)}
                  placeholder="Buscar en mis postulaciones por actividad, lugar o estado..."
                  className="w-full pl-9 pr-9 py-2 rounded-2xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931] placeholder:text-slate-400 focus:outline-none focus:border-[#00A9E0] focus:bg-white transition"
                />
                {postSearch && (
                  <button
                    type="button"
                    onClick={() => setPostSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredMisPostulaciones.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {misPostulaciones.length === 0
                    ? 'Aún no tienes postulaciones registradas. Explora la pestaña Actividades.'
                    : `No hay postulaciones que coincidan con "${postSearch}".`}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMisPostulaciones.map((p) => {
                    const puedeCancelar =
                      ['CONFIRMADA', 'ASIGNADA'].includes(p.estado_postulacion) &&
                      !p.asistio &&
                      p.nombre_estado !== 'FINALIZADA';

                    return (
                      <div
                        key={p.id_postulacion}
                        className="p-4 rounded-2xl bg-[#F7FAFD] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                              style={{ backgroundColor: p.color_hex || '#00A9E0' }}
                            >
                              {p.nombre_tipo}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {formatFechaLarga(p.fecha_actividad)} · {p.hora_inicio} ({p.cantidad_horas} hrs)
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[#0A1931] truncate">{p.titulo}</h3>
                          <p className="text-xs text-slate-500 truncate">
                            {p.nombre_lugar}, {p.nombre_ciudad}
                          </p>
                          {p.comentario_experiencia && (
                            <p className="text-[11px] text-[#0369A1] mt-1 line-clamp-1 italic">
                              &ldquo;{p.comentario_experiencia}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {p.asistio === 'S' ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProcesoStyle('VALIDADA').badge}`}>
                              Validada · {p.horas_efectivas}h
                            </span>
                          ) : p.asistio === 'N' ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProcesoStyle('INASISTENCIA').badge}`}>
                              Inasistencia
                            </span>
                          ) : p.estado_postulacion === 'CANCELADA' ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProcesoStyle('CANCELADA').badge}`}>
                              Cancelada
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getProcesoStyle(p.estado_postulacion).badge}`}>
                              {p.estado_postulacion === 'ASIGNADA' ? 'Asignada' : 'Confirmada'}
                            </span>
                          )}

                          {p.estado_postulacion !== 'CANCELADA' && (
                            <button
                              type="button"
                              onClick={() => openExpModal(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F5FC] hover:bg-[#D4EEFA] border border-[#A8DDF5] text-[#0369A1] text-xs font-semibold transition cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {p.comentario_experiencia || Number(p.total_fotos || 0) > 0
                                ? `Experiencia (${Number(p.total_fotos || 0)}/5)`
                                : 'Experiencia / Fotos'}
                            </button>
                          )}

                          {puedeCancelar && (
                            <button
                              onClick={() => handleCancelarPostulacion(p.id_postulacion)}
                              className="px-3 py-1 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold border border-red-200 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Mi Disponibilidad (Mantenedor 9) */}
            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 flex flex-col">
              <h2 className="text-lg font-extrabold text-[#0A1931] mb-1">Mi Disponibilidad</h2>
              <p className="text-xs text-slate-500 mb-4">
                Declara los días y bloques en que puedes apoyar nuevas actividades UCM.
              </p>

              <form onSubmit={handleCrearDisponibilidad} className="space-y-3 pb-5 border-b border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha disponible</label>
                  <input
                    type="date"
                    required
                    value={dispFecha}
                    onChange={(e) => setDispFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Bloque horario</label>
                  <select
                    value={dispBloque}
                    onChange={(e) => setDispBloque(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0]"
                  >
                    <option value="MANANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                    <option value="COMPLETO">Día completo</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingDisp}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#00A9E0] hover:bg-[#0092C4] text-white text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {savingDisp ? 'Guardando...' : 'Agregar disponibilidad'}
                </button>
              </form>

              <div className="mt-4 space-y-2.5 flex-1">
                {disponibilidades.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sin bloques registrados aún.</p>
                ) : (
                  disponibilidades.map((d) => (
                    <div
                      key={d.id_disponibilidad}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F7FAFD] border border-slate-200/70"
                    >
                      <div>
                        <div className="text-xs font-bold text-[#0A1931]">
                          {formatFechaLarga(d.fecha_disponible)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Bloque: <span className="font-semibold text-[#00A9E0]">{d.bloque_horario}</span> ·{' '}
                          {d.estado_disp}
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminarDisponibilidad(d.id_disponibilidad)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* ===================================================================== */}
      {/* VISTA 3: MI PERFIL E HISTORIAL                                        */}
      {/* ===================================================================== */}
      {activeTab === 'perfil' && (
        <main className="flex-1 w-full">
          {/* PERFIL MÓVIL */}
          <div className="lg:hidden px-4 py-5 space-y-4">
            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden text-center">
              <div className="h-24 ucm-banner-gradient" />
              <div className="px-6 pb-6">
                <div className="relative inline-flex flex-col items-center -mt-12">
                  <div className="relative">
                    <UserAvatar
                      fotoUrl={user.foto_url}
                      nombre={user.nombre}
                      apellido={user.apellido}
                      size="lg"
                      className="border-4 border-white shadow-md"
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      title="Cambiar foto de perfil"
                      className="absolute bottom-1 right-0 w-8 h-8 rounded-full bg-[#0A1931] hover:bg-[#00A9E0] text-white border-2 border-white flex items-center justify-center shadow transition cursor-pointer disabled:opacity-60"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="-mt-3 relative z-10 px-4 py-0.5 rounded-full bg-[#00A9E0] text-white text-xs font-extrabold tracking-wider shadow-xs">
                    STAFF
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-extrabold text-[#0A1931]">
                  {user.nombre} {user.apellido}
                </h2>
                <p className="text-xs text-slate-400">{user.correo}</p>

                <div className="mt-4 space-y-2 text-left text-sm text-slate-700 bg-[#F4F8FB] p-4 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-[#00A9E0] shrink-0" />
                    <span>
                      <strong>Carrera:</strong> {perfil?.nombre_carrera || 'Estudiante UCM'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-[#00A9E0] shrink-0" />
                    <span>
                      <strong>Generación:</strong> {perfil?.generacion || '2024'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0A1931] hover:bg-[#15367A] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#00A9E0]" />
                  Cambiar contraseña
                </button>
                <a
                  href="https://www.sii.cl/servicios_online/1040-1287.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#E6F5FC] hover:bg-[#D4EEFA] border border-[#A8DDF5] text-[#0369A1] text-xs font-bold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ir a emitir boleta (SII)
                </a>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-extrabold text-[#0A1931]">Mi Historial Mensual</h3>
                <span className="px-3 py-1 rounded-full bg-[#E6F7FD] text-[#007AA8] text-xs font-bold">
                  {resumenMes.horas_totales} hrs
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                {[9, 10, 11].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMes(m)}
                    className={`py-2 rounded-full text-xs font-bold border transition ${
                      mes === m
                        ? 'bg-[#00A9E0] text-white border-[#00A9E0] shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {MESES_CORTOS[m - 1]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-5">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((d) => (
                  <div key={d} className="font-bold text-slate-400 py-1">
                    {d}
                  </div>
                ))}
                {monthCells.map((day, idx) => {
                  const status = day ? monthDaysMap[day] : null;
                  const st = status ? getProcesoStyle(status) : null;
                  return (
                    <div key={idx} className="py-1 flex flex-col items-center justify-center">
                      {day && (
                        <>
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                              st ? st.cell : 'text-slate-700'
                            }`}
                          >
                            {day}
                          </span>
                          {st && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${st.dot}`} />}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={perfilSearch}
                  onChange={(e) => setPerfilSearch(e.target.value)}
                  placeholder="Buscar actividad del mes..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931]"
                />
              </div>

              <div className="space-y-2.5">
                {perfilMonthActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Sin actividades registradas en {MESES[mes - 1]} {anio}.
                  </p>
                ) : (
                  perfilMonthActivities.map((item) => {
                    const st = getProcesoStyle(item.procesoKey);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-[#F4F8FB] border border-slate-200/70"
                      >
                        <span className="text-xs font-bold text-[#0A1931] truncate">
                          {item.titulo} · {item.horas}h
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${st.badge}`}>
                          {item.estado}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* PERFIL PC */}
          <div className="hidden lg:grid max-w-[1400px] mx-auto px-8 py-8 grid-cols-12 gap-7 items-start">
            <div className="col-span-4 space-y-5">
              <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="h-28 ucm-banner-gradient" />
                <div className="px-7 pb-7 text-center">
                  <div className="-mt-14 relative inline-block">
                    <UserAvatar
                      fotoUrl={user.foto_url}
                      nombre={user.nombre}
                      apellido={user.apellido}
                      size="xl"
                      className="border-[5px] border-white shadow-lg"
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      title="Cambiar foto de perfil"
                      className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#0A1931] hover:bg-[#00A9E0] text-white border-2 border-white flex items-center justify-center shadow-md transition cursor-pointer disabled:opacity-60"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3.5">
                    <span className="inline-block px-4 py-1 rounded-full bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1] text-xs font-bold tracking-widest uppercase">
                      STAFF
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-extrabold text-[#0A1931]">
                    {user.nombre} {user.apellido}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{user.correo}</p>

                  <div className="mt-5 p-4 rounded-2xl bg-[#F4F8FB] border border-slate-200/60 space-y-2.5 text-left text-sm text-[#0A1931]">
                    <div className="flex items-center gap-2.5">
                      <GraduationCap className="w-4 h-4 text-[#00A9E0] shrink-0" />
                      <span className="truncate">
                        <strong className="font-bold">Carrera:</strong>{' '}
                        {perfil?.nombre_carrera || 'Ingeniería Civil Informática'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-[#00A9E0] shrink-0" />
                      <span>
                        <strong className="font-bold">Generación:</strong> {perfil?.generacion || 2024}
                      </span>
                    </div>
                    {perfil?.telefono && (
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-[#00A9E0] shrink-0" />
                        <span>
                          <strong className="font-bold">Teléfono:</strong> {perfil.telefono}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#0A1931] hover:bg-[#15367A] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#00A9E0]" />
                      Cambiar contraseña
                    </button>
                    <a
                      href="https://www.sii.cl/servicios_online/1040-1287.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#E6F5FC] hover:bg-[#D4EEFA] border border-[#A8DDF5] text-[#0369A1] text-xs font-bold transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ir a emitir boleta (SII)
                    </a>
                  </div>
                </div>
              </section>

              {/* Resumen compacto del Staff (equilibra columna izquierda) */}
              <section className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-[#0A1931]">Resumen de {MESES[mes - 1]}</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getProcesoStyle('VALIDADA').badge}`}>
                    {perfil?.estado_disponibilidad || 'DISPONIBLE'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-2xl bg-[#E6F6F0]/60 border border-[#A7E3CE]/70">
                    <div className="text-xl font-extrabold text-[#0F7657]">{resumenMes.horas_totales}h</div>
                    <div className="text-[10px] font-bold text-slate-600 mt-0.5">Horas mes</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#E6F5FC]/70 border border-[#A8DDF5]/70">
                    <div className="text-xl font-extrabold text-[#0369A1]">{resumenMes.total_asistencias}</div>
                    <div className="text-[10px] font-bold text-slate-600 mt-0.5">Asistencias</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#EEF2FF]/80 border border-[#C7D2FE]/70">
                    <div className="text-xl font-extrabold text-[#4338CA]">{proximosTurnosCount}</div>
                    <div className="text-[10px] font-bold text-slate-600 mt-0.5">Próximos</div>
                  </div>
                </div>
              </section>
            </div>

            <section className="col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#0A1931]">
                    Historial Mensual de Actividades
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Haz clic en un día pintado o en una etiqueta de color para filtrar la lista
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[#F4F8FB] border border-slate-200 rounded-2xl px-2 py-1">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 rounded-xl hover:bg-white text-[#0A1931] transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-[#0A1931] min-w-[130px] text-center">
                    {MESES[mes - 1]} {anio}
                  </span>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-1.5 rounded-xl hover:bg-white text-[#0A1931] transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 mb-5">
                <div className="grid grid-cols-7 bg-[#F4F8FB] border-b border-slate-200">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                    <div key={d} className="py-2.5 text-center text-xs font-bold text-[#0A1931]">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 bg-white">
                  {monthCells.map((day, idx) => {
                    const status = day ? monthDaysMap[day] : null;
                    const st = status ? getProcesoStyle(status) : null;
                    const titles = day ? monthDayTitlesMap[day] || [] : [];
                    const isToday =
                      day === todayInfo.day && mes === todayInfo.month && anio === todayInfo.year;
                    const isSelectedDay = day && perfilDayFilter === day;

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!day || titles.length === 0}
                        onClick={() => {
                          if (!day || titles.length === 0) return;
                          setPerfilDayFilter((prev) => (prev === day ? null : day));
                        }}
                        title={
                          titles.length > 0
                            ? `${day} ${MESES_CORTOS[mes - 1]}: ${titles.join(' | ')}`
                            : isToday
                              ? 'Hoy'
                              : undefined
                        }
                        className={`h-14 px-1 flex flex-col items-center justify-center text-sm font-semibold border-b border-r border-slate-100 transition ${
                          st ? `${st.cell} cursor-pointer hover:brightness-95` : 'text-[#0A1931] cursor-default'
                        } ${isToday ? 'ring-2 ring-inset ring-[#00A9E0]' : ''} ${
                          isSelectedDay ? 'ring-2 ring-inset ring-[#0A1931]' : ''
                        }`}
                      >
                        <span>{day || ''}</span>
                        {titles.length > 0 && (
                          <span className="text-[9px] font-bold opacity-80 truncate max-w-[90%] leading-tight mt-0.5">
                            {titles[0].split(' (')[0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Leyenda interactiva (filtros clicables) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  {[
                    { key: 'VALIDADA', label: 'Validada' },
                    { key: 'CONFIRMADA', label: 'Confirmada' },
                    { key: 'ASIGNADA', label: 'Asignada' },
                    { key: 'INASISTENCIA', label: 'Inasistencia' },
                  ].map((f) => {
                    const active = perfilStatusFilter === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() =>
                          setPerfilStatusFilter((prev) => (prev === f.key ? null : f.key))
                        }
                        className={`px-3 py-1 rounded-full transition cursor-pointer ${getProcesoStyle(f.key).badge} ${
                          active ? 'ring-2 ring-[#0A1931]/40 scale-[1.03]' : 'opacity-85 hover:opacity-100'
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                  {(perfilDayFilter || perfilStatusFilter || perfilSearch) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPerfilDayFilter(null);
                        setPerfilStatusFilter(null);
                        setPerfilSearch('');
                      }}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold cursor-pointer transition"
                    >
                      Ver todo el mes
                    </button>
                  )}
                </div>
                {perfilDayFilter && (
                  <span className="text-xs font-bold text-[#0369A1]">
                    Filtrando día {perfilDayFilter} de {MESES[mes - 1]}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-extrabold text-[#0A1931]">
                  Actividades del Mes ({perfilMonthActivities.length})
                </h3>
                <div className="relative w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={perfilSearch}
                    onChange={(e) => setPerfilSearch(e.target.value)}
                    placeholder="Buscar actividad del mes..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931]"
                  />
                </div>
              </div>
              {perfilMonthActivities.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">
                  No hay actividades para los filtros seleccionados en {MESES[mes - 1]} {anio}.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {perfilMonthActivities.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenPerfilActivity(item)}
                      className="w-full text-left py-3.5 px-2 -mx-2 rounded-xl hover:bg-[#F7FAFD] flex items-center justify-between gap-4 transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#0A1931] truncate">
                          {item.titulo} — <strong className="font-bold">{item.horas} hrs</strong>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {formatFechaLarga(item.fecha)}
                          {item.horaInicio ? ` · ${item.horaInicio}` : ''}
                          {item.lugar ? ` · ${item.lugar}` : ''}
                          {item.ciudad ? `, ${item.ciudad}` : ''}
                        </div>
                      </div>
                      <span
                        className={`px-3.5 py-1 rounded-full text-xs font-semibold shrink-0 ${getProcesoStyle(item.procesoKey).badge}`}
                      >
                        {item.estado}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ===================================================================== */}
      {/* BARRA INFERIOR MÓVIL                                                  */}
      {/* ===================================================================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-[0_-4px_16px_-6px_rgba(10,25,49,0.08)]">
        {[
          { id: 'actividades', label: 'Actividades', icon: ListChecks },
          { id: 'calendario', label: 'Calendario', icon: Calendar },
          { id: 'perfil', label: 'Perfil', icon: User },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition ${
                active ? 'text-[#00A9E0]' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ===================================================================== */}
      {/* MODAL EXPERIENCIA Y FOTOS DE RECUERDO (MÁX 5 FOTOS)                   */}
      {/* ===================================================================== */}
      {expModalPost && (
        <div
          onClick={() => setExpModalPost(null)}
          className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-[#F8FBFD] flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1] text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  <Camera className="w-3 h-3" />
                  Mi Experiencia y Recuerdos
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-[#0A1931] truncate">
                  {expModalPost.titulo}
                </h2>
                <p className="text-xs text-slate-500">
                  {formatFechaLarga(expModalPost.fecha_actividad)} · {expModalPost.nombre_lugar}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpModalPost(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Comentario de experiencia */}
              <form onSubmit={handleSaveExperiencia} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-[#0A1931] uppercase tracking-wide">
                    Cuéntanos cómo fue tu experiencia
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {expComment.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={expComment}
                  onChange={(e) => setExpComment(e.target.value)}
                  placeholder="Ej: Excelente jornada con los estudiantes, gran convocatoria en el stand de Ingeniería..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F4F8FB] border border-slate-200 text-sm text-[#0A1931] placeholder:text-slate-400 focus:outline-none focus:border-[#00A9E0] focus:bg-white transition resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={expSavingComment}
                    className="px-5 py-2 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
                  >
                    {expSavingComment ? 'Guardando...' : 'Guardar experiencia'}
                  </button>
                </div>
              </form>

              {/* Galería de fotos opcionales (máx 5) */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#0A1931] uppercase tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-[#00A9E0]" />
                      Fotos de recuerdo (opcional)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      El equipo Admin podrá verlas y descargarlas para redes sociales (IG). Máximo 5 fotos.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#E6F6F0] border border-[#A7E3CE] text-[#0F7657] text-xs font-bold">
                    {expPhotos.length} / 5 fotos
                  </span>
                </div>

                <input
                  ref={expPhotoInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUploadExpPhotos}
                  className="hidden"
                />

                {expPhotos.length < 5 && (
                  <button
                    type="button"
                    disabled={expUploadingPhotos}
                    onClick={() => expPhotoInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#A8DDF5] bg-[#F4F8FB] hover:bg-[#E6F5FC]/60 text-[#0369A1] text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    <Upload className="w-4 h-4" />
                    {expUploadingPhotos
                      ? 'Optimizando y subiendo fotos...'
                      : `Subir fotos (${5 - expPhotos.length} disponible${5 - expPhotos.length === 1 ? '' : 's'})`}
                  </button>
                )}

                {expLoadingPhotos ? (
                  <p className="py-6 text-center text-xs text-slate-400">Cargando tus fotos...</p>
                ) : expPhotos.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Aún no has subido fotos de recuerdo en esta actividad.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {expPhotos.map((foto) => (
                      <div
                        key={foto.id_foto}
                        className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square group"
                      >
                        <img
                          src={resolveAssetUrl(foto.url)}
                          alt={foto.nombre_archivo}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          disabled={expDeletingPhotoId === foto.id_foto}
                          onClick={() => handleDeleteExpPhoto(foto.id_foto)}
                          title="Eliminar foto"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow transition cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL CAMBIAR CONTRASEÑA                                              */}
      {/* ===================================================================== */}
      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={(msg) => showToast('success', msg)}
      />
    </div>
  );
}