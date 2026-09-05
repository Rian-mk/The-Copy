import axios from "axios";
import { toast } from "sonner";

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://localhost:7282").replace(/\/+$/, "");

const REQUEST_TIMEOUT_MS = 90000;

// Mock OTP mode: enabled only when VITE_MOCK_OTP=true (see .env.development).
// sendCode/verifyCode skip the network entirely — for builds that must be
// tested on a device without access to the real backend.
const IS_MOCK_OTP = import.meta.env.VITE_MOCK_OTP === "true";
const MOCK_OTP_CODE = "000000";
const MOCK_DELAY_MS = 500;
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "access_token_expires_at";

const getStorage = () => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
 }
};

export const tokenService = {
    getAccessToken: () => getStorage()?.getItem(ACCESS_TOKEN_KEY) ?? null,

    getRefreshToken: () => getStorage()?.getItem(REFRESH_TOKEN_KEY) ?? null,

    getAccessTokenExpiresAt: () => {
        const value = getStorage()?.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        const timestamp = Number(value);
        return Number.isFinite(timestamp) ? timestamp : null;
    },

    isAccessTokenExpired: (clockSkewSeconds = 30) => {
        const expiresAt = tokenService.getAccessTokenExpiresAt();
        if (!expiresAt) {
            return false;
        }

        return Date.now() >= expiresAt - clockSkewSeconds * 1000;
    },

    setTokens: (accessToken, refreshToken, expiresInSeconds) => {
        const storage = getStorage();
        if (!storage || !accessToken) {
            return;
        }

        storage.setItem(ACCESS_TOKEN_KEY, accessToken);

        if (refreshToken) {
            storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }

        const lifetime = Number(expiresInSeconds);
        if (Number.isFinite(lifetime) && lifetime > 0) {
            storage.setItem(
                ACCESS_TOKEN_EXPIRES_AT_KEY,
                String(Date.now() + lifetime * 1000),
            );
        } else {
            storage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
        }
    },

    clearTokens: () => {
        const storage = getStorage();
        if (!storage) {
            return;
        }

        storage.removeItem(ACCESS_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
        storage.removeItem(ACCESS_TOKEN_EXPIRES_AT_KEY);
    },
};

const axiosConfig = {
    baseURL: BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
        Accept: "application/json",
    },
};

const publicClient = axios.create(axiosConfig);

const apiClient = axios.create(axiosConfig);

const setAuthorizationHeader = (config, token) => {
    config.headers = config.headers || {};

    if (typeof config.headers.set === "function") {
        config.headers.set("Authorization", `Bearer ${token}`);
    } else {
        config.headers.Authorization = `Bearer ${token}`;
    }
};

apiClient.interceptors.request.use(
    (config) => {
        const token = tokenService.getAccessToken();

        if (token) {
            setAuthorizationHeader(config, token);
        }

        return config;
    },
    (error) => Promise.reject(error),
);

let authFailureHandler = null;

export const setAuthFailureHandler = (handler) => {
    authFailureHandler = typeof handler === "function" ? handler : null;
};

const notifyAuthFailure = (error) => {
    if (authFailureHandler) {
        authFailureHandler(error);
    }
};

let refreshPromise = null;

const refreshSession = () => {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const refreshToken = tokenService.getRefreshToken();

        if (!refreshToken) {
            throw new Error("Refresh Token موجود نیست؛ کاربر باید دوباره وارد شود.");
        }

        const { data } = await publicClient.post("/auth/refresh", {
            refreshToken,
        });

        if (!data?.accessToken || !data?.refreshToken) {
            throw new Error("پاسخ تمدید توکن معتبر نیست.");
        }

        tokenService.setTokens(
            data.accessToken,
            data.refreshToken,
            data.expiresInSeconds,
        );

        return data;
    })()
        .catch((error) => {
            tokenService.clearTokens();
            notifyAuthFailure(error);
            throw error;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

const isPublicAuthRequest = (url = "") =>
    ["/auth/send-code", "/auth/verify-code", "/auth/refresh"].some((path) =>
        String(url).includes(path),
    );

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const shouldRefresh =
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isPublicAuthRequest(originalRequest.url);

        if (!shouldRefresh) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const session = await refreshSession();
            setAuthorizationHeader(originalRequest, session.accessToken);
            return apiClient(originalRequest);
        } catch (refreshError) {
            return Promise.reject(refreshError);
        }
    },
);

