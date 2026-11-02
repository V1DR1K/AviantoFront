import { ApiError, api, apiUrl } from "./api";
import { authenticatedFetch } from "./auth";
import type { VehicleImageResponse } from "./types";

// Límites: la base guarda ambas versiones en base64 y el backend las rechaza por encima de estos tamaños.
const MAX_INPUT_BYTES = 40 * 1024 * 1024;
const THUMB_ATTEMPTS = [
  { side: 320, quality: 0.75 },
  { side: 320, quality: 0.6 },
  { side: 256, quality: 0.6 },
];
const FULL_ATTEMPTS = [
  { side: 1280, quality: 0.8 },
  { side: 1280, quality: 0.65 },
  { side: 1024, quality: 0.65 },
  { side: 800, quality: 0.6 },
];
const THUMB_MAX_BYTES = 100_000;
const FULL_MAX_BYTES = 600_000;
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
const MAX_PARALLEL_LOADS = 4;

export type PreparedVehicleImage = {
  filename: string;
  contentType: string;
  width: number;
  height: number;
  miniaturaBase64: string;
  completaBase64: string;
  completaBlob: Blob;
};

// Cambio pendiente sobre la foto de una moto: se guarda al confirmar el formulario.
export type VehiclePhotoChange =
  | { kind: "set"; image: PreparedVehicleImage; previewUrl: string }
  | { kind: "remove" };

type Decoded = { image: HTMLImageElement; release: () => void };

// Se espera el evento load y no image.decode(): decode() puede quedar esperando un frame
// en pestañas en segundo plano.
const decode = (blob: Blob) =>
  new Promise<Decoded | null>((resolve) => {
    const url = URL.createObjectURL(blob);
    const release = () => URL.revokeObjectURL(url);
    const image = new Image();
    image.onload = () => resolve({ image, release });
    image.onerror = () => {
      release();
      resolve(null);
    };
    image.src = url;
  });

const isHeif = async (file: File) => {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const text = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  return text(4, 8) === "ftyp" && HEIF_BRANDS.has(text(8, 12));
};

const fit = (width: number, height: number, side: number) => {
  const scale = Math.min(1, side / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};

const render = (image: HTMLImageElement, side: number) => {
  const size = fit(image.naturalWidth, image.naturalHeight, side);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no permite procesar imágenes.");
  // Sin transparencia: el JPEG de respaldo no la soporta y el fondo queda uniforme.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, size.width, size.height);
  return canvas;
};

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Algunos navegadores responden PNG en silencio cuando no saben codificar WebP.
const encodeAs = async (image: HTMLImageElement, type: string, attempt: { side: number; quality: number }) => {
  const blob = await encode(render(image, attempt.side), type, attempt.quality);
  if (!blob || blob.type !== type) return null;
  return blob;
};

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo preparar la imagen para guardarla."));
    reader.onload = () => resolve(String(reader.result).split(",").at(-1) ?? "");
    reader.readAsDataURL(blob);
  });

// Convierte cualquier imagen que el navegador pueda leer (JPG, PNG, WebP, GIF, BMP, AVIF, SVG)
// y, si hace falta, HEIC/HEIF de iPhone. Siempre devuelve una miniatura y una versión completa.
export async function prepareVehicleImage(file: File): Promise<PreparedVehicleImage> {
  if (file.size > MAX_INPUT_BYTES) throw new Error("La imagen supera los 40 MB.");
  let decoded = await decode(file);
  if (!decoded && (await isHeif(file))) {
    try {
      const { default: heicToJpeg } = await import("heic2any");
      const converted = await heicToJpeg({ blob: file, toType: "image/jpeg", quality: 0.9 });
      decoded = await decode(Array.isArray(converted) ? converted[0] : converted);
    } catch {
      throw new Error(`No se pudo convertir ${file.name} (HEIC). Exportala como JPG desde el teléfono.`);
    }
  }
  if (!decoded) throw new Error(`No se pudo leer ${file.name}. Probá exportarla como JPG o PNG.`);
  try {
    const { image } = decoded;
    if (!image.naturalWidth || !image.naturalHeight) throw new Error(`No se pudo leer ${file.name}.`);
    const preferred = (await encode(render(image, THUMB_ATTEMPTS[0].side), "image/webp", 0.5))?.type === "image/webp" ? "image/webp" : "image/jpeg";

    let thumb: Blob | null = null;
    for (const attempt of THUMB_ATTEMPTS) {
      thumb = await encodeAs(image, preferred, attempt);
      if (thumb && thumb.size <= THUMB_MAX_BYTES) break;
    }
    let full: Blob | null = null;
    let fullSide = FULL_ATTEMPTS[0].side;
    for (const attempt of FULL_ATTEMPTS) {
      full = await encodeAs(image, preferred, attempt);
      fullSide = attempt.side;
      if (full && full.size <= FULL_MAX_BYTES) break;
    }
    if (!thumb || !full || thumb.size > THUMB_MAX_BYTES || full.size > FULL_MAX_BYTES)
      throw new Error("La imagen es demasiado compleja para guardarla. Probá con una foto más chica.");

    const size = fit(image.naturalWidth, image.naturalHeight, fullSide);
    return {
      filename: file.name,
      contentType: preferred,
      width: size.width,
      height: size.height,
      miniaturaBase64: await blobToBase64(thumb),
      completaBase64: await blobToBase64(full),
      completaBlob: full,
    };
  } finally {
    decoded.release();
  }
}

export const saveVehicleImage = (motoId: string, image: PreparedVehicleImage) =>
  api<VehicleImageResponse>(`/motovehiculos/${motoId}/imagen`, {
    method: "PUT",
    body: JSON.stringify({
      filename: image.filename,
      contentType: image.contentType,
      width: image.width,
      height: image.height,
      miniaturaBase64: image.miniaturaBase64,
      completaBase64: image.completaBase64,
    }),
  });

export const removeVehicleImage = (motoId: string) => api<void>(`/motovehiculos/${motoId}/imagen`, { method: "DELETE" });

export function discardVehiclePhoto(change: VehiclePhotoChange | null) {
  if (change?.kind === "set") URL.revokeObjectURL(change.previewUrl);
}

export async function applyVehiclePhoto(motoId: string, change: VehiclePhotoChange | null) {
  if (!change) return;
  if (change.kind === "remove") await removeVehicleImage(motoId);
  else await saveVehicleImage(motoId, change.image);
}

// Carga de miniaturas y fotos: en cola (no más de MAX_PARALLEL_LOADS a la vez, para no
// saturar las conexiones de la API) y con caché por versión. Las cargas ya pedidas no se
// cancelan al salir de la pantalla: quedan en caché y no se vuelven a pedir.
const cache = new Map<string, Promise<string>>();
const queue: Array<() => void> = [];
let running = 0;
const runNext = () => {
  if (running >= MAX_PARALLEL_LOADS) return;
  const next = queue.shift();
  if (next) next();
};
const scheduled = <T>(task: () => Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    queue.push(() => {
      running += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          runNext();
        });
    });
    runNext();
  });

export const vehicleImageUrl = (motoId: string, tamano: "miniatura" | "completa", version: string) => {
  const key = `${motoId}:${tamano}:${version}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const request = scheduled(async () => {
    const response = await authenticatedFetch(apiUrl(`/motovehiculos/${motoId}/imagen`, { tamano, v: version }));
    if (!response.ok) throw new ApiError("No se pudo cargar la foto.", response.status);
    return URL.createObjectURL(await response.blob());
  });
  cache.set(key, request);
  request.catch(() => cache.delete(key));
  return request;
};
