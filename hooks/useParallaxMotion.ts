import { useEffect, useMemo, useRef } from 'react';

interface UseParallaxMotionOptions {
    disabled?: boolean;
    layerDepths: number[];
    smoothness?: number;
    scrollInfluence?: number;
}

interface InternalPosition {
    x: number;
    y: number;
    scroll: number;
}

const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
};

export const useParallaxMotion = ({
    disabled = false,
    layerDepths,
    smoothness = 0.12,
    scrollInfluence = 26,
}: UseParallaxMotionOptions) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const targetRef = useRef<InternalPosition>({ x: 0, y: 0, scroll: 0 });
    const currentRef = useRef<InternalPosition>({ x: 0, y: 0, scroll: 0 });
    const rafRef = useRef<number | null>(null);

    const safeDepths = useMemo(() => layerDepths.map((depth) => Number(depth) || 0), [layerDepths]);

    const setLayerRef = (index: number) => (node: HTMLDivElement | null) => {
        layerRefs.current[index] = node;
    };

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const applyTransforms = () => {
            const current = currentRef.current;

            layerRefs.current.forEach((layer, index) => {
                if (!layer) {
                    return;
                }

                const depth = safeDepths[index] ?? 0;
                const translateX = current.x * depth;
                const translateY = current.y * depth + current.scroll * depth;

                layer.style.transform = `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0)`;
            });
        };

        const resetTransforms = () => {
            targetRef.current = { x: 0, y: 0, scroll: 0 };
            currentRef.current = { x: 0, y: 0, scroll: 0 };
            applyTransforms();
        };

        if (disabled) {
            resetTransforms();
            return;
        }

        const animate = () => {
            const target = targetRef.current;
            const current = currentRef.current;

            current.x += (target.x - current.x) * smoothness;
            current.y += (target.y - current.y) * smoothness;
            current.scroll += (target.scroll - current.scroll) * smoothness;

            applyTransforms();

            const isSettled =
                Math.abs(target.x - current.x) < 0.02 &&
                Math.abs(target.y - current.y) < 0.02 &&
                Math.abs(target.scroll - current.scroll) < 0.02;

            if (isSettled) {
                rafRef.current = null;
                return;
            }

            rafRef.current = window.requestAnimationFrame(animate);
        };

        const queueAnimation = () => {
            if (rafRef.current !== null) {
                return;
            }

            rafRef.current = window.requestAnimationFrame(animate);
        };

        const updateFromPointer = (clientX: number, clientY: number) => {
            const rect = container.getBoundingClientRect();
            const relativeX = (clientX - rect.left) / rect.width;
            const relativeY = (clientY - rect.top) / rect.height;

            targetRef.current.x = clamp((relativeX - 0.5) * 2, -1, 1) * 16;
            targetRef.current.y = clamp((relativeY - 0.5) * 2, -1, 1) * 16;

            queueAnimation();
        };

        const onPointerMove = (event: PointerEvent) => {
            updateFromPointer(event.clientX, event.clientY);
        };

        const onPointerLeave = () => {
            targetRef.current.x = 0;
            targetRef.current.y = 0;
            queueAnimation();
        };

        const onScroll = () => {
            const rect = container.getBoundingClientRect();
            const viewportCenter = window.innerHeight * 0.5;
            const elementCenter = rect.top + rect.height * 0.5;
            const distance = (viewportCenter - elementCenter) / window.innerHeight;

            targetRef.current.scroll = clamp(distance, -1, 1) * scrollInfluence;
            queueAnimation();
        };

        container.addEventListener('pointermove', onPointerMove, { passive: true });
        container.addEventListener('pointerleave', onPointerLeave, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });

        onScroll();
        applyTransforms();

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerleave', onPointerLeave);
            window.removeEventListener('scroll', onScroll);

            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }

            resetTransforms();
        };
    }, [disabled, safeDepths, scrollInfluence, smoothness]);

    return {
        containerRef,
        setLayerRef,
    };
};
