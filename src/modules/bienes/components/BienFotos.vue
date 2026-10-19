<template>
  <div class="bien-fotos">
    <ul v-if="fotos.length > 0" class="bien-fotos__grid" aria-label="Fotografías del bien">
      <li v-for="foto in fotos" :key="foto.id" class="bien-fotos__item">
        <button type="button" class="bien-fotos__thumb" :aria-label="`Ampliar ${foto.nombre}`" @click="preview = foto">
          <img :src="foto.dataUrl" :alt="foto.nombre" loading="lazy" />
        </button>
        <div class="bien-fotos__meta">
          <span class="u-ellipsis" :title="foto.nombre">{{ foto.nombre }}</span>
          <q-btn
            v-if="!readonly"
            flat
            round
            dense
            size="sm"
            icon="delete"
            color="negative"
            :aria-label="`Quitar ${foto.nombre}`"
            @click="remove(foto.id)"
          />
        </div>
      </li>
    </ul>
    <p v-else class="u-muted bien-fotos__empty">
      {{ readonly ? 'El bien no tiene fotografías registradas.' : 'Aún no se agregaron fotografías.' }}
    </p>

    <div v-if="!readonly" class="bien-fotos__add">
      <q-file
        :model-value="null"
        :for="forId"
        outlined
        dense
        multiple
        accept="image/*"
        :disable="fotos.length >= MAX_FOTOS_BIEN || processing"
        :loading="processing"
        :label="fotos.length >= MAX_FOTOS_BIEN ? 'Límite de fotografías alcanzado' : 'Agregar fotografías'"
        :hint="`Hasta ${MAX_FOTOS_BIEN} imágenes (JPG o PNG). Se comprimen en el navegador para ahorrar espacio.`"
        @update:model-value="add"
      >
        <template #prepend>
          <q-icon name="add_a_photo" aria-hidden="true" />
        </template>
      </q-file>
    </div>

    <q-dialog :model-value="preview !== null" @update:model-value="(value) => !value && (preview = null)">
      <q-card v-if="preview" class="us-dialog us-dialog--xl">
        <header class="us-dialog__header">
          <div class="us-dialog__heading">
            <h2 class="us-dialog__header-title">{{ preview.nombre }}</h2>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Cerrar" />
        </header>
        <div class="us-dialog__body bien-fotos__preview">
          <img :src="preview.dataUrl" :alt="preview.nombre" />
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
// Fotografías y evidencias del bien: galería, ampliación y carga con compresión (RN-B5)
import { ref } from 'vue';
import { useNotify } from 'src/composables/useNotify';
import { compressImage } from 'src/core/utils/image';
import { nowIso } from 'src/core/utils/format';
import { MAX_FOTOS_BIEN, type FotoBien } from 'src/modules/bienes/types';

withDefaults(defineProps<{ readonly?: boolean | undefined; forId?: string | undefined }>(), { readonly: false, forId: 'bien-fotos' });

const fotos = defineModel<FotoBien[]>({ required: true });
const notify = useNotify();
const processing = ref(false);
const preview = ref<FotoBien | null>(null);

async function add(value: File | File[] | FileList | null): Promise<void> {
  if (!value) return;
  const files = value instanceof File ? [value] : Array.from(value);
  const disponibles = MAX_FOTOS_BIEN - fotos.value.length;
  if (files.length > disponibles) {
    notify.error(new Error(`Solo puede agregar ${disponibles} fotografía(s) más. Se tomarán las primeras.`));
  }
  processing.value = true;
  try {
    const nuevas: FotoBien[] = [];
    for (const [index, file] of files.slice(0, disponibles).entries()) {
      nuevas.push({ id: `FOTO-${Date.now()}-${index}`, nombre: file.name, dataUrl: await compressImage(file), fecha: nowIso() });
    }
    fotos.value = [...fotos.value, ...nuevas];
  } catch (error) {
    notify.error(error);
  } finally {
    processing.value = false;
  }
}

function remove(id: string): void {
  fotos.value = fotos.value.filter((foto) => foto.id !== id);
}
</script>

<style scoped lang="scss">
.bien-fotos__grid {
  list-style: none;
  margin: 0 0 var(--space-12);
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
  gap: var(--space-12);
}

.bien-fotos__item {
  min-width: 0;
  border: 1px solid var(--border-card);
  border-radius: var(--radius-box);
  overflow: hidden;
  background: var(--surface);
}

.bien-fotos__thumb {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  border: 0;
  background: var(--surface-sunken);
  cursor: zoom-in;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.bien-fotos__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-8);
  font-size: 12px;
}

.bien-fotos__empty {
  margin: 0 0 var(--space-12);
}

.bien-fotos__preview {
  display: flex;
  justify-content: center;

  img {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
  }
}
</style>
