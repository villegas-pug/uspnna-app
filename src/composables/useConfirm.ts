// Confirmación explícita de acciones que cambian el registro maestro (QDialog plugin + ConfirmDialog)
import { useQuasar } from 'quasar';
import ConfirmDialog from 'src/components/ConfirmDialog.vue';
import type { ConfirmOptions } from 'src/components/types';

export function useConfirm() {
  const $q = useQuasar();

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      $q.dialog({ component: ConfirmDialog, componentProps: options })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false));
    });
  }

  return { confirm };
}
