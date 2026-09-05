// useTextFrameDetector.js
//
// Runs a lightweight text-detection model (e.g. PP-OCRv4 "det", exported to
// ONNX) against a stream of camera frames, at a low frame rate, entirely on
// device. It does NOT judge blur/shake/exposure — the server already does
// that. Its only job is: "is the full text region inside the frame, with
// margin, and has that been true for the last few frames?"
//
// Frames come from a FrameSource (frameSource.js), so this hook works the
// same whether frames come from an HTML <video> element or the native
// camera-preview plugin.
//
// npm install onnxruntime-web

import { useEffect, useRef, useState, useCallback } from 'react';
import * as ort from 'onnxruntime-web';
import { detectBoxes, mergeToOverallBox, DEFAULT_DB_OPTIONS } from '@/utils/camera/dbPostprocess';
import { CAMERA_GUIDANCE } from '@/constants/camera';
import { getAiSession, getIsOpenCvReady, initOpenCv, preloadAiEngine } from '@/utils/camera/aiEngine';

// FramingStatus: 'searching' | 'adjust' | 'ready'
// Direction: 'move_left' | 'move_right' | 'move_up' | 'move_down' | 'move_back' | 'move_closer'
//
// FramingResult shape:
// { status, direction, boxes, stableFrameCount }
//
// Options shape:
// {
//   modelUrl: string, // e.g. '/models/ppocr_det.onnx'
//   inputSize: number, // model input side length, e.g. 640
//   intervalMs: number, // how often to run inference, e.g. 300
//   safeMarginRatio: number, // fraction of frame width/height treated as "too close to edge", e.g. 0.05
//   stableFramesRequired: number, // consecutive good frames before status becomes 'ready'
//   smoothingAlpha: number, // EMA weight for new observations, 0..1 (higher = less smoothing)
// }

const DEFAULT_OPTIONS = {
    modelUrl: '/models/ppocr_det.onnx',
    inputSize: 640,
    intervalMs: 300,
    safeMarginRatio: 0.05,
    stableFramesRequired: 3,
    smoothingAlpha: 0.4,
};

/**
 * @param {() => Promise<{bitmap: ImageBitmap, width: number, height: number} | null>} frameSource
 * @param {Partial<typeof DEFAULT_OPTIONS>} [userOptions]
 */
