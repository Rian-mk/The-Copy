import { CAMERA_GUIDANCE } from "@/constants/camera";
import { useCameraCore } from "@/hooks/useCameraCore";

export default function useManualCamera(onCapture) {
    const cameraBase = useCameraCore(onCapture);

    return {
        ...cameraBase,
        status: CAMERA_GUIDANCE.MANUAL_READY,
    };
}