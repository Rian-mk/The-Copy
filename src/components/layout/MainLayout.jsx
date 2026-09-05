import React from "react";
import { useLocation, useMatches, useOutlet } from "react-router-dom";
import Header from "./Header/Header";
import Toast from "../common/Toast";
import { AnimatePresence, motion } from "framer-motion";
import { useNativeBackButton } from "../../hooks/useNativeBackButton";

// Optimized native Android page transition (GPU friendly)
const pageVariants = {
    initial: {
        opacity: 0,
        y: 12,
    },
    animate: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.2,
            ease: [0, 0, 0.2, 1], // Decelerate curve
        },
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.12,
            ease: [0.4, 0, 1, 1], // Accelerate curve
        },
    },
};

export default function MainLayout() {
    const location = useLocation();
    const matches = useMatches();
    const outlet = useOutlet();

    // Android hardware back button — mirrors the header back arrow
    // (logical parent navigation, app exit on root pages)
    useNativeBackButton();

    const currentMatch = matches.findLast((match) => match.handle?.title);
    const title = currentMatch?.handle?.title || "خوانا";
    const showBack = currentMatch?.handle?.showBack ?? false;
    // Logical parent of the current page — see the route handles in AppRoutes
    const backTo = currentMatch?.handle?.backTo ?? null;

    return (
        <div className="min-h-dvh bg-slate-950">
            <Toast />
            <div className="mx-auto flex h-dvh max-w-md flex-col text-slate-50">
                <Header title={title} showBack={showBack} backTo={backTo} />

                <main className="app-screen z-10 flex flex-1 flex-col items-center overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={location.pathname}
                            variants={pageVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            style={{ willChange: "transform, opacity" }}
                            className="transform-gpu flex h-full w-full flex-1 pb-4 pt-4 flex-col overflow-y-auto"
                        >
                            {outlet}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}