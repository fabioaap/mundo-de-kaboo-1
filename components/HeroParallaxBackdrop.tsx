import React from 'react';
import { useParallaxMotion } from '../hooks/useParallaxMotion';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { HeroParallaxMode, WhiteLabelBrandId } from '../lib/whiteLabelPreview';

interface HeroParallaxBackdropProps {
    enabled?: boolean;
    className?: string;
    brandId?: WhiteLabelBrandId;
    mode?: HeroParallaxMode;
}

const MODE_CONFIG: Record<HeroParallaxMode, { layerDepths: number[]; smoothness: number; scrollInfluence: number }> = {
    off: { layerDepths: [0, 0, 0], smoothness: 0.28, scrollInfluence: 0 },
    subtle: { layerDepths: [0.2, -0.28, 0.42], smoothness: 0.28, scrollInfluence: 9 },
    standard: { layerDepths: [0.35, -0.5, 0.75], smoothness: 0.22, scrollInfluence: 13 },
};

const BRAND_SKINS: Record<WhiteLabelBrandId, { background: string; far: string; mid: string; near: string }> = {
    kaboo: {
        background: 'bg-[radial-gradient(120%_70%_at_20%_10%,rgba(111,37,108,0.12),transparent_55%),radial-gradient(90%_70%_at_85%_20%,rgba(253,182,45,0.14),transparent_60%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.9)_100%)]',
        far: 'bg-kaboo-primary/12',
        mid: 'bg-yellow-300/25',
        near: 'bg-white/75',
    },
    'central-coruja': {
        background: 'bg-[radial-gradient(120%_75%_at_18%_12%,rgba(21,128,61,0.16),transparent_52%),radial-gradient(90%_70%_at_82%_18%,rgba(251,191,36,0.18),transparent_58%),linear-gradient(180deg,rgba(247,250,247,0.98)_0%,rgba(241,248,241,0.94)_100%)]',
        far: 'bg-emerald-700/14',
        mid: 'bg-amber-300/30',
        near: 'bg-lime-50/80',
    },
};

export const HeroParallaxBackdrop: React.FC<HeroParallaxBackdropProps> = ({
    enabled = true,
    className = '',
    brandId = 'kaboo',
    mode = 'standard',
}) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const currentMode = MODE_CONFIG[mode] ? mode : 'standard';
    const motionDisabled = !enabled || prefersReducedMotion || currentMode === 'off';
    const skin = BRAND_SKINS[brandId] ?? BRAND_SKINS.kaboo;

    const { containerRef, setLayerRef } = useParallaxMotion({
        disabled: motionDisabled,
        layerDepths: MODE_CONFIG[currentMode].layerDepths,
        smoothness: MODE_CONFIG[currentMode].smoothness,
        scrollInfluence: MODE_CONFIG[currentMode].scrollInfluence,
    });

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        >
            <div className={`absolute inset-0 ${skin.background}`} />

            <div
                ref={setLayerRef(0)}
                className={`absolute -left-12 top-6 h-40 w-40 rounded-full blur-3xl will-change-transform ${skin.far}`}
            />

            <div
                ref={setLayerRef(1)}
                className={`absolute right-8 top-8 h-28 w-28 rounded-full blur-2xl will-change-transform ${skin.mid}`}
            />

            <div
                ref={setLayerRef(2)}
                className={`absolute left-1/2 top-4 h-24 w-56 -translate-x-1/2 rounded-full blur-xl will-change-transform ${skin.near}`}
            />
        </div>
    );
};
