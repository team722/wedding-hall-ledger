import React, { useState } from "react";
import { Image as ImageIcon } from "lucide-react";


export default function ImageWithShimmer({ src, alt, className, minHeightClass, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { minHeightClass?: string }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
        <div className={`relative w-full flex-shrink-0 overflow-hidden bg-stone-100 ${!isLoaded && !hasError ? (minHeightClass || '') : ''}`}>
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-stone-200 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-stone-300 opacity-80" />
                    </div>
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
                </div>
            )}
            {hasError ? (
                <div className={`flex flex-col items-center justify-center bg-stone-100 text-stone-400 ${minHeightClass || 'py-12'}`}>
                    <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs uppercase tracking-wider">Failed to load image</span>
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setHasError(true)}
                    {...props}
                />
            )}
        </div>
    );
}