import Lottie from 'lottie-react'
import { useEffect, useRef, useState, type FC } from 'react'
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
    // Incrementing this key causes Lottie to remount → replay from the start
    const [replayKey, setReplayKey] = useState(0)
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

    // Reset completion flag whenever animation data or replayKey changes
    useEffect(() => {
        completedRef.current = false
    }, [animationData, replayKey])

    if (!animationData) return <span className={className}></span>

    return (
        <Lottie
            key={replayKey}
            animationData={animationData}
            loop={false}
            className={`${className} cursor-pointer`}
            autoPlay={autoplay}
            initialSegment={(autoplay == false && [1, 1] || undefined)}
            onComplete={() => { completedRef.current = true }}
            onClick={() => {
                // Only replay after the animation has finished at least once
                if (completedRef.current) {
                    setReplayKey(k => k + 1)
                }
            }}
        />
    )
}
