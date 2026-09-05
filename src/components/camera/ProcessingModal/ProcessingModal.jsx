import React, { useEffect, useState } from "react"

export default function ProcessingModal({
    isOpen,
    onComplete,
    lottieSrc = "/src/assets/loading.lottie",
}) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        let timer
        if (isOpen) {
            // Trigger entrance transition after mount
            const frame = requestAnimationFrame(() => setIsVisible(true))

            // Handle auto completion / navigation callback
            onComplete()

            return () => {
                cancelAnimationFrame(frame)
                if (timer) clearTimeout(timer)
            }
        } else {
            setIsVisible(false)
        }
    }, [isOpen, onComplete])

    if (!isOpen) return null

    return (
        <div className={`fixed inset-0 z-50 flex h-full w-full items-center justify-center px-4 transition-all duration-500 ${isVisible ? "bg-black/60 backdrop-blur-md opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"}`}>
            <div className={`relative flex w-full max-w-[320px] flex-col items-center gap-4 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/90 px-6 py-8 shadow-2xl shadow-black/80 transition-all duration-500 ${isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}>
                {/* Top glow ambient effect */}
                <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-32 w-72 rounded-full bg-indigo-400/15 blur-2xl" />

                {/* Lottie animation player container */}
                <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-2xl">
                    <dotlottie-wc
                        src={lottieSrc}
                        speed="1"
                        class="pointer-events-none h-full w-full shrink-0 scale-150"
                        loop
                        autoplay
                    />
                </div>

                {/* Dynamic processing steps text carousel */}
                <div className="flex w-full flex-col items-center gap-1.5">
                    <div className="inline-flex h-[1.5em] flex-col overflow-hidden text-xl font-extrabold text-slate-100">
                        <div className="animate-word-slide flex flex-col transition-transform">
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                بهبود کیفیت تصویر
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-300">
                                پردازش با هوش مصنوعی
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                تبدیل تصویر به متن و گفتار
                            </span>
                            <span className="flex h-[1.5em] items-center justify-center whitespace-nowrap text-slate-200">
                                بهبود کیفیت تصویر
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}