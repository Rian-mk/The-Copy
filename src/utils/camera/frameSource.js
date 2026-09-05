// frameSource.js
//
// Abstracts "how do I get the current camera frame" so useTextFrameDetector
// doesn't care whether frames come from an HTML <video> element (web) or the
// native camera-preview plugin (Capacitor). Swap the implementation, keep
// the detection logic identical.
//
// Frame shape: { bitmap: ImageBitmap, width: number, height: number }
// FrameSource: () => Promise<Frame | null>

/**
 * Frame source backed by a plain HTML <video> element (web / getUserMedia).
 * @param {{current: HTMLVideoElement | null}} videoRef
 * @returns {() => Promise<{bitmap: ImageBitmap, width: number, height: number} | null>}
 */
export function createVideoFrameSource(videoRef) {
    return async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) return null;

        const bitmap = await createImageBitmap(video);
        return { bitmap, width, height };
    };
}

/**
 * Frame source backed by @capacitor-community/camera-preview.
 * captureSample() goes through the native bridge (JPEG encode -> base64 ->
 * JS decode), so it's noticeably heavier than reading a <video> element.
 * Keep `quality` low here — this sample is only used for framing detection,
 * not the final image sent to the server.
 *
 * @param {{quality?: number}} [options]
 * @returns {() => Promise<{bitmap: ImageBitmap, width: number, height: number} | null>}
 */
export function createCameraPreviewFrameSource(CameraPreview, options = {}) {
    const quality = options.quality ?? 30;

    return async () => {
        try {
            const sample = await CameraPreview.captureSample({ quality });
            if (!sample?.value) return null;

            const bitmap = await base64ToImageBitmap(sample.value);
            return { bitmap, width: bitmap.width, height: bitmap.height };
        } catch (err) {
            return null;
        }
    };
}

async function base64ToImageBitmap(base64, mime = 'image/jpeg') {
    const res = await fetch(`data:${mime};base64,${base64}`);
    const blob = await res.blob();
    return createImageBitmap(blob);
}
