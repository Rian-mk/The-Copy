import React from 'react'
import clsx from 'clsx'
import ProcessingModal from '@/components/camera/ProcessingModal'
import { useLocation } from 'react-router-dom'
import { CAMERA_TYPES } from '@/constants/camera'
import useAutomaticCamera from "@/hooks/useAutomaticCamera"
import useManualCamera from "@/hooks/useManualCamera"
import "./style.css"

const CAMERA_GUIDANCE_STYLES = {
    "info": {
        bg: "bg-cyan-400",
        text: "text-slate-950"
    },
    "warning": {
        bg: "bg-amber-400",
        text: "text-slate-950"
    },
    "success": {
        bg: "bg-lime-400",
        text: "text-slate-950"
    }
}

export default function CameraPage() {
    const location = useLocation().state
    const cameraTypeRequest = location?.type || CAMERA_TYPES.automatic

    return (
        <>
            {cameraTypeRequest == CAMERA_TYPES.automatic ? <AutomaticCameraView onCapture={() => { }} /> : <ManualCameraView onCapture={() => { }} />}
        </>
    )
}

function ManualCameraView({ onCapture }) {
    const { status, isProcessing, capturePhoto } = useManualCamera(onCapture);

    return <>
        <ProcessingModal
            isOpen={isProcessing}
            onComplete={() => { }}
        />
        {/* <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
            <div className="relative flex justify-center flex-1 overflow-hidden bg-[url(assets/camera-sample.jpg)] bg-cover bg-center">
                <div
                    className="transform-gpu animate-scan pointer-events-none absolute right-0 left-0 z-10 h-1 bg-amber-400">
                </div>
                <div
                    className="pointer-events-none absolute inset-x-4 inset-y-8 z-10 rounded-3xl border-2 border-dashed border-amber-400/50">
                </div>
            </div>
        </div> */}
        <div className="relative flex flex-col w-full h-full">
            <div className='flex-1'></div>
            {/* <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
                <div className="relative flex justify-center flex-1 overflow-hidden bg-[url(assets/camera-sample.jpg)] bg-cover bg-center">
                    <div
                        className="transform-gpu animate-scan pointer-events-none absolute right-0 left-0 z-10 h-1 bg-amber-400">
                    </div>
                    <div
                        className="pointer-events-none absolute inset-x-4 inset-y-8 z-10 rounded-3xl border-2 border-dashed border-amber-400/50">
                    </div>
                </div>
            </div> */}
            <div className={clsx("flex-none px-1 py-2 text-center text-xl font-bold", CAMERA_GUIDANCE_STYLES[status.severity].bg, CAMERA_GUIDANCE_STYLES[status.severity].text)}>
                {status.message}
            </div>
        </div>

    </>
}

function AutomaticCameraView({ onCapture }) {
    const { status, isProcessing } = useAutomaticCamera(onCapture);

    return <>
        <ProcessingModal
            isOpen={isProcessing}
            onComplete={() => { }}
        />
        <div className="relative flex flex-col w-full h-full">
            <div className='flex-1'></div>
            {/* <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
                <div className="relative flex justify-center flex-1 overflow-hidden bg-[url(assets/camera-sample.jpg)] bg-cover bg-center">
                    <div
                        className="transform-gpu animate-scan pointer-events-none absolute right-0 left-0 z-10 h-1 bg-amber-400">
                    </div>
                    <div
                        className="pointer-events-none absolute inset-x-4 inset-y-8 z-10 rounded-3xl border-2 border-dashed border-amber-400/50">
                    </div>
                </div>
            </div> */}
            <div className={clsx("flex-none px-1 py-2 text-center text-xl font-bold", CAMERA_GUIDANCE_STYLES[status.severity].bg, CAMERA_GUIDANCE_STYLES[status.severity].text)}>
                {status.message}
            </div>
        </div>
    </>
}