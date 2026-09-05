import { createContext, useCallback, useContext, useState } from "react";
import { tokenService, authService } from "../services/apiClient";
import { PHONE_KEY, USER_PHONE_KEY } from "../constants/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Phone number init order:
    // 1) sessionStorage — the active login flow in this tab (OTP page)
    // 2) localStorage   — the verified phone, persisted alongside the tokens
    // 3) "09"           — default prefix for the login screen
    const [phoneNumber, setPhoneNumber] = useState(
        () =>
            sessionStorage.getItem(PHONE_KEY) ||
            localStorage.getItem(USER_PHONE_KEY) ||
            "09"
    );

    // Auth state derives from the token in localStorage (not React memory),
    // so a page refresh cannot lose it
    const [isAuthenticated, setIsAuthenticated] = useState(() =>
        Boolean(tokenService.getAccessToken())
    );

    // Called after a successful OTP verification (OtpVerifyPage).
    // Persists the verified phone number so future sessions keep it.
    const login = useCallback((verifiedPhone) => {
        const phone =
            typeof verifiedPhone === "string" ? verifiedPhone.trim() : "";

        if (phone) {
            localStorage.setItem(USER_PHONE_KEY, phone);
            setPhoneNumber(phone);
        }

        setIsAuthenticated(true);
    }, []);

    // Logout — callable from anywhere (e.g. the profile page's logout button)
    const logout = useCallback(async () => {
        // 1) Reset local state first so the RequireAuth guard redirects
        //    to /auth/phone immediately, even if the server is slow or down
        sessionStorage.removeItem(PHONE_KEY);
        localStorage.removeItem(USER_PHONE_KEY);
        localStorage.removeItem("displayName");
        setPhoneNumber("09");
        setIsAuthenticated(false);

        // 2) Notify the server in the background to revoke the token;
        //    local tokens are cleared regardless of the outcome
        try {
            await authService.logout();
        } catch {
            // Server unreachable — the local logout is already complete
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{ phoneNumber, setPhoneNumber, isAuthenticated, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
