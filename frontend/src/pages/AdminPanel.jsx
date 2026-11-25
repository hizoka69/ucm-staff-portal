import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Bell,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Database,
  ExternalLink,
  LogOut,
  MapPin,
  Minus,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  X,
  KeyRound,
} from 'lucide-react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import UcmLogo from '../components/UcmLogo';
import UserAvatar from '../components/UserAvatar';
import ReportesView from '../components/ReportesView';
import MantenedoresView from '../components/MantenedoresView';
import ChangePasswordModal from '../components/ChangePasswordModal';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];


function formatFechaHoy() {
  const d = new Date();
  return `${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

function parseIsoDate(raw) {
  if (!raw) return null;
  const part = String(raw).slice(0, 10);
  const [y, m, d] = part.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

function formatFechaCorta(raw) {
  const p = parseIsoDate(raw);
  if (!p) return '—';
  return `${String(p.day).padStart(2, '0')} ${MESES[p.month - 1].slice(0, 3)} ${p.year}`;
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

function shortTypeLabel(nombreTipo = '') {
  const t = nombreTipo.toLowerCase();
  if (t.includes('feria')) return 'Feria';
  if (t.includes('charla')) return 'Charla';
  if (t.includes('puertas') || t.includes('visita')) return 'Visita';
  if (t.includes('paes')) return 'PAES';
  if (t.includes('inducci')) return 'Inducción';
  return nombreTipo.split(' ')[0] || 'Evento';
}

function getPillStyle(nombreTipo = '') {
  const t = nombreTipo.toLowerCase();
  if (t.includes('charla')) return 'bg-[#1D63B8] text-white';
  if (t.includes('puertas') || t.includes('visita')) return 'bg-[#169B8C] text-white';
  if (t.includes('paes')) return 'bg-[#6D4AFF] text-white';
  if (t.includes('instituc')) return 'bg-[#D9485F] text-white';
  return 'bg-[#00A9E0] text-white';
}

// Regiones de Chile (norte → sur) con todas sus comunas
const REGIONES_COMUNAS = {
  'Región de Arica y Parinacota': [
    'Arica', 'Camarones', 'Putre', 'General Lagos',
  ],
  'Región de Tarapacá': [
    'Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Camiña', 'Colchane', 'Huara', 'Pica',
  ],
  'Región de Antofagasta': [
    'Antofagasta', 'Mejillones', 'Sierra Gorda', 'Taltal', 'Calama', 'Ollagüe',
    'San Pedro de Atacama', 'Tocopilla', 'María Elena',
  ],
  'Región de Atacama': [
    'Copiapó', 'Caldera', 'Tierra Amarilla', 'Chañaral', 'Diego de Almagro',
    'Vallenar', 'Alto del Carmen', 'Freirina', 'Huasco',
  ],
  'Región de Coquimbo': [
    'La Serena', 'Coquimbo', 'Andacollo', 'La Higuera', 'Paiguano', 'Vicuña',
    'Illapel', 'Canela', 'Los Vilos', 'Salamanca', 'Ovalle', 'Combarbalá',
    'Monte Patria', 'Punitaqui', 'Río Hurtado',
  ],
  'Región de Valparaíso': [
    'Valparaíso', 'Casablanca', 'Concón', 'Juan Fernández', 'Puchuncaví', 'Quintero',
    'Viña del Mar', 'Isla de Pascua', 'Los Andes', 'Calle Larga', 'Rinconada',
    'San Esteban', 'La Ligua', 'Cabildo', 'Papudo', 'Petorca', 'Zapallar',
    'Quillota', 'La Calera', 'Hijuelas', 'La Cruz', 'Nogales', 'San Antonio',
    'Algarrobo', 'Cartagena', 'El Quisco', 'El Tabo', 'Santo Domingo', 'San Felipe',
    'Catemu', 'Llaillay', 'Panquehue', 'Putaendo', 'Santa María', 'Quilpué',
    'Limache', 'Olmué', 'Villa Alemana',
  ],
  'Región Metropolitana': [
    'Santiago', 'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
    'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja', 'La Reina',
    'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa',
    'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura',
    'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
    'Vitacura', 'Puente Alto', 'Pirque', 'San José de Maipo', 'Colina', 'Lampa',
    'Tiltil', 'San Bernardo', 'Buin', 'Calera de Tango', 'Paine', 'Melipilla',
    'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte',
    'Isla de Maipo', 'Padre Hurtado', 'Peñaflor',
  ],
  "Región de O'Higgins": [
    'Rancagua', 'Codegua', 'Coinco', 'Coltauco', 'Doñihue', 'Graneros', 'Las Cabras',
    'Machalí', 'Malloa', 'Mostazal', 'Olivar', 'Peumo', 'Pichidegua',
    'Quinta de Tilcoco', 'Rengo', 'Requínoa', 'San Vicente', 'Pichilemu',
    'La Estrella', 'Litueche', 'Marchihue', 'Navidad', 'Paredones', 'San Fernando',
    'Chépica', 'Chimbarongo', 'Lolol', 'Nancagua', 'Palmilla', 'Peralillo',
    'Placilla', 'Pumanque', 'Santa Cruz',
  ],
  'Región del Maule': [
    'Talca', 'Constitución', 'Curepto', 'Empedrado', 'Maule', 'Pelarco', 'Pencahue',
    'Río Claro', 'San Clemente', 'San Rafael', 'Cauquenes', 'Chanco', 'Pelluhue',
    'Curicó', 'Hualañé', 'Licantén', 'Molina', 'Rauco', 'Romeral', 'Sagrada Familia',
    'Teno', 'Vichuquén', 'Linares', 'Colbún', 'Longaví', 'Parral', 'Retiro',
    'San Javier', 'Villa Alegre', 'Yerbas Buenas',
  ],
  'Región de Ñuble': [
    'Chillán', 'Bulnes', 'Chillán Viejo', 'El Carmen', 'Pemuco', 'Pinto', 'Quillón',
    'San Ignacio', 'Yungay', 'Quirihue', 'Cobquecura', 'Coelemu', 'Ninhue',
    'Portezuelo', 'Ránquil', 'Treguaco', 'San Carlos', 'Coihueco', 'Ñiquén',
    'San Fabián', 'San Nicolás',
  ],
  'Región del Biobío': [
    'Concepción', 'Coronel', 'Chiguayante', 'Florida', 'Hualqui', 'Lota', 'Penco',
    'San Pedro de la Paz', 'Santa Juana', 'Talcahuano', 'Tomé', 'Hualpén', 'Lebu',
    'Arauco', 'Cañete', 'Contulmo', 'Curanilahue', 'Los Álamos', 'Tirúa',
    'Los Ángeles', 'Antuco', 'Cabrero', 'Laja', 'Mulchén', 'Nacimiento', 'Negrete',
    'Quilaco', 'Quilleco', 'San Rosendo', 'Santa Bárbara', 'Tucapel', 'Yumbel',
    'Alto Biobío',
  ],
  'Región de La Araucanía': [
    'Temuco', 'Carahue', 'Cholchol', 'Cunco', 'Curarrehue', 'Freire', 'Galvarino',
    'Gorbea', 'Lautaro', 'Loncoche', 'Melipeuco', 'Nueva Imperial', 'Padre Las Casas',
    'Perquenco', 'Pitrufquén', 'Pucón', 'Saavedra', 'Teodoro Schmidt', 'Toltén',
    'Vilcún', 'Villarrica', 'Angol', 'Collipulli', 'Curacautín', 'Ercilla',
    'Lonquimay', 'Los Sauces', 'Lumaco', 'Purén', 'Renaico', 'Traiguén', 'Victoria',
  ],
  'Región de Los Ríos': [
    'Valdivia', 'Corral', 'Lanco', 'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco',
    'Panguipulli', 'La Unión', 'Futrono', 'Lago Ranco', 'Río Bueno',
  ],
  'Región de Los Lagos': [
    'Puerto Montt', 'Calbuco', 'Cochamó', 'Fresia', 'Frutillar', 'Los Muermos',
    'Llanquihue', 'Maullín', 'Puerto Varas', 'Castro', 'Ancud', 'Chonchi',
    'Curaco de Vélez', 'Dalcahue', 'Puqueldón', 'Queilén', 'Quellón', 'Quemchi',
    'Quinchao', 'Osorno', 'Puerto Octay', 'Purranque', 'Puyehue', 'Río Negro',
    'San Juan de la Costa', 'San Pablo', 'Chaitén', 'Futaleufú', 'Hualaihué', 'Palena',
  ],
  'Región de Aysén': [
    'Coyhaique', 'Lago Verde', 'Aysén', 'Cisnes', 'Guaitecas', 'Cochrane',
    "O'Higgins", 'Tortel', 'Chile Chico', 'Río Ibáñez',
  ],
  'Región de Magallanes': [
    'Punta Arenas', 'Laguna Blanca', 'Río Verde', 'San Gregorio', 'Cabo de Hornos',
    'Antártica', 'Porvenir', 'Primavera', 'Timaukel', 'Natales', 'Torres del Paine',
  ],
};

// Alias de nombres alternativos comunes
const ALIAS_COMUNAS = {
  'calera': 'Región de Valparaíso',
  'til til': 'Región Metropolitana',
  'coihaique': 'Región de Aysén',
  'puerto natales': 'Región de Magallanes',
  'puerto williams': 'Región de Magallanes',
  'rapa nui': 'Región de Valparaíso',
  'santiago centro': 'Región Metropolitana',
};

// Quita tildes, pasa a minúsculas y recorta (Chillán → chillan)
const normalizar = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Mapa plano: comuna normalizada → región
const REGION_FALLBACK = Object.entries(REGIONES_COMUNAS).reduce(
  (acc, [region, comunas]) => {
    comunas.forEach((c) => {
      acc[normalizar(c)] = region;
    });
    return acc;
  },
  { ...ALIAS_COMUNAS }
);

// Orden norte → sur para el desplegable de regiones
const ORDEN_REGIONES = Object.keys(REGIONES_COMUNAS);

function getRegionCiudad(c) {
  return (
    c?.nombre_region ||
    c?.region ||
    REGION_FALLBACK[normalizar(c?.nombre_ciudad)] ||
    'Otras Regiones'
  );
}

export default function AdminPanel() {
  
  const { user, logout, updateUserPhoto } = useAuth();
  const fileInputRef = useRef(null);

  // Pestañas principales del Admin: 'calendario' | 'staff' | 'validacion' | 'reportes' | 'config'
  const [activeTab, setActiveTab] = useState('calendario');
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Mes/año del calendario de actividades
  const [mes, setMes] = useState(11);
  const [anio, setAnio] = useState(2026);

  // Datos desde Oracle
  const [actividadesMes, setActividadesMes] = useState([]);
  const [todasActividades, setTodasActividades] = useState([]);
  const [tiposAct, setTiposAct] = useState([]);
  const [estadosAct, setEstadosAct] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [carreras, setCarreras] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [listaEspera, setListaEspera] = useState([]);

  // Actividad seleccionada en Calendario / Gestión Staff / Validación
  const [selectedCalActId, setSelectedCalActId] = useState(null);
  const [selectedStaffActId, setSelectedStaffActId] = useState(null);
  const [actPostulaciones, setActPostulaciones] = useState([]);
  const [manualAssignUserId, setManualAssignUserId] = useState('');
  const [promotingWaitlist, setPromotingWaitlist] = useState(false);

  // Validación de horas
  const [valActId, setValActId] = useState(null);
  const [valPostulaciones, setValPostulaciones] = useState([]);
  const [valDrafts, setValDrafts] = useState({});
  const [savingValId, setSavingValId] = useState(null);

  // Filtros y sub-tabs Gestión Staff
  const [staffSearch, setStaffSearch] = useState('');
  const [mobileStaffSubTab, setMobileStaffSubTab] = useState('espera'); // 'disponibles' | 'asignados' | 'espera'

  // Formulario Nueva Actividad
  const [formTipoId, setFormTipoId] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFecha, setFormFecha] = useState('2026-11-29');
  const [formHoraInicio, setFormHoraInicio] = useState('09:00');
  const [formHoras, setFormHoras] = useState(4);
  const [formCupos, setFormCupos] = useState(6);
  const [formHorasCierre, setFormHorasCierre] = useState(10);
  const [useNewPlace, setUseNewPlace] = useState(false);
  const [formUbicacionId, setFormUbicacionId] = useState('');
  const [newPlaceRegion, setNewPlaceRegion] = useState('');
  const [newPlaceCiudadId, setNewPlaceCiudadId] = useState('');
  const [newPlaceNombre, setNewPlaceNombre] = useState('');
  const [newPlaceDir, setNewPlaceDir] = useState('');
  const [newPlaceMaps, setNewPlaceMaps] = useState('');
  const [showScheduleBox, setShowScheduleBox] = useState(false);
  const [fechaProgramada, setFechaProgramada] = useState('2026-11-26T09:00');
  const [creatingAct, setCreatingAct] = useState(false);

  // Modal Crear Credencial Staff
  const [showNewStaffModal, setShowNewStaffModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    rut: '',
    nombre: '',
    apellido: '',
    correo: '',
    id_carrera: '',
    generacion: 2025,
    telefono: '+569',
    password_inicial: 'Ucm2026!',
  });
  const [creatingStaff, setCreatingStaff] = useState(false);

  // Modal Ficha de Staff + Eliminación definitiva
  const [selectedStaffModal, setSelectedStaffModal] = useState(null);
  const [confirmDeleteStaff, setConfirmDeleteStaff] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState(false);

  // Feedback y estados generales
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  };

  // Subir foto de perfil del Admin
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

  // Carga inicial de catálogos + datos operativos
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        calMesRes,
        allActRes,
        tiposRes,
        estadosRes,
        ubRes,
        ciuRes,
        carRes,
        staffRes,
        espRes,
      ] = await Promise.all([
        api.get('/gestores/actividades/calendario', { params: { mes, anio, solo_publicadas: 'N' } }),
        api.get('/gestores/actividades/calendario', { params: { solo_publicadas: 'N' } }),
        api.get('/mantenedores/tipos-actividad'),
        api.get('/mantenedores/estados-actividad'),
        api.get('/mantenedores/ubicaciones'),
        api.get('/mantenedores/ciudades'),
        api.get('/mantenedores/carreras'),
        api.get('/gestores/usuarios', { params: { id_rol: 3 } }),
        api.get('/gestores/lista-espera/pendientes'),
      ]);

      const mesActs = calMesRes.data || [];
      const allActs = allActRes.data || [];
      const tipos = tiposRes.data || [];
      const ubs = ubRes.data || [];
      const cius = ciuRes.data || [];
      const cars = carRes.data || [];
      const espera = espRes.data || [];

      setActividadesMes(mesActs);
      setTodasActividades(allActs);
      setTiposAct(tipos);
      setEstadosAct(estadosRes.data || []);
      setUbicaciones(ubs);
      setCiudades(cius);
      setCarreras(cars);
      setStaffList(staffRes.data || []);
      setListaEspera(espera);

      // Valores por defecto de formularios
      if (tipos.length > 0) setFormTipoId((prev) => prev || String(tipos[0].id_tipo_actividad));
      if (ubs.length > 0) setFormUbicacionId((prev) => prev || String(ubs[0].id_ubicacion));
      if (cius.length > 0) setNewPlaceCiudadId((prev) => prev || String(cius[0].id_ciudad));
      if (cars.length > 0) {
        setNewStaff((prev) => (prev.id_carrera ? prev : { ...prev, id_carrera: String(cars[0].id_carrera) }));
      }

      // Actividad preseleccionada para panel de Gestión Staff (prioriza una con lista de espera)
      setSelectedStaffActId((prev) => {
        if (prev && allActs.some((a) => a.id_actividad === prev)) return prev;
        if (espera.length > 0) return espera[0].id_actividad;
        const pub = allActs.find((a) => a.nombre_estado === 'PUBLICADA');
        return pub ? pub.id_actividad : allActs[0]?.id_actividad || null;
      });

      // Actividad preseleccionada para Validación de Horas (prioriza PUBLICADA o FINALIZADA)
      setValActId((prev) => {
        if (prev && allActs.some((a) => a.id_actividad === prev)) return prev;
        const fin = allActs.find((a) => a.nombre_estado === 'FINALIZADA');
        return fin ? fin.id_actividad : allActs[0]?.id_actividad || null;
      });
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Error al cargar datos del panel.'));
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Cargar postulaciones de la actividad seleccionada en Gestión Staff
  const loadStaffActPostulaciones = useCallback(async (idAct) => {
    if (!idAct) {
      setActPostulaciones([]);
      return;
    }
    try {
      const res = await api.get(`/gestores/postulaciones/actividad/${idAct}`);
      setActPostulaciones(res.data || []);
    } catch {
      setActPostulaciones([]);
    }
  }, []);

  useEffect(() => {
    loadStaffActPostulaciones(selectedStaffActId);
  }, [selectedStaffActId, loadStaffActPostulaciones]);

  // Cargar postulaciones de la actividad seleccionada en Validación de Horas
  const loadValPostulaciones = useCallback(async (idAct) => {
    if (!idAct) {
      setValPostulaciones([]);
      return;
    }
    try {
      const res = await api.get(`/gestores/postulaciones/actividad/${idAct}`);
      const rows = res.data || [];
      setValPostulaciones(rows);
      const actObj = todasActividades.find((a) => a.id_actividad === idAct);
      const defaultHrs = actObj ? Number(actObj.cantidad_horas) : 4;
      const drafts = {};
      rows.forEach((p) => {
        drafts[p.id_postulacion] = {
          asistio: p.asistio || 'S',
          horas_efectivas: p.horas_efectivas != null ? Number(p.horas_efectivas) : defaultHrs,
          observaciones: p.observaciones || '',
        };
      });
      setValDrafts(drafts);
    } catch {
      setValPostulaciones([]);
    }
  }, [todasActividades]);

  useEffect(() => {
    if (activeTab === 'validacion' && valActId) {
      loadValPostulaciones(valActId);
    }
  }, [activeTab, valActId, loadValPostulaciones]);

  // Mapas de apoyo
  const staffById = useMemo(() => {
    const map = {};
    staffList.forEach((s) => {
      map[s.id_usuario] = s;
    });
    return map;
  }, [staffList]);

  const regionesDisponibles = useMemo(() => {
    const set = new Set(ciudades.map(getRegionCiudad));
    return [
      ...ORDEN_REGIONES.filter((r) => set.has(r)),
      ...Array.from(set).filter((r) => !ORDEN_REGIONES.includes(r)),
    ];
  }, [ciudades]);

const comunasDeRegion = useMemo(() => {
  if (!newPlaceRegion) return ciudades;
  return ciudades.filter((c) => getRegionCiudad(c) === newPlaceRegion);
}, [ciudades, newPlaceRegion]);

useEffect(() => {
  if (!newPlaceRegion && regionesDisponibles.length > 0) {
    const defaultReg = regionesDisponibles.includes('Región del Maule')
      ? 'Región del Maule'
      : regionesDisponibles[0];
    setNewPlaceRegion(defaultReg);
    const primera = ciudades.find((c) => getRegionCiudad(c) === defaultReg);
    if (primera) setNewPlaceCiudadId(String(primera.id_ciudad));
  }
}, [regionesDisponibles, newPlaceRegion, ciudades]);

const handleRegionChange = (region) => {
  setNewPlaceRegion(region);
  const primera = ciudades.find((c) => getRegionCiudad(c) === region);
  setNewPlaceCiudadId(primera ? String(primera.id_ciudad) : '');
};

  const monthCells = useMemo(() => buildMonthGrid(anio, mes), [anio, mes]);

  const actividadesPorDia = useMemo(() => {
    const map = {};
    actividadesMes.forEach((a) => {
      const p = parseIsoDate(a.fecha_actividad);
      if (p && p.month === mes && p.year === anio) {
        if (!map[p.day]) map[p.day] = [];
        map[p.day].push(a);
      }
    });
    return map;
  }, [actividadesMes, mes, anio]);

  const selectedCalAct = useMemo(
    () => actividadesMes.find((a) => a.id_actividad === selectedCalActId) || null,
    [actividadesMes, selectedCalActId]
  );

  const selectedStaffAct = useMemo(
    () => todasActividades.find((a) => a.id_actividad === selectedStaffActId) || null,
    [todasActividades, selectedStaffActId]
  );

  const esperaDeActividad = useMemo(() => {
    if (!selectedStaffActId) return listaEspera;
    return listaEspera.filter((e) => e.id_actividad === selectedStaffActId);
  }, [listaEspera, selectedStaffActId]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staffList;
    return staffList.filter((s) =>
      `${s.nombre} ${s.apellido} ${s.rut} ${s.correo} ${s.nombre_carrera || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [staffList, staffSearch]);

  // KPIs en tiempo real
  const kpis = useMemo(() => {
    const staffActivos = staffList.filter((s) => s.activo === 'S').length;
    const abiertas = todasActividades.filter((a) => a.nombre_estado === 'PUBLICADA').length;
    const cuposOcupadosAbiertas = todasActividades
      .filter((a) => a.nombre_estado === 'PUBLICADA')
      .reduce((acc, a) => acc + Number(a.cupos_ocupados || 0), 0);
    return {
      staffActivos,
      abiertas,
      cuposOcupadosAbiertas,
      enEspera: listaEspera.length,
    };
  }, [staffList, todasActividades, listaEspera]);

  // Navegación de meses
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
    setSelectedCalActId(null);
  };

  // =========================================================================
  // ACCIONES CONTRA ORACLE (PL/SQL)
  // =========================================================================
  const handleCreateActivity = async (mode) => {
    // mode: 'PUBLICADA' | 'PROGRAMADA'
    if (!formTitulo.trim()) {
      showToast('error', 'Ingresa un título para la actividad.');
      return;
    }
    if (!formTipoId) {
      showToast('error', 'Selecciona un tipo de actividad.');
      return;
    }

    setCreatingAct(true);
    try {
      let idUbicacionFinal = Number(formUbicacionId);

      // Si eligió ingresar un lugar nuevo, se crea primero en Mantenedor 5 (Ubicaciones)
      if (useNewPlace) {
        if (!newPlaceCiudadId || !newPlaceNombre.trim()) {
          showToast('error', 'Indica ciudad y nombre del lugar específico.');
          setCreatingAct(false);
          return;
        }
        const ubRes = await api.post('/mantenedores/ubicaciones', {
          id_ciudad: Number(newPlaceCiudadId),
          nombre_lugar: newPlaceNombre.trim(),
          direccion: newPlaceDir.trim() || newPlaceNombre.trim(),
          url_google_maps: newPlaceMaps.trim() || null,
        });
        idUbicacionFinal = ubRes.data.id_ubicacion;
      }

      if (!idUbicacionFinal) {
        showToast('error', 'Selecciona una ubicación válida.');
        setCreatingAct(false);
        return;
      }

      const estadoTarget = estadosAct.find((e) => e.nombre_estado === mode);
      const idEstadoFinal = estadoTarget ? estadoTarget.id_estado_actividad : mode === 'PUBLICADA' ? 3 : 2;

      const payload = {
        titulo: formTitulo.trim(),
        descripcion: formDesc.trim() || null,
        id_tipo_actividad: Number(formTipoId),
        id_ubicacion: idUbicacionFinal,
        id_estado_actividad: idEstadoFinal,
        fecha_actividad: formFecha,
        hora_inicio: formHoraInicio.slice(0, 5),
        cantidad_horas: Number(formHoras),
        cupos_maximos: Number(formCupos),
        fecha_pub_programada: mode === 'PROGRAMADA' ? `${fechaProgramada}:00`.slice(0, 19) : null,
        horas_cierre_postulacion: Number(formHorasCierre),
      };

      await api.post('/mantenedores/actividades', payload);
      showToast(
        'success',
        mode === 'PUBLICADA'
          ? 'Actividad creada y publicada en el calendario Staff.'
          : 'Actividad agendada con publicación programada.'
      );

      setFormTitulo('');
      setFormDesc('');
      setFormHorasCierre(10);
      setNewPlaceNombre('');
      setNewPlaceDir('');
      setNewPlaceMaps('');
      setShowScheduleBox(false);
      setUseNewPlace(false);

      const p = parseIsoDate(formFecha);
      if (p) {
        setMes(p.month);
        setAnio(p.year);
      }
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo crear la actividad.'));
    } finally {
      setCreatingAct(false);
    }
  };

  const handlePublicarActividad = async (idAct) => {
    try {
      const res = await api.post(`/gestores/actividades/${idAct}/publicar`);
      showToast('success', res.data.message);
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleCambiarEstadoAct = async (idAct, nombreEstado) => {
    try {
      const res = await api.patch(`/gestores/actividades/${idAct}/estado`, {
        nombre_estado: nombreEstado,
      });
      showToast('success', res.data.message);
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleEliminarActividad = async (idAct) => {
    if (!window.confirm('¿Eliminar esta actividad permanentemente?')) return;
    try {
      await api.delete(`/mantenedores/actividades/${idAct}`);
      showToast('success', 'Actividad eliminada.');
      setSelectedCalActId(null);
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleResolverEspera = async (idListaEspera, decision) => {
    try {
      const res = await api.post(`/gestores/lista-espera/${idListaEspera}/resolver`, { decision });
      showToast('success', res.data.message);
      await loadDashboardData();
      await loadStaffActPostulaciones(selectedStaffActId);
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handlePromoverListaEspera = async () => {
    if (!selectedStaffActId) return;
    setPromotingWaitlist(true);
    try {
      const res = await api.post(`/gestores/lista-espera/promover/${selectedStaffActId}`);
      showToast('success', res.data.message);
      await loadDashboardData();
      await loadStaffActPostulaciones(selectedStaffActId);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo promover la lista de espera.'));
    } finally {
      setPromotingWaitlist(false);
    }
  };

  const handleLiberarCupo = async (post) => {
  const nombreCompleto = `${post.nombre || post.nombre_staff || 'este Staff'} ${post.apellido || ''}`.trim();
  const confirmado = window.confirm(
    `¿Quitar el cupo a ${nombreCompleto}? Esto liberará 1 cupo para asignar a alguien de la lista de espera.`
  );
  if (!confirmado) return;

  try {
    const res = await api.patch(`/gestores/postulaciones/${post.id_postulacion}/cancelar`);
    showToast('success', res.data.message || 'Cupo liberado correctamente.');
    await loadDashboardData();
    await loadStaffActPostulaciones(selectedStaffActId);
  } catch (err) {
    showToast('error', getErrorMessage(err, 'No se pudo liberar el cupo.'));
  }
};

  const handleAsignarManual = async () => {
    if (!selectedStaffActId || !manualAssignUserId) return;
    try {
      const res = await api.post('/gestores/postulaciones/asignar', {
        id_actividad: selectedStaffActId,
        id_usuario: Number(manualAssignUserId),
      });
      showToast('success', res.data.message);
      setManualAssignUserId('');
      await loadDashboardData();
      await loadStaffActPostulaciones(selectedStaffActId);
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleToggleStaffActivo = async (staff) => {
    const nextActivo = staff.activo === 'S' ? 'N' : 'S';
    try {
      await api.patch(`/gestores/usuarios/${staff.id_usuario}/activo`, { activo: nextActivo });
      showToast(
        'success',
        `${staff.nombre} ${staff.apellido} ${nextActivo === 'S' ? 'activado' : 'desactivado'}.`
      );
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreatingStaff(true);
    try {
      const res = await api.post('/gestores/usuarios/staff', {
        ...newStaff,
        id_carrera: Number(newStaff.id_carrera),
        generacion: Number(newStaff.generacion),
      });
      showToast('success', res.data.message);
      setShowNewStaffModal(false);
      setNewStaff({
        rut: '',
        nombre: '',
        apellido: '',
        correo: '',
        id_carrera: carreras[0] ? String(carreras[0].id_carrera) : '',
        generacion: 2025,
        telefono: '+569',
        password_inicial: 'Ucm2026!',
      });
      await loadDashboardData();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    setDeletingStaff(true);
    try {
      const res = await api.delete(`/gestores/usuarios/staff/${staff.id_usuario}`);
      showToast('success', res.data.message);
      setSelectedStaffModal(null);
      setConfirmDeleteStaff(false);
      await loadDashboardData();
      await loadStaffActPostulaciones(selectedStaffActId);
    } catch (err) {
      showToast('error', getErrorMessage(err, 'No se pudo eliminar al Staff.'));
    } finally {
      setDeletingStaff(false);
    }
  };

  const handleValidarTrabajo = async (post) => {
    const draft = valDrafts[post.id_postulacion];
    if (!draft) return;
    setSavingValId(post.id_postulacion);
    try {
      const hrs = draft.asistio === 'N' ? 0 : Number(draft.horas_efectivas || 0);
      const res = await api.post('/gestores/trabajo/validar', {
        id_postulacion: post.id_postulacion,
        asistio: draft.asistio,
        horas_efectivas: hrs,
        observaciones: draft.observaciones || null,
      });
      showToast('success', res.data.message);
      await loadValPostulaciones(valActId);
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSavingValId(null);
    }
  };

  // Helper para enriquecer filas de postulaciones / lista de espera con datos de staffById
  const resolvePerson = (row) => {
    const s = staffById[row.id_usuario];
    const nombre = s?.nombre || row.nombre || row.nombre_staff || 'Staff';
    const apellido = s?.apellido || row.apellido || '';
    return {
      nombre,
      apellido,
      fullName: `${nombre} ${apellido}`.trim(),
      fotoUrl: s?.foto_url || row.foto_url || null,
      carrera: s?.nombre_carrera || row.nombre_carrera || 'Estudiante UCM',
      generacion: s?.generacion || row.generacion || '',
    };
  };

  const navItems = [
    { id: 'calendario', label: 'Calendario', mobileLabel: 'Calendario', icon: Calendar },
    { id: 'staff', label: 'Gestión Staff', mobileLabel: 'Staff', icon: Users },
    { id: 'validacion', label: 'Validación Horas', mobileLabel: 'Horas', icon: ClipboardCheck },
    { id: 'reportes', label: 'Reportes', mobileLabel: 'Reportes', icon: BarChart3 },
    { id: 'config', label: 'Mantenedores', mobileLabel: 'Config', icon: Settings },
  ];

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="min-h-screen flex bg-[#F1F6FA] text-[#0A1931] pb-20 lg:pb-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handlePhotoChange}
        className="hidden"
      />

      {/* TOAST FLOTANTE */}
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
      {/* SIDEBAR PC (Azul marino institucional + logo PNG oficial blanco)      */}
      {/* ===================================================================== */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0A1931] text-white shrink-0 sticky top-0 h-screen">
        <div className="px-6 pt-7 pb-6 border-b border-white/10">
          <UcmLogo variant="dark" size="sm" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition cursor-pointer ${
                  active
                    ? 'bg-white text-[#0A1931] shadow-md'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-[#00A9E0]' : 'text-slate-400'}`} />
                  {item.label}
                </span>
                {item.id === 'staff' && kpis.enEspera > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      active ? 'bg-amber-100 text-amber-800' : 'bg-amber-500 text-white'
                    }`}
                  >
                    {kpis.enEspera}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

    {/* Perfil Admin inferior + subir foto + cerrar sesión */}
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
            {uploadingPhoto ? 'Subiendo foto...' : 'Administrador UCM · Cambiar foto'}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setShowPasswordModal(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-sky-200 text-xs font-semibold transition cursor-pointer"
      >
        <KeyRound className="w-3.5 h-3.5" />
        Cambiar mi clave
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

      {/* ===================================================================== */}
      {/* CONTENEDOR PRINCIPAL                                                  */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
{/* HEADER MÓVIL (Blanco limpio con logo UCM real a color) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-16 flex items-center justify-between shadow-2xs">
          <UcmLogo variant="light" size="sm" />
          <div className="flex items-center gap-2">
            {activeTab === 'staff' && (
              <button
                type="button"
                onClick={() => setShowNewStaffModal(true)}
                className="px-3 py-1.5 rounded-full bg-[#00A9E0] text-white text-xs font-bold shadow-xs"
              >
                + Staff
              </button>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Cambiar foto"
              className="rounded-full"
            >
              <UserAvatar fotoUrl={user.foto_url} nombre={user.nombre} apellido={user.apellido} size="xs" />
            </button>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
              title="Cambiar mi clave"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-5 lg:py-7">
          {loading ? (
            <div className="py-24 text-center text-slate-500 text-sm">
              Cargando Panel de Administración UCM...
            </div>
          ) : (
            <>
              {/* ============================================================= */}
              {/* TAB 1: CALENDARIO Y NUEVA ACTIVIDAD (panelAdminPC + Cel)      */}
              {/* ============================================================= */}
              {activeTab === 'calendario' && (
                <div className="space-y-6">
                  {/* Banner Bienvenida (panelAdminPC.jpeg) */}
                  <div className="rounded-3xl ucm-banner-gradient px-6 py-5 lg:px-8 lg:py-6 text-white shadow-md flex items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight">
                        ¡Bienvenido, {user.nombre}!
                      </h1>
                      <p className="text-xs lg:text-sm text-sky-100 mt-0.5">{formatFechaHoy()}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                      <button
                        onClick={() => setActiveTab('staff')}
                        className="relative p-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer"
                        title="Solicitudes en Lista de Espera"
                      >
                        <Bell className="w-5 h-5" />
                        {kpis.enEspera > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-[#0A1931] text-[10px] font-extrabold flex items-center justify-center">
                            {kpis.enEspera}
                          </span>
                        )}
                      </button>
<button
                        type="button"
                        disabled={uploadingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        title="Cambiar foto de perfil"
                        className="flex items-center gap-2.5 bg-white/15 hover:bg-white/25 pl-1.5 pr-3.5 py-1.5 rounded-full transition cursor-pointer"
                      >
                        <UserAvatar
                          fotoUrl={user.foto_url}
                          nombre={user.nombre}
                          apellido={user.apellido}
                          size="xs"
                          className="border border-white/60"
                        />
                        <span className="text-xs font-bold">
                          {uploadingPhoto ? 'Subiendo...' : 'Admin UCM'}
                        </span>
                        <Camera className="w-3.5 h-3.5 text-sky-100" />
                      </button>
                    </div>
                  </div>

                  {/* Grid Principal: Calendario (izq) + Nueva Actividad (der) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* CALENDARIO DE ACTIVIDADES */}
                    <section className="xl:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-7">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg lg:text-xl font-extrabold text-[#0A1931]">
                          Calendario de Actividades
                        </h2>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => changeMonth(-1)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-bold text-[#0A1931] min-w-[130px] text-center">
                            {MESES[mes - 1]} {anio}
                          </span>
                          <button
                            onClick={() => changeMonth(1)}
                            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Grilla Calendario */}
                      <div className="rounded-2xl overflow-hidden border border-slate-200/80">
                        <div className="grid grid-cols-7 bg-[#F4F8FB] border-b border-slate-200">
                          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, idx) => (
                            <div
                              key={idx}
                              className="py-2.5 text-center text-xs font-extrabold text-slate-500"
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white">
                          {monthCells.map((day, idx) => {
                            const acts = day ? actividadesPorDia[day] || [] : [];
                            return (
                              <div
                                key={idx}
                                onClick={() => {
                                  if (day) {
                                    const mStr = String(mes).padStart(2, '0');
                                    const dStr = String(day).padStart(2, '0');
                                    setFormFecha(`${anio}-${mStr}-${dStr}`);
                                    if (acts.length > 0) setSelectedCalActId(acts[0].id_actividad);
                                  }
                                }}
                                className={`min-h-[64px] lg:min-h-[82px] p-1.5 border-b border-r border-slate-100 flex flex-col items-center transition ${
                                  day ? 'hover:bg-sky-50/50 cursor-pointer' : 'bg-slate-50/40'
                                }`}
                              >
                                {day && (
                                  <>
                                    <span
                                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                        acts.some((a) => a.id_actividad === selectedCalActId)
                                          ? 'bg-[#00A9E0] text-white'
                                          : 'text-[#0A1931]'
                                      }`}
                                    >
                                      {day}
                                    </span>
                                    {/* En celular: puntos de color; en PC: píldoras con texto */}
                                    <div className="mt-1 flex flex-wrap justify-center gap-1 w-full">
                                      {acts.slice(0, 2).map((act) => (
                                        <button
                                          key={act.id_actividad}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedCalActId(act.id_actividad);
                                          }}
                                          className="cursor-pointer"
                                          title={`${act.titulo} (${act.nombre_estado})`}
                                        >
                                          <span
                                            className={`lg:hidden block w-2 h-2 rounded-full ${getPillStyle(act.nombre_tipo)}`}
                                          />
                                          <span
                                            className={`hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold truncate max-w-[82px] ${getPillStyle(act.nombre_tipo)}`}
                                          >
                                            {shortTypeLabel(act.nombre_tipo)}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Leyenda + Actividades del mes */}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-500">Tipos:</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#00A9E0] text-white font-semibold">
                            Feria
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#1D63B8] text-white font-semibold">
                            Charla
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#169B8C] text-white font-semibold">
                            Visita
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {actividadesMes.length} actividad(es) en {MESES[mes - 1]}
                        </span>
                      </div>

                      {/* Tarjeta de detalle/gestión rápida de la actividad seleccionada */}
                      {selectedCalAct ? (
                        <div className="mt-5 p-4 rounded-2xl bg-[#F4F8FB] border border-[#BAE8FA] space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getPillStyle(selectedCalAct.nombre_tipo)}`}
                                >
                                  {selectedCalAct.nombre_tipo}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                                  {selectedCalAct.nombre_estado}
                                </span>
                              </div>
                              <h3 className="text-sm font-extrabold text-[#0A1931]">
                                {selectedCalAct.titulo}
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {formatFechaCorta(selectedCalAct.fecha_actividad)} ·{' '}
                                {selectedCalAct.hora_inicio} ({selectedCalAct.cantidad_horas}h) ·{' '}
                                {selectedCalAct.nombre_lugar} · Cupos:{' '}
                                <strong>
                                  {selectedCalAct.cupos_ocupados}/{selectedCalAct.cupos_maximos}
                                </strong>
                              </p>
                            </div>
                            <button
                              onClick={() => setSelectedCalActId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {['BORRADOR', 'PROGRAMADA'].includes(selectedCalAct.nombre_estado) && (
                              <button
                                onClick={() => handlePublicarActividad(selectedCalAct.id_actividad)}
                                className="px-3.5 py-1.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold cursor-pointer transition flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Publicar ahora
                              </button>
                            )}
                            {selectedCalAct.nombre_estado === 'PUBLICADA' && (
                              <button
                                onClick={() =>
                                  handleCambiarEstadoAct(selectedCalAct.id_actividad, 'FINALIZADA')
                                }
                                className="px-3.5 py-1.5 rounded-full bg-[#0F9D75] hover:bg-[#0C8260] text-white text-xs font-bold cursor-pointer transition"
                              >
                                Finalizar actividad
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedStaffActId(selectedCalAct.id_actividad);
                                setActiveTab('staff');
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-[#0A1931] cursor-pointer transition"
                            >
                              Ver Staff / Espera
                            </button>
                            <button
                              onClick={() => {
                                setValActId(selectedCalAct.id_actividad);
                                setActiveTab('validacion');
                              }}
                              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-[#0A1931] cursor-pointer transition"
                            >
                              Validar horas
                            </button>
                            {selectedCalAct.cupos_ocupados === 0 && (
                              <button
                                onClick={() => handleEliminarActividad(selectedCalAct.id_actividad)}
                                className="ml-auto p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer"
                                title="Eliminar actividad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        actividadesMes.length > 0 && (
                          <div className="mt-5 space-y-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                              Actividades de {MESES[mes - 1]}
                            </p>
                            {actividadesMes.map((act) => (
                              <button
                                key={act.id_actividad}
                                onClick={() => setSelectedCalActId(act.id_actividad)}
                                className="w-full text-left p-3 rounded-2xl bg-[#F7FAFD] hover:bg-[#E6F7FD]/60 border border-slate-200/80 flex items-center justify-between gap-3 transition cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-[#0A1931] truncate">
                                    {act.titulo}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {formatFechaCorta(act.fecha_actividad)} · {act.nombre_lugar} ·{' '}
                                    {act.cupos_ocupados}/{act.cupos_maximos} cupos
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-slate-600 shrink-0">
                                  {act.nombre_estado}
                                </span>
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </section>

                    {/* FORMULARIO NUEVA ACTIVIDAD (panelAdminPC + panelAdminCel) */}
                    <section className="xl:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-7">
                      <h2 className="text-lg lg:text-xl font-extrabold text-[#0A1931] mb-4">
                        Nueva Actividad
                      </h2>

                      <div className="space-y-4">
                        {/* Pills de Tipo de Actividad */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">
                            Tipo de actividad
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {tiposAct.map((t) => {
                              const active = String(t.id_tipo_actividad) === String(formTipoId);
                              return (
                                <button
                                  key={t.id_tipo_actividad}
                                  type="button"
                                  onClick={() => setFormTipoId(String(t.id_tipo_actividad))}
                                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                                    active
                                      ? 'bg-[#00A9E0] border-[#00A9E0] text-white shadow-xs'
                                      : 'bg-[#F4F8FB] border-slate-200 text-slate-600 hover:border-[#00A9E0]/50'
                                  }`}
                                >
                                  {t.nombre_tipo}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Título y descripción */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Título de la actividad
                          </label>
                          <input
                            type="text"
                            value={formTitulo}
                            onChange={(e) => setFormTitulo(e.target.value)}
                            placeholder="Ej. Feria Vocacional Campus San Miguel"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Descripción (opcional)
                          </label>
                          <input
                            type="text"
                            value={formDesc}
                            onChange={(e) => setFormDesc(e.target.value)}
                            placeholder="Indicaciones breves para el Staff..."
                            className="w-full px-3.5 py-2 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] focus:bg-white"
                          />
                        </div>

                        {/* Ubicación existente o Nuevo lugar */}
                        <div className="p-3.5 rounded-2xl bg-[#F7FAFD] border border-slate-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">Ubicación</label>
                            <button
                              type="button"
                              onClick={() => setUseNewPlace((v) => !v)}
                              className="text-xs font-bold text-[#00A9E0] hover:underline cursor-pointer"
                            >
                              {useNewPlace ? 'Usar lugar existente' : '+ Registrar lugar nuevo'}
                            </button>
                          </div>

                          {!useNewPlace ? (
                            <select
                              value={formUbicacionId}
                              onChange={(e) => setFormUbicacionId(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0]"
                            >
                              {ubicaciones.map((u) => (
                                <option key={u.id_ubicacion} value={u.id_ubicacion}>
                                  {u.nombre_lugar} ({u.nombre_ciudad})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                  Región
                                </label>
                                <select
                                  value={newPlaceRegion}
                                  onChange={(e) => handleRegionChange(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931]"
                                >
                                  {regionesDisponibles.map((reg) => (
                                    <option key={reg} value={reg}>
                                      {reg}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                  Comuna
                                </label>
                                <select
                                  value={newPlaceCiudadId}
                                  onChange={(e) => setNewPlaceCiudadId(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931]"
                                >
                                  {comunasDeRegion.map((c) => (
                                    <option key={c.id_ciudad} value={c.id_ciudad}>
                                      {c.nombre_ciudad}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                              <input
                                type="text"
                                value={newPlaceNombre}
                                onChange={(e) => setNewPlaceNombre(e.target.value)}
                                placeholder="Lugar específico (ej. Campus San Miguel)"
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931]"
                              />
                              <input
                                type="text"
                                value={newPlaceDir}
                                onChange={(e) => setNewPlaceDir(e.target.value)}
                                placeholder="Dirección (ej. Av. San Miguel 3605)"
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931]"
                              />
                              <input
                                type="url"
                                value={newPlaceMaps}
                                onChange={(e) => setNewPlaceMaps(e.target.value)}
                                placeholder="URL de Google Maps (opcional)"
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-[#0A1931]"
                              />
                            </div>
                          )}
                        </div>

                        {/* Fecha y Hora */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Fecha actividad
                            </label>
                            <input
                              type="date"
                              value={formFecha}
                              onChange={(e) => setFormFecha(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Hora inicio
                            </label>
                            <input
                              type="time"
                              value={formHoraInicio}
                              onChange={(e) => setFormHoraInicio(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm text-[#0A1931]"
                            />
                          </div>
                        </div>

                        {/* Contadores Horas y Cupos (estilo panelAdminCel + panelAdminPC) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Horas de trabajo
                            </label>
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[#F7FAFD] border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setFormHoras((h) => Math.max(1, Number((h - 0.5).toFixed(1))))}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-extrabold text-[#0A1931]">{formHoras}h</span>
                              <button
                                type="button"
                                onClick={() => setFormHoras((h) => Math.min(24, Number((h + 0.5).toFixed(1))))}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">
                              Cupos disponibles
                            </label>
                            <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[#F7FAFD] border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setFormCupos((c) => Math.max(1, c - 1))}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-extrabold text-[#0A1931]">{formCupos}</span>
                              <button
                                type="button"
                                onClick={() => setFormCupos((c) => Math.min(100, c + 1))}
                                className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Cierre automático de postulaciones */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Cierre de postulaciones (horas antes del inicio)
                          </label>
                          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-[#F7FAFD] border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setFormHorasCierre((h) => Math.max(0, Number(h) - 1))}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer shrink-0"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="720"
                                step="1"
                                value={formHorasCierre}
                                onChange={(e) => {
                                  const v = Math.max(0, Math.min(720, Number(e.target.value) || 0));
                                  setFormHorasCierre(v);
                                }}
                                className="w-16 text-center text-sm font-extrabold text-[#0A1931] bg-transparent outline-none"
                              />
                              <span className="text-xs font-semibold text-slate-500">hrs antes</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormHorasCierre((h) => Math.min(720, Number(h) + 1))}
                              className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-[#00A9E0] cursor-pointer shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {Number(formHorasCierre) === 0
                              ? 'Las postulaciones se cerrarán a la hora exacta de inicio.'
                              : `Las postulaciones se cerrarán automáticamente ${formHorasCierre}h antes del comienzo (hora oficial Chile).`}
                          </p>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Si los cupos se completan, las nuevas postulaciones pasarán automáticamente a{' '}
                          <strong>Lista de Espera</strong>.
                        </p>

                        {/* Caja opcional de Programar Publicación */}
                        {showScheduleBox && (
                          <div className="p-3.5 rounded-2xl bg-[#E6F7FD]/70 border border-[#BAE8FA] space-y-2.5">
                            <label className="block text-xs font-bold text-[#007AA8]">
                              Fecha y hora de publicación automática
                            </label>
                            <input
                              type="datetime-local"
                              value={fechaProgramada}
                              onChange={(e) => setFechaProgramada(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white border border-[#BAE8FA] text-sm text-[#0A1931]"
                            />
                            <button
                              type="button"
                              disabled={creatingAct}
                              onClick={() => handleCreateActivity('PROGRAMADA')}
                              className="w-full py-2.5 rounded-xl bg-[#0A1931] hover:bg-[#15367A] text-white text-xs font-bold cursor-pointer transition disabled:opacity-60"
                            >
                              {creatingAct ? 'Guardando...' : 'Confirmar programación'}
                            </button>
                          </div>
                        )}

                        {/* Botones Publicar ahora / Programar */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            type="button"
                            disabled={creatingAct}
                            onClick={() => handleCreateActivity('PUBLICADA')}
                            className="py-3 px-4 rounded-full bg-gradient-to-r from-[#0E74C2] to-[#00B4E6] hover:from-[#0B62A6] hover:to-[#009CC9] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#00A9E0]/25 transition cursor-pointer disabled:opacity-60"
                          >
                            {creatingAct ? 'Publicando...' : 'Publicar ahora'}
                          </button>
                          <button
                            type="button"
                            disabled={creatingAct}
                            onClick={() => setShowScheduleBox((v) => !v)}
                            className="py-3 px-4 rounded-full bg-white hover:bg-slate-50 text-[#0A1931] border border-slate-300 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <CalendarClock className="w-4 h-4 text-[#00A9E0]" />
                            Programar
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 2: GESTIÓN DE STAFF Y LISTA DE ESPERA                     */}
              {/* (Exacto a GestionStaffAdminPC.jpeg y GestionStaffAdminCel)    */}
              {/* ============================================================= */}
              {activeTab === 'staff' && (
                <div className="space-y-6">
                  {/* Cabecera PC */}
                  <div className="hidden lg:flex items-center justify-between gap-4">
                    <h1 className="text-2xl font-extrabold text-[#0A1931] tracking-tight">
                      Gestión de Staff y Actividades
                    </h1>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={staffSearch}
                          onChange={(e) => setStaffSearch(e.target.value)}
                          placeholder="Buscar Staff o carrera..."
                          className="pl-9 pr-4 py-2 rounded-full bg-white border border-slate-200 text-sm text-[#0A1931] focus:outline-none focus:border-[#00A9E0] w-64"
                        />
                      </div>
                      <button
                        onClick={() => setShowNewStaffModal(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-sm font-bold shadow-md shadow-[#00A9E0]/25 transition cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        Crear Credencial Staff
                      </button>
                    </div>
                  </div>

                  {/* 3 KPI CARDS PC (Degradados suaves exactos a GestionStaffAdminPC) */}
                  <div className="hidden lg:grid grid-cols-3 gap-5">
                    <div className="rounded-3xl p-6 bg-gradient-to-r from-white via-white to-[#D8F3E8] border border-emerald-200/70 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">Staff Activo:</p>
                        <p className="text-3xl font-extrabold text-[#0A1931] mt-1">{kpis.staffActivos}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#0F9D75] text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-white via-white to-[#DBEAFE] border border-sky-200/70 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">Cupos Confirmados (Abiertas):</p>
                        <p className="text-3xl font-extrabold text-[#0A1931] mt-1">
                          {kpis.cuposOcupadosAbiertas}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-white via-white to-[#FEF0C7] border border-amber-200/80 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600">En Lista de Espera:</p>
                        <p className="text-3xl font-extrabold text-[#0A1931] mt-1">{kpis.enEspera}</p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-[#D9941E] text-white flex items-center justify-center text-lg font-extrabold shadow-md shadow-amber-600/20">
                        {kpis.enEspera}
                      </div>
                    </div>
                  </div>

                  {/* SUB-PESTAÑAS MÓVIL (Exactas a GestionStaffAdminCel.jpeg) */}
                  <div className="lg:hidden bg-white rounded-2xl border border-slate-200 p-1.5 grid grid-cols-3 gap-1">
                    {[
                      { id: 'disponibles', label: 'Disponibles' },
                      { id: 'asignados', label: 'Asignados' },
                      { id: 'espera', label: `Espera (${listaEspera.length})` },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setMobileStaffSubTab(t.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition ${
                          mobileStaffSubTab === t.id
                            ? t.id === 'espera'
                              ? 'bg-amber-50 text-amber-800 border-b-2 border-amber-500'
                              : 'bg-[#E6F7FD] text-[#007AA8] border-b-2 border-[#00A9E0]'
                            : 'text-slate-500'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* VISTA MÓVIL GESTIÓN STAFF (Exacta a GestionStaffAdminCel.jpeg) */}
                  <div className="lg:hidden space-y-4">
                    {/* Selector + Banner azul de actividad */}
                    {(mobileStaffSubTab === 'espera' || mobileStaffSubTab === 'asignados') && (
                      <div className="space-y-2.5">
                        <select
                          value={selectedStaffActId || ''}
                          onChange={(e) => setSelectedStaffActId(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931]"
                        >
                          {todasActividades.map((a) => (
                            <option key={a.id_actividad} value={a.id_actividad}>
                              {a.titulo} ({a.cupos_ocupados}/{a.cupos_maximos})
                            </option>
                          ))}
                        </select>

                        {selectedStaffAct && (
                          <div className="rounded-2xl ucm-banner-gradient p-4 text-white shadow-sm">
                            <div className="text-base font-extrabold leading-snug">
                              {selectedStaffAct.titulo} — {selectedStaffAct.cupos_ocupados}/
                              {selectedStaffAct.cupos_maximos}
                            </div>
                            <div className="text-xs text-sky-100 mt-0.5 font-semibold">
                              {selectedStaffAct.cupos_disponibles <= 0
                                ? 'Cupos llenos'
                                : `${selectedStaffAct.cupos_disponibles} cupos disponibles`}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Móvil: Lista de Espera */}
                    {mobileStaffSubTab === 'espera' && (
                      <div className="space-y-3">
                        {esperaDeActividad.length > 0 && selectedStaffAct && (
                          <button
                            type="button"
                            disabled={promotingWaitlist || selectedStaffAct.cupos_disponibles <= 0}
                            onClick={handlePromoverListaEspera}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition ${
                              selectedStaffAct.cupos_disponibles > 0
                                ? 'bg-[#0F9D75] hover:bg-[#0C8260] text-white shadow-xs cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            {promotingWaitlist
                              ? 'Promoviendo...'
                              : selectedStaffAct.cupos_disponibles > 0
                                ? `Promover por orden de llegada (${selectedStaffAct.cupos_disponibles} cupo(s) libre(s))`
                                : 'Sin cupos libres para promoción automática'}
                          </button>
                        )}
                        {esperaDeActividad.length === 0 ? (
                          <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
                            No hay solicitudes pendientes en lista de espera para esta actividad.
                          </div>
                        ) : (
                          esperaDeActividad.map((item) => {
                            const p = resolvePerson(item);
                            return (
                              <div
                                key={item.id_lista_espera}
                                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-4"
                              >
                                <div className="flex items-center gap-3.5">
                                  <UserAvatar
                                    fotoUrl={p.fotoUrl}
                                    nombre={p.nombre}
                                    apellido={p.apellido}
                                    size="md"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-base font-extrabold text-[#0A1931] truncate">
                                      {p.fullName}
                                    </div>
                                    <div className="text-xs text-slate-600 truncate">{p.carrera}</div>
                                    {p.generacion && (
                                      <div className="text-xs text-slate-400">Gen {p.generacion}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                  <button
                                    onClick={() => handleResolverEspera(item.id_lista_espera, 'ACEPTADA')}
                                    className="py-2.5 rounded-xl bg-[#0F9D75] text-white text-sm font-bold shadow-xs"
                                  >
                                    Asignar
                                  </button>
                                  <button
                                    onClick={() => handleResolverEspera(item.id_lista_espera, 'RECHAZADA')}
                                    className="py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold"
                                  >
                                    Rechazar
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Móvil: Asignados */}
                    {mobileStaffSubTab === 'asignados' && (
                      <div className="space-y-2.5">
                        {actPostulaciones.filter((p) => p.estado_postulacion !== 'CANCELADA').length === 0 ? (
                          <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-400 border border-slate-200">
                            Sin Staff asignado aún en esta actividad.
                          </div>
                        ) : (
                          actPostulaciones
                            .filter((p) => p.estado_postulacion !== 'CANCELADA')
                            .map((row) => {
                              const p = resolvePerson(row);
                              return (
                                <div
                                  key={row.id_postulacion}
                                  className="bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      onChange={() => handleLiberarCupo({ ...row, ...p })}
                                      title="Desmarcar para liberar este cupo"
                                      className="w-4 h-4 rounded accent-[#1D356A] hover:accent-red-600 cursor-pointer shrink-0"
                                    />
                                    <UserAvatar
                                      fotoUrl={p.fotoUrl}
                                      nombre={p.nombre}
                                      apellido={p.apellido}
                                      size="sm"
                                    />
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold text-[#0A1931] truncate">
                                        {p.fullName}
                                      </div>
                                      <div className="text-xs text-slate-500 truncate">{p.carrera}</div>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-full bg-[#0F9D75] text-white text-[11px] font-bold shrink-0">
                                    {row.estado_postulacion}
                                  </span>
                                </div>
                              );
                            })
                        )}
                      </div>
                    )}

                    {/* Móvil: Disponibles / Staff Registrado */}
                    {mobileStaffSubTab === 'disponibles' && (
                      <div className="space-y-2.5">
                        {filteredStaff.map((s) => (
                          <div
  key={s.id_usuario}
  onClick={() => {
    setSelectedStaffModal(s);
    setConfirmDeleteStaff(false);
  }}
  className="bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-3 active:bg-[#F4F8FB] cursor-pointer"
>
                            <div className="flex items-center gap-3 min-w-0">
                              <UserAvatar
                                fotoUrl={s.foto_url}
                                nombre={s.nombre}
                                apellido={s.apellido}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-[#0A1931] truncate">
                                  {s.nombre} {s.apellido}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {s.nombre_carrera || 'UCM'} · Gen {s.generacion || '—'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleStaffActivo(s); }}
                              className={`px-3 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                                s.activo === 'S'
                                  ? 'bg-[#00A9E0] text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {s.activo === 'S' ? 'Activo' : 'Inactivo'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* VISTA PC: TABLA STAFF REGISTRADO (izq) + PANEL LISTA DE ESPERA (der) */}
                  <div className="hidden lg:grid grid-cols-12 gap-6 items-start">
                    {/* Tabla Staff Registrado */}
                    <section className="col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-extrabold text-[#0A1931]">Staff Registrado</h2>
                        <span className="text-xs font-semibold text-slate-500">
                          {filteredStaff.length} estudiantes
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#F4F8FB] text-xs font-bold text-slate-600 border-b border-slate-200">
                              <th className="py-3 px-3 rounded-l-xl">Nombre</th>
                              <th className="py-3 px-3">Carrera</th>
                              <th className="py-3 px-3">RUT / Contacto</th>
                              <th className="py-3 px-3 rounded-r-xl text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredStaff.map((s) => (<tr
  key={s.id_usuario}
  onClick={() => {
    setSelectedStaffModal(s);
    setConfirmDeleteStaff(false);
  }}
  className="hover:bg-[#E6F7FD]/50 transition cursor-pointer"
>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-3">
                                    <UserAvatar
                                      fotoUrl={s.foto_url}
                                      nombre={s.nombre}
                                      apellido={s.apellido}
                                      size="sm"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-[#0A1931] truncate">
                                        {s.nombre} {s.apellido}
                                      </div>
                                      <div className="text-xs text-slate-400 truncate">{s.correo}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-xs font-semibold text-slate-700">
                                    {s.nombre_carrera || '—'}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    Gen {s.generacion || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-xs font-medium text-slate-700">{s.rut}</div>
                                  <div className="text-[11px] text-slate-400">{s.telefono || '—'}</div>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleStaffActivo(s); }}
                                    title="Clic para activar o desactivar"
                                    className={`px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                      s.activo === 'S'
                                        ? s.estado_disponibilidad === 'OCUPADO'
                                          ? 'bg-amber-400 text-[#0A1931]'
                                          : 'bg-[#00A9E0] hover:bg-[#0092C4] text-white'
                                        : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                                    }`}
                                  >
                                    {s.activo === 'S'
                                      ? s.estado_disponibilidad === 'OCUPADO'
                                        ? 'Ocupado'
                                        : 'Disponible'
                                      : 'Inactivo'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Panel Derecho Amarillo: Actividad + Cupos + Lista de Espera */}
                    <aside className="col-span-5 rounded-3xl bg-white border-2 border-amber-300/80 shadow-sm overflow-hidden">
                      <div className="bg-amber-50/90 px-5 py-4 border-b border-amber-200/80 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                            Control de Cupos
                          </span>
                          {selectedStaffAct && (
                            <span className="px-2.5 py-0.5 rounded-full bg-white border border-amber-300 text-xs font-extrabold text-[#0A1931]">
                              Cupos {selectedStaffAct.cupos_ocupados}/{selectedStaffAct.cupos_maximos}
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedStaffActId || ''}
                          onChange={(e) => setSelectedStaffActId(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300/80 text-sm font-bold text-[#0A1931] focus:outline-none"
                        >
                          {todasActividades.map((a) => (
                            <option key={a.id_actividad} value={a.id_actividad}>
                              {a.titulo} ({a.cupos_ocupados}/{a.cupos_maximos})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Inscritos / Asignados */}
                      <div className="p-5 space-y-3">
                        <div className="space-y-2.5">
                          {actPostulaciones.filter((p) => p.estado_postulacion !== 'CANCELADA').length ===
                          0 ? (
                            <p className="text-xs text-slate-400 py-2">
                              Sin Staff confirmado en esta actividad.
                            </p>
                          ) : (
                            actPostulaciones
                              .filter((p) => p.estado_postulacion !== 'CANCELADA')
                              .map((row) => {
                                const p = resolvePerson(row);
                                return (
                                  <div
                                    key={row.id_postulacion}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={true}
                                        onChange={() => handleLiberarCupo({ ...row, ...p })}
                                        title="Desmarcar para liberar este cupo"
                                        className="w-4 h-4 rounded accent-[#1D356A] hover:accent-red-600 cursor-pointer shrink-0"
                                      />
                                      <UserAvatar
                                        fotoUrl={p.fotoUrl}
                                        nombre={p.nombre}
                                        apellido={p.apellido}
                                        size="xs"
                                      />
                                      <span className="text-sm font-bold text-[#0A1931] truncate">
                                        {p.fullName}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                      {row.estado_postulacion}
                                    </span>
                                  </div>
                                );
                              })
                          )}
                        </div>

                        {/* Asignación manual directa por Admin */}
                        {selectedStaffAct && selectedStaffAct.cupos_disponibles > 0 && (
                          <div className="pt-3 border-t border-slate-100 flex gap-2">
                            <select
                              value={manualAssignUserId}
                              onChange={(e) => setManualAssignUserId(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl bg-[#F4F8FB] border border-slate-200 text-xs text-[#0A1931]"
                            >
                              <option value="">Asignar Staff manualmente...</option>
                              {staffList
                                .filter((s) => s.activo === 'S')
                                .map((s) => (
                                  <option key={s.id_usuario} value={s.id_usuario}>
                                    {s.nombre} {s.apellido}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              disabled={!manualAssignUserId}
                              onClick={handleAsignarManual}
                              className="px-3.5 py-2 rounded-xl bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                            >
                              Asignar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sección Lista de Espera */}
                      <div className="bg-amber-50/70 px-5 py-2.5 border-y border-amber-200/80 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-[#0A1931]">Lista de Espera</span>
                        <span className="text-xs font-bold text-amber-800">
                          {esperaDeActividad.length} pendiente(s)
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        {esperaDeActividad.length > 0 && selectedStaffAct && (
                          <button
                            type="button"
                            disabled={promotingWaitlist || selectedStaffAct.cupos_disponibles <= 0}
                            onClick={handlePromoverListaEspera}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition ${
                              selectedStaffAct.cupos_disponibles > 0
                                ? 'bg-[#0F9D75] hover:bg-[#0C8260] text-white shadow-xs cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            }`}
                          >
                            {promotingWaitlist
                              ? 'Promoviendo desde lista de espera...'
                              : selectedStaffAct.cupos_disponibles > 0
                                ? `Promover por orden de llegada (${selectedStaffAct.cupos_disponibles} cupo(s) libre(s))`
                                : 'Libera un cupo para promover automáticamente'}
                          </button>
                        )}
                        {esperaDeActividad.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-3">
                            No hay estudiantes esperando cupo en esta actividad.
                          </p>
                        ) : (
                          esperaDeActividad.map((item) => {
                            const p = resolvePerson(item);
                            return (
                              <div
                                key={item.id_lista_espera}
                                className="flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <UserAvatar
                                    fotoUrl={p.fotoUrl}
                                    nombre={p.nombre}
                                    apellido={p.apellido}
                                    size="xs"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-bold text-[#0A1931] truncate">
                                      {p.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">{p.carrera}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleResolverEspera(item.id_lista_espera, 'ACEPTADA')}
                                    className="px-3 py-1.5 rounded-full bg-[#0F9D75] hover:bg-[#0C8260] text-white text-xs font-bold transition cursor-pointer"
                                  >
                                    Asignar cupo
                                  </button>
                                  <button
                                    onClick={() => handleResolverEspera(item.id_lista_espera, 'RECHAZADA')}
                                    className="p-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition cursor-pointer"
                                    title="Rechazar solicitud"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </aside>
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TAB 3: VALIDACIÓN DE ASISTENCIA Y HORAS (Gestor 5 PL/SQL)     */}
              {/* ============================================================= */}
              {activeTab === 'validacion' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl lg:text-2xl font-extrabold text-[#0A1931]">
                        Validación de Asistencia y Horas
                      </h1>
                      <p className="text-xs lg:text-sm text-slate-500">
                        Certifica asistencia y horas efectivas trabajadas por el Staff en cada actividad.
                      </p>
                    </div>
                    <select
                      value={valActId || ''}
                      onChange={(e) => setValActId(Number(e.target.value))}
                      className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-bold text-[#0A1931] shadow-2xs max-w-md"
                    >
                      {todasActividades.map((a) => (
                        <option key={a.id_actividad} value={a.id_actividad}>
                          [{a.nombre_estado}] {a.titulo} ({formatFechaCorta(a.fecha_actividad)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
                    {valPostulaciones.filter((p) => p.estado_postulacion !== 'CANCELADA').length === 0 ? (
                      <div className="py-12 text-center text-sm text-slate-400">
                        Esta actividad no tiene Staff confirmado para validar.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {valPostulaciones
                          .filter((p) => p.estado_postulacion !== 'CANCELADA')
                          .map((post) => {
                            const person = resolvePerson(post);
                            const draft = valDrafts[post.id_postulacion] || {
                              asistio: 'S',
                              horas_efectivas: 4,
                              observaciones: '',
                            };
                            const yaValidado = post.asistio === 'S' || post.asistio === 'N';

                            return (
                              <div
                                key={post.id_postulacion}
                                className="p-4 rounded-2xl bg-[#F7FAFD] border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
                              >
                                <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
                                  <UserAvatar
                                    fotoUrl={person.fotoUrl}
                                    nombre={person.nombre}
                                    apellido={person.apellido}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-sm font-extrabold text-[#0A1931] truncate">
                                      {person.fullName}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{person.carrera}</div>
                                    {yaValidado && (
                                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#E7F7F2] text-[#0B7A5A] text-[10px] font-bold">
                                        Validado ({post.asistio === 'S' ? `${post.horas_efectivas}h` : 'Inasistencia'})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                    ¿Asistió?
                                  </label>
                                  <select
                                    value={draft.asistio}
                                    onChange={(e) =>
                                      setValDrafts((prev) => ({
                                        ...prev,
                                        [post.id_postulacion]: {
                                          ...draft,
                                          asistio: e.target.value,
                                          horas_efectivas:
                                            e.target.value === 'N' ? 0 : draft.horas_efectivas,
                                        },
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931]"
                                  >
                                    <option value="S">Sí, asistió</option>
                                    <option value="N">No asistió</option>
                                  </select>
                                </div>

                                <div className="lg:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                    Horas efectivas
                                  </label>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    disabled={draft.asistio === 'N'}
                                    value={draft.horas_efectivas}
                                    onChange={(e) =>
                                      setValDrafts((prev) => ({
                                        ...prev,
                                        [post.id_postulacion]: {
                                          ...draft,
                                          horas_efectivas: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0A1931] disabled:bg-slate-100"
                                  />
                                </div>

                                <div className="lg:col-span-3">
                                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                                    Observaciones
                                  </label>
                                  <input
                                    type="text"
                                    value={draft.observaciones}
                                    onChange={(e) =>
                                      setValDrafts((prev) => ({
                                        ...prev,
                                        [post.id_postulacion]: {
                                          ...draft,
                                          observaciones: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="Ej. Cumplió turno completo"
                                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0A1931]"
                                  />
                                </div>

                                <div className="lg:col-span-1 flex lg:justify-end">
                                  <button
                                    type="button"
                                    disabled={savingValId === post.id_postulacion}
                                    onClick={() => handleValidarTrabajo(post)}
                                    className="w-full lg:w-auto px-4 py-2 rounded-xl bg-[#0F9D75] hover:bg-[#0C8260] text-white text-xs font-bold transition cursor-pointer disabled:opacity-60"
                                  >
                                    {savingValId === post.id_postulacion ? '...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* TABS 4 Y 5 (Puente listo para Entrega 4: Reportes + CRUDs)    */}
              {/* ============================================================= */}
            {activeTab === 'reportes' && <ReportesView />}
              {activeTab === 'config' && <MantenedoresView />}
            </>
          )}
        </main>
      </div>


    {/* ===================================================================== */}
      {/* MODAL: CREAR CREDENCIAL STAFF (pkg_gest_usuarios.crear_staff_completo)*/}
      {/* ===================================================================== */}
      {showNewStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-[#0A1931]">Crear Credencial Staff</h2>
                <p className="text-xs text-slate-500">
                  El estudiante deberá cambiar su contraseña en su primer ingreso.
                </p>
              </div>
              <button
                onClick={() => setShowNewStaffModal(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:text-[#0A1931] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">RUT</label>
                  <input
                    type="text"
                    required
                    value={newStaff.rut}
                    onChange={(e) => setNewStaff({ ...newStaff, rut: e.target.value })}
                    placeholder="21.555.444-3"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Correo UCM</label>
                  <input
                    type="email"
                    required
                    value={newStaff.correo}
                    onChange={(e) => setNewStaff({ ...newStaff, correo: e.target.value })}
                    placeholder="estudiante@alu.ucm.cl"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={newStaff.nombre}
                    onChange={(e) => setNewStaff({ ...newStaff, nombre: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={newStaff.apellido}
                    onChange={(e) => setNewStaff({ ...newStaff, apellido: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Carrera</label>
                <select
                  required
                  value={newStaff.id_carrera}
                  onChange={(e) => setNewStaff({ ...newStaff, id_carrera: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                >
                  {carreras.map((c) => (
                    <option key={c.id_carrera} value={c.id_carrera}>
                      {c.nombre_carrera}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Generación</label>
                  <input
                    type="number"
                    required
                    min="2015"
                    max="2035"
                    value={newStaff.generacion}
                    onChange={(e) => setNewStaff({ ...newStaff, generacion: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newStaff.telefono}
                    onChange={(e) => setNewStaff({ ...newStaff, telefono: e.target.value })}
                    placeholder="+56912345678"
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
                  value={newStaff.password_inicial}
                  onChange={(e) => setNewStaff({ ...newStaff, password_inicial: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7FAFD] border border-slate-200 text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewStaffModal(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="px-6 py-2.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-sm font-bold shadow-md cursor-pointer disabled:opacity-60"
                >
                  {creatingStaff ? 'Creando...' : 'Crear cuenta Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {/* ===================================================================== */}
      {/* MODAL: FICHA DE STAFF + ELIMINACIÓN PERMANENTE                        */}
      {/* ===================================================================== */}
      {selectedStaffModal && (
        <div
          onClick={() => {
            setSelectedStaffModal(null);
            setConfirmDeleteStaff(false);
          }}
          className="fixed inset-0 z-50 bg-[#0A1931]/55 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Cabecera azul UCM */}
            <div className="h-20 ucm-banner-gradient relative">
              <button
                type="button"
                onClick={() => {
                  setSelectedStaffModal(null);
                  setConfirmDeleteStaff(false);
                }}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Datos principales */}
            <div className="px-6 pb-6">
            <div className="-mt-11 relative z-10 flex items-end justify-between gap-3">
                <UserAvatar
                  fotoUrl={selectedStaffModal.foto_url}
                  nombre={selectedStaffModal.nombre}
                  apellido={selectedStaffModal.apellido}
                  size="lg"
                  className="border-4 border-white shadow-md bg-white"
                />
                <span
                  className={`mb-1 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedStaffModal.activo === 'S'
                      ? 'bg-[#E7F7F2] text-[#0B7A5A]'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedStaffModal.activo === 'S' ? 'Cuenta Activa' : 'Cuenta Inactiva'}
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-xl font-extrabold text-[#0A1931]">
                  {selectedStaffModal.nombre} {selectedStaffModal.apellido}
                </h2>
                <p className="text-xs text-slate-500">{selectedStaffModal.correo}</p>
              </div>

              {/* Ficha informativa */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#F4F8FB] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase text-slate-400">RUT</div>
                  <div className="font-bold text-[#0A1931] mt-0.5">{selectedStaffModal.rut}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Teléfono</div>
                  <div className="font-bold text-[#0A1931] mt-0.5">
                    {selectedStaffModal.telefono || 'Sin registro'}
                  </div>
                </div>
                <div className="col-span-2 p-3 rounded-xl bg-[#F4F8FB] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Carrera y Generación</div>
                  <div className="font-bold text-[#0A1931] mt-0.5">
                    {selectedStaffModal.nombre_carrera || 'UCM'} · Gen {selectedStaffModal.generacion || '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Disponibilidad</div>
                  <div className="font-bold text-[#0086B8] mt-0.5">
                    {selectedStaffModal.estado_disponibilidad || 'DISPONIBLE'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#F4F8FB] border border-slate-200/70">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Registro</div>
                  <div className="font-bold text-[#0A1931] mt-0.5">
                    {formatFechaCorta(selectedStaffModal.fecha_creacion)}
                  </div>
                </div>
              </div>

              {/* Confirmación inline de borrado total */}
              {confirmDeleteStaff ? (
                <div className="mt-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                  <p className="text-xs text-red-800 leading-relaxed">
                    <strong>¿Desvincular y eliminar permanentemente?</strong> Se borrará su acceso,
                    postulaciones, lista de espera, disponibilidad y registros de horas de Oracle.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={deletingStaff}
                      onClick={() => setConfirmDeleteStaff(false)}
                      className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={deletingStaff}
                      onClick={() => handleDeleteStaff(selectedStaffModal)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingStaff ? 'Eliminando...' : 'Sí, eliminar todo'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Botón pequeño en rojo para eliminación total */}
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteStaff(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Staff
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleToggleStaffActivo(selectedStaffModal);
                        setSelectedStaffModal((prev) =>
                          prev ? { ...prev, activo: prev.activo === 'S' ? 'N' : 'S' } : null
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      {selectedStaffModal.activo === 'S' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStaffModal(null)}
                      className="px-4 py-1.5 rounded-lg bg-[#0A1931] hover:bg-[#15367A] text-white text-xs font-bold transition cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* BARRA INFERIOR MÓVIL                                                  */}
      {/* ===================================================================== */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-[0_-4px_16px_-6px_rgba(10,25,49,0.08)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition ${
                active ? 'text-[#00A9E0]' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.mobileLabel}</span>
              {item.id === 'staff' && kpis.enEspera > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                  {kpis.enEspera}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <ChangePasswordModal
  open={showPasswordModal}
  onClose={() => setShowPasswordModal(false)}
  onSuccess={(msg) => showToast('success', msg)}
/>
      
    </div>

    
  );
}