export const getApiErrorMessage = (
    error,
    fallback = "در ارتباط با سرور خطایی رخ داد.",
) => {
    if (error?.code === "ECONNABORTED") {
        return "مهلت انتظار درخواست تمام شد.";
    }

    const data = error?.response?.data;

    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data?.message) {
        return data.message;
    }

    if (data?.errors && typeof data.errors === "object") {
        const validationMessage = Object.values(data.errors)
            .flat()
            .find((message) => typeof message === "string" && message.trim());

        if (validationMessage) {
            return validationMessage;
        }
    }

    if (data?.title) {
        return data.title;
    }

    if (error?.request && !error?.response) {
        return "سرور پاسخی نداد؛ آدرس Backend، CORS و اتصال اینترنت را بررسی کنید.";
    }

    return error?.message || fallback;
};

export const getRetryAfterSeconds = (error) => {
    const headerValue = error?.response?.headers?.["retry-after"];
    const bodyValue = error?.response?.data?.retryAfterSeconds;
    const value = Number(headerValue ?? bodyValue);
    return Number.isFinite(value) && value >= 0 ? value : null;
};

export const apiService = {
    get: (url, params = {}, config = {}) =>
        apiClient
            .get(url, {
                ...config,
                params: config.params ?? params,
            })
            .then((response) => response.data),

    post: (url, data = {}, config = {}) =>
        apiClient.post(url, data, config).then((response) => response.data),

    put: (url, data = {}, config = {}) =>
        apiClient.put(url, data, config).then((response) => response.data),

    patch: (url, data = {}, config = {}) =>
        apiClient.patch(url, data, config).then((response) => response.data),

    delete: (url, config = {}) =>
        apiClient.delete(url, config).then((response) => response.data),

    upload: (url, formData, onUploadProgress, config = {}) => {
        const uploadConfig = { ...config };

        if (typeof onUploadProgress === "function") {
            uploadConfig.onUploadProgress = (progressEvent) => {
                if (!progressEvent.total) {
                    return;
                }

                const percent = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total,
                );

                onUploadProgress(percent, progressEvent);
            };
        }

        return apiClient
            .post(url, formData, uploadConfig)
            .then((response) => response.data);
    },
};

export const authService = {
    sendCode: (number) => {
        if (IS_MOCK_OTP) {
            return mockDelay().then(() => {
                // No server to log the code, so show it on the device itself
                toast.info(`[حالت آزمایشی] کد ورود: ${MOCK_OTP_CODE}`);
                return { message: "کد ارسال شد (آزمایشی)." };
            });
        }

        const payload = typeof number === "string" ? { number } : number;
        return publicClient
            .post("/auth/send-code", payload)
            .then((response) => response.data);
    },

    verifyCode: async ({ number, code, fullName } = {}) => {
        if (IS_MOCK_OTP) {
            await mockDelay();

            if (code !== MOCK_OTP_CODE) {
                // Build an axios-like error so getApiErrorMessage extracts
                // the message exactly like the real flow
                const error = new Error("کد وارد شده صحیح نیست.");
                error.response = {
                    status: 400,
                    data: { message: "کد وارد شده صحیح نیست." },
                };
                throw error;
            }

            const data = {
                isNewUser: false,
                message: "ورود موفق (آزمایشی).",
                user: { id: 0, number, fullName: fullName || "کاربر آزمایشی" },
                accessToken: "mock-access-token",
                expiresInSeconds: 3600,
                refreshToken: "mock-refresh-token",
            };

            tokenService.setTokens(
                data.accessToken,
                data.refreshToken,
                data.expiresInSeconds,
            );

            return data;
        }

        const payload = { number, code };

        if (fullName !== undefined) {
            payload.fullName = fullName;
        }

        const { data } = await publicClient.post("/auth/verify-code", payload);

        tokenService.setTokens(
            data.accessToken,
            data.refreshToken,
            data.expiresInSeconds,
        );

        return data;
    },

    refresh: () => refreshSession(),

    logout: async () => {
        try {
            return await apiService.post("/auth/logout");
        } finally {
            tokenService.clearTokens();
        }
    },

    isAuthenticated: () => Boolean(tokenService.getAccessToken()),
};

