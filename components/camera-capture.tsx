'use client'

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner";


interface CameraCaptureProps {
  onClose: () => void;
}

export default function CameraCapture({onClose}: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | undefined;

        async function startCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
            } catch (err) {
                console.error(error);
                toast.error('Could not access camera');
            }
        }
        

        startCamera();

        return () => {
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    return (
        <div className="flex flex-col items-center gap-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <video ref={videoRef} autoPlay playsInline className="rounded-md w-full" />
        </div>
    )
}