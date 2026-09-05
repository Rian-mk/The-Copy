import React, { useState, useEffect } from 'react'
import SpeakingOrb from '@/components/player/SpeakingOrb/SpeakingOrb'
import KaraokeBox from '@/components/player/KaraokeBox/KaraokeBox'
import ProgressBar from '@/components/player/ProgressBar/ProgressBar'
import ControlsBar from '@/components/player/ControlsBar/ControlsBar'
import { READING_SPEED_KEY, CAPTURED_TEXT_KEY } from '@/constants/playerPage'

export default function PlayerPage() {
    // 1. Read default settings from localStorage (or defaults)
    // Same format as SettingsPage: raw number without the "x" suffix
    const savedSpeedStr = localStorage.getItem(READING_SPEED_KEY) || '1'
    const initialSpeed = parseFloat(savedSpeedStr) || 1.0

    const [speed, setSpeed] = useState(initialSpeed)
    const [isPlaying, setIsPlaying] = useState(true) // Autoplay by default on entry
    const [currentWordIndex, setCurrentWordIndex] = useState(0)

    // Parse text to be read (either captured from Camera or mockup default)
    const defaultText = "قند بدون نسخه پزشک مصرف نشود. در صورت بروز حساسیت یا خارش، مصرف را قطع کرده و با پزشک خود تماس بگیرید. در صورت بروز حساسیت یا خارش، مصرف را قطع کرده و با پزشک خود تماس بگیرید. در صورت بروز حساسیت یا خارش، مصرف را قطع کرده و با پزشک خود تماس بگیرید."
    const rawText = localStorage.getItem(CAPTURED_TEXT_KEY) || defaultText
    const words = rawText.split(/\s+/).filter((w) => w.length > 0)

    // 2. TTS simulation interval based on current speed
    useEffect(() => {
        let intervalId = null
        if (isPlaying && currentWordIndex < words.length - 1) {
            const baseInterval = 320 // 320ms per word at 1x
            const currentInterval = baseInterval / speed

            intervalId = setInterval(() => {
                setCurrentWordIndex((prev) => {
                    if (prev < words.length - 1) {
                        return prev + 1
                    } else {
                        setIsPlaying(false)
                        return prev
                    }
                })
            }, currentInterval)
        }
        return () => {
            if (intervalId) clearInterval(intervalId)
        }
    }, [isPlaying, currentWordIndex, speed, words.length])

    // 3. Playback actions
    const handlePlayPause = () => {
        setIsPlaying(!isPlaying)
    }

    const handleRestart = () => {
        setCurrentWordIndex(0)
        setIsPlaying(true)
    }

    const handleSkipBackward = () => {
        setCurrentWordIndex((prev) => Math.max(0, prev - 10))
    }

    const handleSkipForward = () => {
        setCurrentWordIndex((prev) => Math.min(words.length - 1, prev + 10))
    }

    // Cycle speeds: 0.5x -> 0.75x -> 1.0x -> 1.25x -> 1.5x -> 1.75x -> 2.0x -> back to 0.5x
    const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    const handleCycleSpeed = () => {
        const currentIndex = speedOptions.indexOf(speed)
        const nextIndex = (currentIndex + 1) % speedOptions.length
        const nextSpeed = speedOptions[nextIndex]
        setSpeed(nextSpeed)
        localStorage.setItem(READING_SPEED_KEY, String(nextSpeed))
    }

    // Progress bar width percentage
    const progressPercent = words.length > 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0

    return (
        <div className="w-full flex flex-col flex-1 h-full select-none justify-between pb-4">
            {/* Header / Speaking Feedback */}
            <header className="flex shrink-0 items-center gap-4 pb-5 w-full justify-start dir-rtl">
                <SpeakingOrb isPlaying={isPlaying} />
                <div className="flex-1 text-right">
                    <p className="text-lg font-bold">
                        {isPlaying ? 'در حال خواندن متن...' : 'پخش متوقف شد'}
                    </p>
                </div>
            </header>

            <KaraokeBox words={words} currentWordIndex={currentWordIndex} />

            <ProgressBar percent={progressPercent} />

            <ControlsBar
                speed={speed}
                isPlaying={isPlaying}
                onCycleSpeed={handleCycleSpeed}
                onRestart={handleRestart}
                onSkipBackward={handleSkipBackward}
                onSkipForward={handleSkipForward}
                onPlayPause={handlePlayPause}
            />
        </div>
    )
}
