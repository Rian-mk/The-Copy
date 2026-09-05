import React, { useEffect, useRef } from 'react'
import Word from './Word'

export default function KaraokeBox({ words, currentWordIndex }) {
    const containerRef = useRef(null)

    // Smooth auto-scroll to keep the active word in view.
    // We look the active word up by its data-index instead of keeping
    // one ref per word - a single container ref is enough, and it keeps
    // Word's props stable so React.memo actually works (see Word.jsx).
    useEffect(() => {
        const activeEl = containerRef.current?.querySelector(
            `[data-index="${currentWordIndex}"]`
        )
        activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [currentWordIndex])

    return (
        <div
            ref={containerRef}
            className="mb-5 min-h-0 flex-1 overflow-y-auto rounded-3xl border border-gray-800 bg-slate-900 p-5 dir-rtl"
        >
            <p className="text-[26px] leading-[2.1] font-medium text-right">
                {words.map((word, idx) => (
                    <Word
                        key={idx}
                        index={idx}
                        word={word}
                        isActive={idx === currentWordIndex}
                    />
                ))}
            </p>
        </div>
    )
}
