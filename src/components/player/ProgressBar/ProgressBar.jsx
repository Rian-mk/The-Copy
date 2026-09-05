import React from 'react'

export default function ProgressBar({ percent }) {
    return (
        <div className="mb-4 shrink-0 w-full">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${percent}%` }}
                ></div>
            </div>
        </div>
    )
}