export const userService = {
    getMe: () => apiService.get("/user/me"),

    updateMe: (fullNameOrPayload) => {
        const payload =
            fullNameOrPayload !== null && typeof fullNameOrPayload === "object"
                ? fullNameOrPayload
                : { fullName: fullNameOrPayload };

        return apiService.put("/user/me", payload);
    },
};

const createDocumentFormData = (file, options = {}) => {
    if (!file) {
        throw new Error("انتخاب تصویر یا PDF الزامی است.");
    }

    const formData = new FormData();
    formData.append("file", file);

    if (typeof options.language === "string" && options.language.trim()) {
        formData.append("language", options.language.trim());
    }

    if (
        typeof options.voiceLanguage === "string" &&
        options.voiceLanguage.trim()
    ) {
        formData.append("voiceLanguage", options.voiceLanguage.trim());
    }

    return formData;
};

export const ocrService = {
    recognize: (file, { language, onUploadProgress, signal } = {}) => {
        const formData = createDocumentFormData(file, { language });

        return apiService.upload("/ocr/recognize", formData, onUploadProgress, {
            signal,
        });
    },

    getById: (ocrId, config = {}) =>
        apiService.get(`/ocr/${encodeURIComponent(ocrId)}`, {}, config),
};

export const ttsService = {
    create: ({ text, language, ocrId }) =>
        apiService.post("/tts", {
            text,
            language,
            ocrId,
        }),

    createLegacy: ({ text, language, ocrId }) =>
        apiService.post("/tts/stream", {
            text,
            language,
            ocrId,
        }),

    getAudioUrl: (audioUrlOrTtsId, accessToken) =>
        buildAuthenticatedAudioUrl(audioUrlOrTtsId, accessToken),

    getAudioBlob: (audioUrlOrTtsId, config = {}) =>
        apiClient
            .get(normalizeAudioPath(audioUrlOrTtsId), {
                ...config,
                responseType: "blob",
                timeout: 0,
            })
            .then((response) => response.data),
};

export const pipelineService = {
    documentToSpeech: (
        file,
        { language, voiceLanguage, onUploadProgress, signal } = {},
    ) => {
        const formData = createDocumentFormData(file, {
            language,
            voiceLanguage,
        });

        return apiService.upload(
            "/pipeline/document-to-speech",
            formData,
            onUploadProgress,
            { signal },
        );
    },

    imageToSpeechLegacy: (
        file,
        { language, voiceLanguage, onUploadProgress, signal } = {},
    ) => {
        const formData = createDocumentFormData(file, {
            language,
            voiceLanguage,
        });

        return apiService.upload(
            "/pipeline/image-to-speech",
            formData,
            onUploadProgress,
            { signal },
        );
    },
};

const normalizeAudioPath = (audioUrlOrTtsId) => {
    const value = String(audioUrlOrTtsId ?? "").trim();

    if (!value) {
        throw new Error("audioUrl یا ttsId معتبر نیست.");
    }

    if (/^https?:\/\//i.test(value) || value.includes("/audio")) {
        return value;
    }

    return `/tts/${encodeURIComponent(value)}/audio`;
};

export const toAbsoluteApiUrl = (path) => {
    const value = String(path ?? "").trim();

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return `${BASE_URL}/${value.replace(/^\/+/, "")}`;
};

export const buildAuthenticatedAudioUrl = (
    audioUrlOrTtsId,
    accessToken = tokenService.getAccessToken(),
) => {
    const absoluteUrl = toAbsoluteApiUrl(normalizeAudioPath(audioUrlOrTtsId));
    const url = new URL(absoluteUrl);

    if (accessToken) {
        url.searchParams.set("access_token", accessToken);
    }

    return url.toString();
};

export default apiClient;
