// A photograph off an iPhone is 3–5 MB; the back office wants something it
// can post to a model without timing out. 1600px on the long edge at q0.85
// keeps every receipt legible and lands around 200–400 KB.

const MAX_EDGE = 1600;
const QUALITY = 0.85;

export function shrinkToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The image could not be read.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('The image could not be decoded.'));
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > MAX_EDGE || h > MAX_EDGE) {
          const scale = MAX_EDGE / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        // Bare base64, no data: prefix — the same shape the back office's own
        // console has always sent.
        const b64 = canvas.toDataURL('image/jpeg', QUALITY).split(',')[1];
        resolve({ base64: b64, bytes: Math.round((b64.length * 3) / 4), width: w, height: h });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
