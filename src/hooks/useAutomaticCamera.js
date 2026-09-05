import { useEffect, useState, useMemo } from "react";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { CAMERA_GUIDANCE } from "@/constants/camera";
import { createCameraPreviewFrameSource } from "@/utils/camera/frameSource";
import { useTextFrameDetector } from "./useTextFrameDetector";
import { useCameraCore } from "@/hooks/useCameraCore";

export default function useAutomaticCamera(onCapture) {
    const [captured, setCaptured] = useState(false);
    const cameraBase = useCameraCore(onCapture);

    const frameSource = useMemo(
        () => createCameraPreviewFrameSource(CameraPreview, { quality: 30 }),
        []
    );

    const detector = useTextFrameDetector(frameSource, {
        modelUrl: "/models/ppocr_det.onnx",
        inputSize: 640,
        intervalMs: 400,
        stableFramesRequired: 3,
    });

    useEffect(() => {
        if (
            detector.status !== CAMERA_GUIDANCE.TARGET_FOUND ||
            captured ||
            !cameraBase.previewStarted ||
            !cameraBase.isCameraOn
        ) {
            return;
        }

        setCaptured(true);
        cameraBase.capturePhoto();
    }, [detector.status, captured, cameraBase]);

    return {
        ...cameraBase,
        status: detector.status,
    };
}