// Acciones del ciclo de vida de una campaña con confirmación explícita (listado y ficha)
import { useRouter } from 'vue-router';
import { useAsyncTask } from 'src/composables/useAsyncTask';
import { useConfirm } from 'src/composables/useConfirm';
import { formatDate, formatNumber } from 'src/core/utils/format';
import { nombreEstablecimiento } from 'src/modules/establecimientos/services/establecimientos.service';
import {
  avanceCampania,
  eliminarCampania,
  iniciarCampania,
} from 'src/modules/campanias/services/campanias.service';
import { pasarAConciliacion, unidadesSinVerificar } from 'src/modules/conciliacion/services/conciliacion.service';
import type { Campania } from 'src/modules/campanias/types';

export function useCampaniaAcciones() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { loading, run } = useAsyncTask();

  async function iniciar(campania: Campania): Promise<void> {
    const ok = await confirm({
      title: 'Iniciar campaña',
      message: 'La campaña pasará a "En curso" y el equipo podrá registrar la verificación física. Ya no podrá editarse.',
      confirmLabel: 'Iniciar campaña',
      details: [
        { label: 'Campaña', value: `${campania.id} · ${campania.nombre}` },
        { label: 'CAR', value: campania.establecimientoIds.map((id) => nombreEstablecimiento(id)).join(', ') },
        { label: 'Periodo', value: `${formatDate(campania.fechaInicio)} al ${formatDate(campania.fechaFin)}` },
      ],
    });
    if (ok) await run(() => iniciarCampania(campania.id), `La campaña ${campania.id} está en curso.`);
  }

  async function conciliar(campania: Campania): Promise<boolean> {
    const avance = avanceCampania(campania);
    const pendientes = unidadesSinVerificar(campania).length;
    const ok = await confirm({
      title: 'Pasar a conciliación',
      message:
        pendientes > 0
          ? `Quedan ${pendientes} unidades sin verificar: sus bienes y suministros figurarán como "Pendiente de verificar". La verificación quedará cerrada.`
          : 'Todas las unidades están verificadas. Se generarán los resultados de conciliación y la verificación quedará cerrada.',
      confirmLabel: 'Pasar a conciliación',
      acknowledge: 'Entiendo que los resultados se congelan y que la verificación ya no podrá modificarse.',
      details: [
        { label: 'Campaña', value: campania.id },
        { label: 'Unidades verificadas', value: `${formatNumber(avance.unidadesVerificadas)} de ${formatNumber(avance.unidades)}` },
      ],
    });
    if (!ok) return false;
    const result = await run(() => pasarAConciliacion(campania.id), `La campaña ${campania.id} pasó a conciliación.`);
    if (result.ok) await router.push(`/conciliacion/${campania.id}`);
    return result.ok;
  }

  async function eliminar(campania: Campania): Promise<boolean> {
    const ok = await confirm({
      title: 'Eliminar campaña',
      message: `Se eliminará la campaña planificada ${campania.id}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar campaña',
      tone: 'negative',
    });
    if (!ok) return false;
    const result = await run(() => eliminarCampania(campania.id), `Se eliminó la campaña ${campania.id}.`);
    return result.ok;
  }

  return { loading, iniciar, conciliar, eliminar };
}
