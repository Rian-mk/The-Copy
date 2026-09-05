import * as ort from "onnxruntime-web";

let inferenceSession = null;
let isCvReady = false;
let isInitialized = false;

export const initOpenCv = (onProgress) => {
    return new Promise((resolve) => {
        if (window.cv && window.cv.Mat) {
            isCvReady = true;
            return resolve(true);
        }
        onProgress?.("در حال فراخوانی ماژول پردازش تصویر...", 25);
        const check = () => {
            if (window.cv?.onRuntimeInitialized || (window.cv && window.cv.Mat)) {
                isCvReady = true;
                resolve(true);
            } else {
                setTimeout(check, 100);
            }
        };
        check();
    });
};

export const preloadAiEngine = async (
    onProgress,
    modelUrl = "/models/ppocr_det.onnx",
    inputSize = 384
) => {
    if (isInitialized && inferenceSession) {
        onProgress?.("آماده به کار", 100);
        return;
    }

    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    try {
        await initOpenCv(onProgress);

        onProgress?.("در حال آماده‌سازی مدل هوش مصنوعی...", 60);
        const session = await ort.InferenceSession.create(modelUrl, {
            executionProviders: ["webgl", "wasm"],
            graphOptimizationLevel: "all",
        });
        inferenceSession = session;

        onProgress?.("پیکربندی شتاب‌دهنده سخت‌افزاری...", 85);
        const dummyData = new Float32Array(3 * inputSize * inputSize);
        const dummyTensor = new ort.Tensor("float32", dummyData, [1, 3, inputSize, inputSize]);
        await session.run({ x: dummyTensor });

        isInitialized = true;
        onProgress?.("آماده به کار", 100);
    } catch (err) {
        console.warn("AI Preload fallback / error:", err);
        onProgress?.("آماده به کار", 100);
    }
};

export const getAiSession = () => inferenceSession;
export const getIsOpenCvReady = () => isCvReady;