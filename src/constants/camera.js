export const CAMERA_TYPES = {
    automatic: "automatic",
    manual: "manual"
}

export const CAMERA_GUIDANCE = {
    WAITING: {
        id: "waiting",
        message: " در جست‌وجوی سند...",
        severity: "info",
    },
    MOVE_LEFT: {
        id: "move_left",
        message: "کمی به سمت چپ حرکت دهید",
        severity: "warning",
    },
    MOVE_RIGHT: {
        id: "move_right",
        message: "کمی به سمت راست حرکت دهید",
        severity: "warning",
    },
    MOVE_CLOSER: {
        id: "move_closer",
        message: "دوربین را نزدیک‌تر کنید",
        severity: "warning",
    },
    MOVE_FARTHER: {
        id: "move_farther",
        message: "دوربین را عقب‌تر ببرید",
        severity: "warning",
    },
    TARGET_FOUND: {
        id: "target_found",
        message: "سند شناسایی شد؛ ثابت بمانید",
        severity: "success",
    },
    MANUAL_READY: {
        id: "manual_ready",
        message: " برای ثبت عکس، روی تصویر ضربه بزنید.",
        severity: "info",
    },
}