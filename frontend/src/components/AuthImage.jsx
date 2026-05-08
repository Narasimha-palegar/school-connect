import { useEffect, useState } from "react";
import api from "@/api";

/**
 * Renders an authenticated <img> by fetching as blob (Authorization header).
 * Falls back to a placeholder while loading.
 */
export default function AuthImage({ path, alt = "", className = "" }) {
    const [src, setSrc] = useState(null);
    const [err, setErr] = useState(false);

    useEffect(() => {
        let revoked = null;
        if (!path) return;
        api.get(`/files/${path}`, { responseType: "blob" })
            .then((r) => {
                const url = URL.createObjectURL(r.data);
                revoked = url;
                setSrc(url);
            })
            .catch(() => setErr(true));
        return () => {
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [path]);

    if (!path) return null;
    if (err) {
        return (
            <div className={`bg-[#F7F6F3] flex items-center justify-center text-xs text-ink-muted ${className}`}>
                Image unavailable
            </div>
        );
    }
    if (!src) {
        return <div className={`bg-[#F7F6F3] animate-pulse ${className}`} />;
    }
    return <img src={src} alt={alt} className={className} />;
}
