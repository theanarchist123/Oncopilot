/**
 * Client-side PDF-to-images converter.
 *
 * Renders each page of a PDF to a compressed JPEG image using pdf.js + <canvas>.
 * This allows uploading the images (typically much smaller than the raw PDF)
 * instead of the full PDF file, bypassing Vercel's 4.5 MB body size limit.
 */

/**
 * Render all pages of a PDF to JPEG blobs.
 *
 * @param pdfFile - The original PDF File object
 * @param options.scale - Render scale (1.0 = 72 DPI, 1.5 = 108 DPI, 2.0 = 144 DPI). Default 1.5.
 * @param options.quality - JPEG quality (0–1). Default 0.75.
 * @param options.maxPages - Maximum number of pages to render. Default 10.
 * @returns Array of JPEG Blob objects, one per page.
 */
export async function pdfToImages(
  pdfFile: File,
  options?: { scale?: number; quality?: number; maxPages?: number }
): Promise<Blob[]> {
  const { scale = 1.5, quality = 0.75, maxPages = 10 } = options ?? {};

  // Dynamically import pdf.js to keep initial bundle small
  const pdfjsLib = await import("pdfjs-dist");

  // Use CDN for worker to avoid Webpack bundling issues with .mjs in Next.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = Math.min(pdf.numPages, maxPages);

  const images: Blob[] = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Create an offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Convert canvas to JPEG blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error(`Failed to render page ${i}`))),
        "image/jpeg",
        quality
      );
    });

    images.push(blob);
  }

  return images;
}

/**
 * Build a FormData payload containing the rendered page images.
 * The backend's /reports/extract endpoint already handles image files.
 *
 * If the total size of the page images is still over the limit, this
 * re-renders at a lower quality/scale.
 */
export async function buildImageFormData(
  pdfFile: File,
  maxTotalBytes = 4 * 1024 * 1024 // 4 MB — comfortably under 4.5 MB limit
): Promise<FormData> {
  // Try at normal quality first
  let images = await pdfToImages(pdfFile, { scale: 1.5, quality: 0.75 });
  let totalSize = images.reduce((sum, b) => sum + b.size, 0);

  // If too large, retry at lower quality
  if (totalSize > maxTotalBytes) {
    images = await pdfToImages(pdfFile, { scale: 1.0, quality: 0.6 });
    totalSize = images.reduce((sum, b) => sum + b.size, 0);
  }

  // If STILL too large, retry at even lower settings
  if (totalSize > maxTotalBytes) {
    images = await pdfToImages(pdfFile, { scale: 0.75, quality: 0.5 });
  }

  // For multi-page PDFs, concatenate images vertically into a single image
  // or just send the first page if that's enough.
  // For now, send the first image (most reports have the key info on page 1-2)
  // The backend handles single-image uploads fine.

  // Actually, let's combine all pages into one tall image for best extraction
  const combinedBlob = await combineImages(images);

  const formData = new FormData();
  formData.append(
    "file",
    combinedBlob,
    pdfFile.name.replace(/\.pdf$/i, ".jpg")
  );

  return formData;
}

/**
 * Combine multiple JPEG images into a single tall image by stacking vertically.
 */
async function combineImages(blobs: Blob[]): Promise<Blob> {
  if (blobs.length === 1) return blobs[0];

  // Load all images
  const images = await Promise.all(
    blobs.map(
      (blob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = URL.createObjectURL(blob);
        })
    )
  );

  // Calculate combined dimensions
  const maxWidth = Math.max(...images.map((img) => img.width));
  const totalHeight = images.reduce((sum, img) => sum + img.height, 0);

  const canvas = document.createElement("canvas");
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw each image stacked vertically
  let y = 0;
  for (const img of images) {
    ctx.drawImage(img, 0, y);
    y += img.height;
    URL.revokeObjectURL(img.src); // Clean up
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to combine images"))),
      "image/jpeg",
      0.8
    );
  });
}
