import { ShoppingCart } from 'lucide-react'
import type { ChannelId } from '../schema/flow'
import type { NormalizedMessage } from '../engine/types'
import { ImageWithFallback } from '../components/common/ImageWithFallback'
import { useSimulatorStore } from '../store/simulatorStore'

interface ProductCatalogMessageProps {
  message: NormalizedMessage
  channel: ChannelId
  interactive: boolean
}

export function ProductCatalogMessage({ message, interactive }: ProductCatalogMessageProps) {
  const showToast = useSimulatorStore((s) => s.showToast)
  if (message.message.type !== 'product_catalog') return null
  const { title, products } = message.message

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {title && <p className="text-[12.5px] font-medium text-slate-600 pl-1 m-0">{title}</p>}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1" role="list" aria-label="Product catalog">
        {products.map((product) => (
          <div
            key={product.id}
            role="listitem"
            className="shrink-0 snap-start bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col"
            style={{ width: 160 }}
          >
            {product.image && (
              <ImageWithFallback src={product.image} alt={product.title} className="w-full h-24 object-cover block" />
            )}
            <div className="p-2.5 flex-1 flex flex-col gap-0.5">
              <h5 className="text-[13px] font-semibold text-slate-900 m-0">{product.title}</h5>
              {product.description && <p className="text-[11.5px] text-slate-500 m-0">{product.description}</p>}
              <p className="text-[13px] font-bold text-slate-900 mt-1 m-0">{product.price}</p>
            </div>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => interactive && showToast(`Added ${product.title} to cart (demo)`)}
              className={`flex items-center justify-center gap-1.5 py-2 text-[12px] font-medium border-t border-slate-100 transition-colors ${
                interactive ? 'text-emerald-700 hover:bg-emerald-50 cursor-pointer' : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShoppingCart size={12.5} /> Add to cart
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
