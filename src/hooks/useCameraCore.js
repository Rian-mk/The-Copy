import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { CameraPreview } from "@capacitor-community/camera-preview";
import { NativeSettings, AndroidSettings, IOSSettings } from "capacitor-native-settings";
import { App } from "@capacitor/app";

let cameraOpChain = Promise.resolve();
function enqueueCameraOp(op) {
    const result = cameraOpChain.then(() => op());
    cameraOpChain = result.catch(() => { });
    return result;
}

const handleCameraStartError = (err) => {
    const message = err?.message?.toLowerCase() || "";
    if (message.includes("permission") || message.includes("denied") || message.includes("not authorized")) {
        toast.error("دسترسی به دوربین رد شد. در حال انتقال به تنظیمات...");
        setTimeout(async () => {
            try {
                await NativeSettings.open({
                    optionAndroid: AndroidSettings.ApplicationDetails,
                    optionIOS: IOSSettings.App,
                });
            } catch (e) {
                console.error("Failed to open settings:", e);
            }
        }, 1500);
        return;
    }
    if (message.includes("already started") || message.includes("already running")) return;
    if (message.includes("hardware") || message.includes("unavailable") || message.includes("not found")) {
        toast.error("دوربین در دسترس نیست یا توسط برنامه دیگری اشغال شده است.");
        return;
    }
    toast.error("خطا در راه‌اندازی دوربین. لطفاً دوباره تلاش کنید.");
};

export function useCameraCore(onCapture) {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewStarted, setPreviewStarted] = useState(false);

    const isCameraOnRef = useRef(isCameraOn);
    const isBusyRef = useRef(isBusy);

    const isMountedRef = useRef(false);

    useEffect(() => {
        isCameraOnRef.current = isCameraOn;
        isBusyRef.current = isBusy;
    }, [isCameraOn, isBusy]);

    const startCamera = useCallback(async () => {
        if (isBusyRef.current || isCameraOnRef.current) return;
        setIsBusy(true);
        isBusyRef.current = true;

        await enqueueCameraOp(async () => {
            if (!isMountedRef.current) return; // قبل از رسیدن نوبت، صفحه بسته شده
            try {
                await CameraPreview.start({
                    position: "rear",
                    toBack: true,
                    width: window.screen.width,
                    height: window.screen.height,
                    x: 0,
                    y: 0,
                    className: "camera-preview-container",
                });

                // اگر وسطِ باز شدن دوربین Back زده شده باشد، همین‌جا باید
                // خاموشش کنیم؛ وگرنه دوربین بدون صاحب روشن می‌ماند.
                if (!isMountedRef.current) {
                    await CameraPreview.stop().catch(() => { });
                    return;
                }

                setPreviewStarted(true);
                setIsCameraOn(true);
            } catch (err) {
                if (err?.message?.toLowerCase().includes("already started")) {
                    if (!isMountedRef.current) {
                        // دوربین را قبلاً جای دیگری روشن کرده‌ایم ولی این صفحه
                        // دیگر زنده نیست — آن را رها نکنیم.
                        await CameraPreview.stop().catch(() => { });
                        return;
                    }
                    setIsCameraOn(true);
                    setPreviewStarted(true);
                } else if (isMountedRef.current) {
                    handleCameraStartError(err);
                }
            }
        });

        // ممکن است صفحه هم‌زمان unmount شده باشد؛ setState فقط وقتی زنده است
        if (isMountedRef.current) {
            isBusyRef.current = false;
            setIsBusy(false);
        }
    }, []);

    const stopCamera = useCallback(async () => {
        if (isBusyRef.current && !isCameraOnRef.current) return;
        setIsBusy(true);
        isBusyRef.current = true;

        await enqueueCameraOp(async () => {
            try {
                await CameraPreview.stop();
            } catch (err) {
                const message = err?.message?.toLowerCase() || "";
                if (
                    !message.includes("not started") &&
                    !message.includes("already stopped") &&
                    isMountedRef.current
                ) {
                    toast.error("خطا در خاموش کردن دوربین.");
                }
            }
        });

        if (isMountedRef.current) {
            isBusyRef.current = false;
            setIsCameraOn(false);
            setPreviewStarted(false);
            setIsBusy(false);
        }
    }, []);

    const capturePhoto = useCallback(async () => {
        if (isProcessing || !isCameraOn) return;
        setIsProcessing(true);
        try {
            const result = await CameraPreview.capture({ quality: 90 });
            const res = await fetch(`data:image/jpeg;base64,${result.value}`);
            const blob = await res.blob();
            onCapture?.(blob);
        } catch (err) {
            console.error("Capture failed:", err);
            toast.error("خطا در ثبت تصویر.");
        } finally {
            if (isMountedRef.current) setIsProcessing(false);
        }
    }, [isProcessing, isCameraOn, onCapture]);

    useEffect(() => {
        isMountedRef.current = true;
        document.documentElement.classList.add("camera-active");
        document.body.classList.add("camera-active");

        startCamera();
        return () => {
            isMountedRef.current = false;
            document.documentElement.classList.remove("camera-active");
            document.body.classList.remove("camera-active");
            
            enqueueCameraOp(async () => {
                await CameraPreview.stop().catch(() => { });
            });
        };
    }, [startCamera]);


    useEffect(() => {
        const resumeListener = App.addListener("appStateChange", (state) => {
            if (state.isActive && !isCameraOnRef.current) {
                startCamera();
            }
        });
        return () => {
            resumeListener.then((handler) => handler.remove());
        };
    }, [startCamera]);

    return {
        isCameraOn,
        isBusy,
        isProcessing,
        previewStarted,
        startCamera,
        stopCamera,
        capturePhoto,
    };
}