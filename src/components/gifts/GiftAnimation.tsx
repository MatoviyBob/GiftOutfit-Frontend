import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import { useEffect, useRef, type FC } from 'react'
import type { Gift } from '@/types/gift'
import { getLottieURL } from '@/types/gift'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/apiClient'
import { proxyLottieUrl } from '@/lib/giftUrls'
import { ProxiedImage } from '@/components/ui/ProxiedImage'

type GiftAnimationProps = {
    gift: Gift
    className?: string
    /** Static image shown instantly while Lottie loads */
    fallbackSrc?: string
}

export const GiftAnimation: FC<GiftAnimationProps> = ({ gift, className, fallbackSrc }) => {
    const lottieURL = getLottieURL(gift)
    const lottieRef = useRef<LottieRefCurrentProps>(null)
    const playedRef = useRef(false)

    const { data: animationData } = useQuery({
        queryKey: ['lottie', lottieURL],
        enabled: !!lottieURL,
        queryFn: async () => {
            if (!lottieURL) throw new Error('Lottie URL is not available')
            const proxiedUrl = proxyLottieUrl(lottieURL)
            const url = new URL(proxiedUrl)
            const path = url.pathname + url.search
            const res = await apiClient.get(path)
            return res.data
        },
        staleTime: Infinity,
        retry: 1,
    })

    useEffect(() => { playedRef.current = false }, [animationData])

    // Static image until data ready — no blank flash, no layout shift
    if (!animationData) {
        return fallbackSrc
            ? <ProxiedImage src={fallbackSrc} alt="" className={`${className} object-contain`} />
            : <span className={className} />
    }

    return (
        <Lottie
            lottieRef={lottieRef}
            animationData={animationData}
            loop={false}
            renderer="svg"
            className={`${className} cursor-pointer`}
            autoPlay={true}
            onComplete={() => { playedRef.current = true }}
            onClick={() => {
                if (playedRef.current) {
                    playedRef.current = false
                    lottieRef.current?.goToAndPlay(0)
                }
            }}
        />
    )
}
