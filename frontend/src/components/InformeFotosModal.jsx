import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  Image as ImageIcon,
  MessageSquareQuote,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import api, { getErrorMessage, resolveAssetUrl } from '../api/client';
import UserAvatar from './UserAvatar';
import { getProcesoStyle } from '../utils/statusStyles';

function formatFechaCorta(raw) {
  if (!raw) return '';
  const part = String(raw).slice(0, 10);
  const [y, m, d] = part.split('-');
  if (!y || !m || !d) return part;
  return `${d}/${m}/${y}`;
}

export default function InformeFotosModal({ open, actividad, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [onlyWithContent, setOnlyWithContent] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const loadInforme = useCallback(async () => {
    if (!actividad?.id_actividad) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/gestores/actividades/${actividad.id_actividad}/informe-staff`);
      setData(res.data || null);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el informe y fotos de la actividad.'));
    } finally {
      setLoading(false);
    }
  }, [actividad?.id_actividad]);

  useEffect(() => {
    if (open && actividad?.id_actividad) {
      setLightboxIndex(null);
      setOnlyWithContent(false);
      loadInforme();
    }
  }, [open, actividad?.id_actividad, loadInforme]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) {
          setLightboxIndex(null);
        } else {
          onClose?.();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, lightboxIndex, onClose]);

  const registros = data?.registros || [];

  const filteredRegistros = useMemo(() => {
    if (!onlyWithContent) return registros;
    return registros.filter(
      (r) => Boolean(r.comentario_experiencia) || (r.fotos && r.fotos.length > 0),
    );
  }, [registros, onlyWithContent]);

  const allPhotos = useMemo(() => {
    const flat = [];
    registros.forEach((r) => {
      (r.fotos || []).forEach((f) => {
        flat.push({
          ...f,
          staffNombre: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
          comentario: r.comentario_experiencia || '',
        });
      });
    });
    return flat;
  }, [registros]);

  const handleDownloadAll = () => {
    allPhotos.forEach((foto, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = resolveAssetUrl(foto.download_url);
        a.download = foto.nombre_archivo || `foto_${foto.id_foto}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 280);
    });
  };

  if (!open || !actividad) return null;

  const activeLightboxPhoto = lightboxIndex !== null ? allPhotos[lightboxIndex] : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#0A1931]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#F7FAFD] to-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1] text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              <Camera className="w-3 h-3" />
              Informe y fotos Staff
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0A1931] leading-snug truncate">
              {actividad.titulo}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatFechaCorta(actividad.fecha_actividad)}
              {actividad.hora_inicio ? ` · ${actividad.hora_inicio}` : ''}
              {actividad.nombre_lugar ? ` · ${actividad.nombre_lugar}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={loadInforme}
              disabled={loading}
              title="Actualizar"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de métricas y acciones */}
        <div className="px-5 sm:px-6 py-3 bg-[#F8FBFD] border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-[#0A1931]">
              <Users className="w-3.5 h-3.5 text-[#00A9E0]" />
              {data?.total_participantes ?? 0} Staff
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-bold text-[#4338CA]">
              <MessageSquareQuote className="w-3.5 h-3.5" />
              {data?.total_comentarios ?? 0} experiencia(s)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F6F0] border border-[#A7E3CE] text-xs font-bold text-[#0F7657]">
              <ImageIcon className="w-3.5 h-3.5" />
              {data?.total_fotos ?? 0} foto(s)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyWithContent((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                onlyWithContent
                  ? 'bg-[#0A1931] text-white border-[#0A1931]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {onlyWithContent ? 'Mostrando solo aportes' : 'Filtrar con aportes'}
            </button>

            {allPhotos.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar todas ({allPhotos.length})
              </button>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Cargando informes y fotografías desde Oracle...
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0A1931]">
                {onlyWithContent
                  ? 'Ningún Staff ha subido comentarios ni fotos todavía.'
                  : 'Esta actividad aún no tiene Staff inscritos.'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cuando los estudiantes compartan su experiencia y fotos de recuerdo, aparecerán aquí listas para descargar y publicar en Instagram.
              </p>
            </div>
          ) : (
            filteredRegistros.map((r) => {
              const procesoKey =
                r.asistio === 'S'
                  ? 'VALIDADA'
                  : r.asistio === 'N'
                    ? 'INASISTENCIA'
                    : r.nombre_tipo_postulacion === 'ASIGNADO'
                      ? 'ASIGNADA'
                      : r.estado_postulacion;
              const pStyle = getProcesoStyle(procesoKey);
              const fotos = r.fotos || [];

              return (
                <article
                  key={r.id_postulacion}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5"
                >
                  {/* Fila Staff */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        fotoUrl={r.foto_url}
                        nombre={r.nombre}
                        apellido={r.apellido}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[#0A1931] truncate">
                          {r.nombre} {r.apellido}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {r.nombre_carrera || 'Staff UCM'} · {r.correo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${pStyle.badge}`}>
                        {r.asistio === 'S'
                          ? `Validada · ${r.horas_efectivas}h`
                          : pStyle.label}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                        {fotos.length}/5 fotos
                      </span>
                    </div>
                  </div>

                  {/* Comentario experiencia */}
                  {r.comentario_experiencia ? (
                    <div className="rounded-xl bg-[#F4F8FB] border border-slate-200/70 px-4 py-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#0086B8] mb-1">
                        Experiencia del Staff
                      </div>
                      <p className="text-xs sm:text-sm text-[#0A1931] leading-relaxed whitespace-pre-line">
                        {r.comentario_experiencia}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">
                      Sin comentario de experiencia registrado aún.
                    </p>
                  )}

                  {/* Galería de fotos */}
                  {fotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
                      {fotos.map((foto) => {
                        const globalIdx = allPhotos.findIndex((p) => p.id_foto === foto.id_foto);
                        return (
                          <div
                            key={foto.id_foto}
                            className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
                          >
                            <button
                              type="button"
                              onClick={() => setLightboxIndex(globalIdx >= 0 ? globalIdx : 0)}
                              className="w-full h-full block cursor-pointer"
                              title="Ver foto en grande"
                            >
                              <img
                                src={resolveAssetUrl(foto.url)}
                                alt={foto.nombre_archivo}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                              />
                            </button>
                            <a
                              href={resolveAssetUrl(foto.download_url)}
                              download={foto.nombre_archivo}
                              onClick={(e) => e.stopPropagation()}
                              title={`Descargar ${foto.nombre_archivo}`}
                              className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A1931]/85 hover:bg-[#00A9E0] text-white text-[10px] font-bold shadow-md backdrop-blur-xs transition"
                            >
                              <Download className="w-3 h-3" />
                              Bajar
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Lightbox para previsualizar en grande */}
      {activeLightboxPhoto && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setLightboxIndex(null);
          }}
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full flex flex-col items-center gap-3"
          >
            <div className="w-full flex items-center justify-between text-white text-xs sm:text-sm">
              <div className="truncate">
                <span className="font-bold">{activeLightboxPhoto.staffNombre}</span>
                <span className="text-slate-300 ml-2">
                  ({lightboxIndex + 1} / {allPhotos.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveAssetUrl(activeLightboxPhoto.download_url)}
                  download={activeLightboxPhoto.nombre_archivo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00A9E0] hover:bg-[#0092C4] text-white text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar para IG
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center w-full">
              {allPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length)
                  }
                  className="absolute left-2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              <img
                src={resolveAssetUrl(activeLightboxPhoto.url)}
                alt={activeLightboxPhoto.nombre_archivo}
                className="max-h-[76vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />

              {allPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex((prev) => (prev + 1) % allPhotos.length)}
                  className="absolute right-2 p-2.5 rounded-full bg-black/55 hover:bg-black/80 text-white cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
