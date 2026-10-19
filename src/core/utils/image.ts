// Compresión de fotografías en el navegador para no agotar la cuota de localStorage

const MAX_SIDE_PX = 1024;
const JPEG_QUALITY = 0.7;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`No se pudo leer el archivo ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('El archivo no es una imagen válida. Seleccione un archivo JPG o PNG.'));
    image.src = src;
  });
}

/** Redimensiona a un máximo de 1024 px por lado y convierte a JPEG (data URL). */
export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" no es una imagen. Seleccione un archivo JPG o PNG.`);
  }
  const source = await readAsDataUrl(file);
  const image = await loadImage(source);
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}
