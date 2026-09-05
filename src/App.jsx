import { AuthProvider } from "./contexts/AuthContext"
import { ProfileProvider } from "./contexts/ProfileContext"
import AppRoutes from "./routes/AppRoutes"
import React, { useState, useEffect } from "react";
import SplashScreen from "@/components/startup/SplashScreen";
import { preloadAiEngine } from "@/utils/camera/aiEngine";

function App() {
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(10);
    const [statusText, setStatusText] = useState("در حال راه‌اندازی اولیه...");

    useEffect(() => {
        preloadAiEngine((text, percent) => {
            setStatusText(text);
            setProgress(percent);

            if (percent >= 100) {
                setTimeout(() => setIsLoading(false), 400);
            }
        });
    }, []);

    if (isLoading) {
        return <SplashScreen progress={progress} statusText={statusText} />;
    }

    return (
        <AuthProvider>
            {/* Inside AuthProvider — ProfileContext needs access to
                isAuthenticated and setPhoneNumber for syncing */}
            <ProfileProvider>
                <AppRoutes />
            </ProfileProvider>
        </AuthProvider>
    )
}

export default App
