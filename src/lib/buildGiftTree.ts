import type { ConstructorGiftResult } from '@/api/constructor'

export type GiftTree = {
  [model: string]: {
    [backdrop: string]: {
      symbols: {
        symbol: string
        gift_number: number
        url: string
      }[]
    }
  }
}

export const buildGiftTree = (gifts: ConstructorGiftResult[]): GiftTree => {
  const tree: GiftTree = {}

  for (const g of gifts) {
    const { model, backdrop, symbol, gift_number, url } = g

    if (!tree[model]) tree[model] = {}
    if (!tree[model][backdrop]) tree[model][backdrop] = { symbols: [] }

    tree[model][backdrop].symbols.push({
      symbol,
      gift_number,
      url,
    })
  }

  return tree
}
  