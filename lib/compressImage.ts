// Comprime uma imagem base64 para evitar payloads gigantes no Supabase.
// Produtos: max 400px, qualidade 0.75 (imagem de card ~15-40KB em vez de MBs).
export const compressImage = (base64: string, maxSize = 400, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
        if (!base64 || !base64.startsWith('data:image')) {
            resolve(base64);
            return;
        }
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round(height * maxSize / width);
                        width = maxSize;
                    } else {
                        width = Math.round(width * maxSize / height);
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } catch {
                resolve(base64); // fallback: original
            }
        };
        img.onerror = () => resolve(base64); // fallback: original
        img.src = base64;
    });
};
