/**
 * Prépare une photo d’élève pour l’upload : côté serveur la photo est recadrée en 200×200,
 * mais l’appareil photo mobile envoie souvent des fichiers de plusieurs Mo, ce qui peut
 * dépasser la limite multipart (Spring) et inutilement surcharger l’envoi.
 *
 * Redimensionne (côté le plus long ≤ 1920) et réencode en JPEG. En cas d’échec (certains
 * HEIC, etc.), retourne le fichier d’origine.
 */
const MAX_LONG_SIDE = 1920;
const JPEG_QUALITY = 0.88;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image-load'));
    };
    img.src = url;
  });
}

export async function prepareStudentPhotoFile(file: File): Promise<File> {
  if (!file || !file.type.startsWith('image/')) {
    return file;
  }
  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return file;
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    return file;
  }

  const scale = Math.min(1, MAX_LONG_SIDE / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  try {
    ctx.drawImage(img, 0, 0, outW, outH);
  } catch {
    return file;
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const name = (file.name && file.name.replace(/\.[^.]+$/, '')) || 'photo';
        resolve(new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }));
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