export function useTextFrameDetector(
    frameSource,
    userOptions = {}
) {
    const opts = { ...DEFAULT_OPTIONS, ...userOptions };

    const [result, setResult] = useState({
        status: CAMERA_GUIDANCE.WAITING,
        boxes: [],
        stableFrameCount: 0,
    });

    const [cvReady, setCvReady] = useState(getIsOpenCvReady());
    const sessionRef = useRef(getAiSession());

    const canvasRef = useRef(null);
    const smoothedBoxRef = useRef(null);
    const stableCountRef = useRef(0);
    const runningRef = useRef(false);

    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.width = opts.inputSize;
        canvas.height = opts.inputSize;
        canvasRef.current = canvas;
    }, [opts.inputSize]);

    useEffect(() => {
        let isMounted = true;

        if (!getIsOpenCvReady()) {
            initOpenCv().then(() => {
                if (isMounted) setCvReady(true);
            });
        } else {
            setCvReady(true);
        }

        const currentSession = getAiSession();
        if (currentSession) {
            sessionRef.current = currentSession;
        } else {
            preloadAiEngine(undefined, opts.modelUrl, opts.inputSize).then(() => {
                if (isMounted) {
                    sessionRef.current = getAiSession();
                }
            });
        }

        return () => {
            isMounted = false;
        };
    }, [opts.modelUrl, opts.inputSize]);

    const runOnce = useCallback(async () => {
        const session = sessionRef.current;
        const canvas = canvasRef.current;
        if (!session || !canvas || !cvReady) return;

        const frame = await frameSource();
        if (!frame) return;
        const { bitmap, width: vw, height: vh } = frame;

        // Letterbox the frame into a square input, preserving aspect ratio.
        const scale = opts.inputSize / Math.max(vw, vh);
        const drawW = Math.round(vw * scale);
        const drawH = Math.round(vh * scale);
        const offsetX = Math.floor((opts.inputSize - drawW) / 2);
        const offsetY = Math.floor((opts.inputSize - drawH) / 2);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, opts.inputSize, opts.inputSize);
        ctx.drawImage(bitmap, offsetX, offsetY, drawW, drawH);
        bitmap.close(); // ImageBitmap holds GPU/decoder memory until explicitly closed

        const imageData = ctx.getImageData(0, 0, opts.inputSize, opts.inputSize);
        const inputTensor = imageDataToTensor(imageData, opts.inputSize);

        const feeds = { x: inputTensor }; // input name depends on your export — check with Netron
        const outputMap = await session.run(feeds);
        const outputName = session.outputNames[0];
        const output = outputMap[outputName];

        const probMap = output.data; // shape [1,1,H,W]
        const [, , outH, outW] = output.dims;

        const boxesModelSpace = detectBoxes(probMap, outW, outH, DEFAULT_DB_OPTIONS);

        // Map boxes from padded model-input space back to original frame coordinates.
        const modelToFrame = (p) => ({
            x: (p.x - offsetX) / scale,
            y: (p.y - offsetY) / scale,
        });
        const boxesFrameSpace = boxesModelSpace.map((b) => ({
            score: b.score,
            points: b.points.map(modelToFrame),
        }));

        processFrame(boxesFrameSpace, vw, vh);
    }, [frameSource, opts, cvReady]);

    const processFrame = (boxes, vw, vh) => {
        const overall = mergeToOverallBox(boxes);

        if (!overall) {
            stableCountRef.current = 0;
            smoothedBoxRef.current = null;
            setResult({ status: CAMERA_GUIDANCE.WAITING, boxes: [], stableFrameCount: 0 });
            return;
        }

        // Exponential smoothing so guidance doesn't flicker frame-to-frame.
        const prev = smoothedBoxRef.current;
        const a = opts.smoothingAlpha;
        const smoothed = prev
            ? {
                minX: prev.minX + a * (overall.minX - prev.minX),
                minY: prev.minY + a * (overall.minY - prev.minY),
                maxX: prev.maxX + a * (overall.maxX - prev.maxX),
                maxY: prev.maxY + a * (overall.maxY - prev.maxY),
            }
            : overall;
        smoothedBoxRef.current = smoothed;

        const marginX = vw * opts.safeMarginRatio;
        const marginY = vh * opts.safeMarginRatio;

        const clippedLeft = smoothed.minX < marginX;
        const clippedRight = smoothed.maxX > vw - marginX;
        const clippedTop = smoothed.minY < marginY;
        const clippedBottom = smoothed.maxY > vh - marginY;
        const tooClose = smoothed.maxX - smoothed.minX > vw * 0.95 || smoothed.maxY - smoothed.minY > vh * 0.95;
        const tooFar = smoothed.maxX - smoothed.minX < vw * 0.15 && smoothed.maxY - smoothed.minY < vh * 0.15;

        let direction = null;
        if (tooClose) direction = CAMERA_GUIDANCE.MOVE_FARTHER;
        else if (tooFar) direction = CAMERA_GUIDANCE.MOVE_CLOSER;
        else if (clippedLeft) direction = CAMERA_GUIDANCE.MOVE_LEFT;
        else if (clippedRight) direction = CAMERA_GUIDANCE.MOVE_RIGHT;
        else if (clippedTop) direction = CAMERA_GUIDANCE.MOVE_UP;
        else if (clippedBottom) direction = CAMERA_GUIDANCE.MOVE_DOWN;

        if (direction) {
            stableCountRef.current = 0;
            setResult({ status: direction, boxes, stableFrameCount: 0 });
            return;
        }

        stableCountRef.current += 1;
        const status = stableCountRef.current >= opts.stableFramesRequired ? CAMERA_GUIDANCE.TARGET_FOUND : CAMERA_GUIDANCE.WAITING;
        setResult({ status, boxes, stableFrameCount: stableCountRef.current });
    };

    useEffect(() => {
        runningRef.current = true;
        let timeoutId;

        const loop = async () => {
            if (!runningRef.current) return;

            try {
                await runOnce();
            } catch (err) {
                console.warn("AI frame detection frame dropped:", err);
            } finally {
                if (runningRef.current) {
                    timeoutId = setTimeout(loop, opts.intervalMs);
                }
            }
        };

        loop();

        return () => {
            runningRef.current = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [runOnce, opts.intervalMs]);

    return result;
}

/** PaddleOCR-style normalization: RGB, /255, then (x - mean) / std, NCHW layout. */
function imageDataToTensor(imageData, size) {
    const { data } = imageData;
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    const floatData = new Float32Array(3 * size * size);

    for (let i = 0; i < size * size; i++) {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;
        floatData[i] = (r - mean[0]) / std[0]; // R channel plane
        floatData[size * size + i] = (g - mean[1]) / std[1]; // G channel plane
        floatData[2 * size * size + i] = (b - mean[2]) / std[2]; // B channel plane
    }

    return new ort.Tensor('float32', floatData, [1, 3, size, size]);
}
