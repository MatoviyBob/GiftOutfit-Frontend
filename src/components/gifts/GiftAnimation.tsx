import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef, type FC } from 'react'
import type { Gift } from '@/types/gift'
import { getLottieURL } from '@/types/gift'
import { useQuery } from '@tanstack/react-query'
import useApi from '@/api/hooks/useApi'
import { proxyLottieUrl } from '@/lib/giftUrls'

type GiftAnimationProps = {
    gift: Gift
    className?: string
    autoplay?: boolean
}

export const GiftAnimation: FC<GiftAnimationProps> = ({ gift, className, autoplay }) => {
    const lottieURL = getLottieURL(gift)
    const api = useApi()
    const lottieRef = useRef<LottieRefCurrentProps>(null)
    const completedRef = useRef(false)

    const { data: animationData } = useQuery({
        queryKey: ['lottie', lottieURL],
        enabled: !!lottieURL,
        queryFn: async () => {
            if (!lottieURL) throw new Error('Lottie URL is not available')
            const proxiedUrl = proxyLottieUrl(lottieURL)
            const url = new URL(proxiedUrl)
            const path = url.pathname + url.search
            const res = await api.get(path)
            return res.data
        },
        staleTime: Infinity,
        retry: 1,
    })

    // Reset completion flag whenever animation data changes
    useEffect(() => {
        completedRef.current = false
    }, [animationData])

    if (!animationData) return <span className={className}></span>

    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            renderer="canvas"
            className={`${className} cursor-pointer`}
            autoPlay={autoplay}
            initialSegment={autoplay === false ? [1, 1] : undefined}
            onComplete={() => { completedRef.current = true }}
            onClick={() => {
                // Restart without remounting — much faster than key increment
                if (completedRef.current) {
                    completedRef.current = false
                    lottieRef.current?.goToAndPlay(0)
                }
            }}
        />
    )
}
