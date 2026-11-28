// Paleta unificada en tonos pastel suaves (1 color por proceso / estado)

export const PROCESO_STYLES = {
  VALIDADA: {
    label: 'Validada',
    badge: 'bg-[#E6F6F0] border border-[#A7E3CE] text-[#0F7657]',
    cell: 'bg-[#E6F6F0] text-[#0F7657]',
    dot: 'bg-[#0F7657]',
    accent: 'bg-[#6CC9A8]',
  },
  CONFIRMADA: {
    label: 'Confirmada',
    badge: 'bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1]',
    cell: 'bg-[#E6F5FC] text-[#0369A1]',
    dot: 'bg-[#0369A1]',
    accent: 'bg-[#6CC3EB]',
  },
  ASIGNADA: {
    label: 'Asignada',
    badge: 'bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA]',
    cell: 'bg-[#EEF2FF] text-[#4338CA]',
    dot: 'bg-[#4338CA]',
    accent: 'bg-[#8F9CF5]',
  },
  PENDIENTE: {
    label: 'Lista de espera',
    badge: 'bg-[#FEF7E6] border border-[#F5D68E] text-[#9A6700]',
    cell: 'bg-[#FEF7E6] text-[#9A6700]',
    dot: 'bg-[#C48B14]',
    accent: 'bg-[#EBC263]',
  },
  INASISTENCIA: {
    label: 'Inasistencia',
    badge: 'bg-[#FDECEC] border border-[#F7BDBD] text-[#B91C1C]',
    cell: 'bg-[#FDECEC] text-[#B91C1C]',
    dot: 'bg-[#B91C1C]',
    accent: 'bg-[#EB9B9B]',
  },
  CANCELADA: {
    label: 'Cancelada',
    badge: 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569]',
    cell: 'bg-[#F1F5F9] text-[#475569]',
    dot: 'bg-[#64748B]',
    accent: 'bg-[#CBD5E1]',
  },
  CERRADA: {
    label: 'Postulación cerrada',
    badge: 'bg-[#F4F1F8] border border-[#D8CEE6] text-[#64537A]',
    cell: 'bg-[#F4F1F8] text-[#64537A]',
    dot: 'bg-[#64537A]',
    accent: 'bg-[#C3B5D6]',
  },
};

export const ESTADO_ACTIVIDAD_STYLES = {
  PUBLICADA: 'bg-[#E6F5FC] border border-[#A8DDF5] text-[#0369A1]',
  EN_CURSO: 'bg-[#E6F7F7] border border-[#99DFDF] text-[#0F766E]',
  PROGRAMADA: 'bg-[#F3EEFE] border border-[#D4C2FA] text-[#6D28D9]',
  BORRADOR: 'bg-[#FEF7E6] border border-[#F5D68E] text-[#9A6700]',
  FINALIZADA: 'bg-[#E6F6F0] border border-[#A7E3CE] text-[#0F7657]',
  CANCELADA: 'bg-[#FDECEC] border border-[#F7BDBD] text-[#B91C1C]',
};

export function getProcesoStyle(key) {
  const norm = String(key || '').toUpperCase().trim();
  if (norm === 'COMPLETADA' || norm === 'ASISTIO') return PROCESO_STYLES.VALIDADA;
  if (norm === 'ASIGNADO') return PROCESO_STYLES.ASIGNADA;
  if (norm === 'POSTULADO' || norm === 'CONFIRMADO') return PROCESO_STYLES.CONFIRMADA;
  if (norm === 'LISTA_ESPERA' || norm === 'EN_ESPERA') return PROCESO_STYLES.PENDIENTE;
  if (norm === 'RECHAZADO') return PROCESO_STYLES.CANCELADA;
  return PROCESO_STYLES[norm] || PROCESO_STYLES.CONFIRMADA;
}

export function getEstadoActividadBadge(estado) {
  const norm = String(estado || '').toUpperCase().trim();
  return ESTADO_ACTIVIDAD_STYLES[norm] || 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569]';
}
