import { useRef } from 'react'
import { RotateCcw, Upload } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { Avatar } from '../phone/Avatar'

/** Reads a picked file as a data: URL so it can be used as `brand.avatar` with no upload/hosting needed. */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function BrandEditor() {
  const brand = useSimulatorStore((s) => s.configuredBrand)
  const updateConfiguredBrand = useSimulatorStore((s) => s.updateConfiguredBrand)
  const resetConfiguredBrand = useSimulatorStore((s) => s.resetConfiguredBrand)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const accent = sectionAccents.brand

  async function handlePickFile(file: File) {
    const dataUrl = await readFileAsDataUrl(file)
    updateConfiguredBrand({ avatar: dataUrl })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <SectionHeading accent={accent}>Brand</SectionHeading>
        <button
          type="button"
          onClick={resetConfiguredBrand}
          className={`flex items-center gap-1 text-[11px] ${accent.text} hover:underline cursor-pointer`}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar src={brand.avatar} name={brand.name} size={40} />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1 text-[11.5px] font-medium ${accent.text} hover:underline cursor-pointer`}
          >
            <Upload size={11} /> Upload picture
          </button>
          {brand.avatar && (
            <button
              type="button"
              onClick={() => updateConfiguredBrand({ avatar: undefined })}
              className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer text-left"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handlePickFile(file)
            e.target.value = ''
          }}
        />
      </div>

      <label className="flex flex-col gap-0.5">
        <span className="text-[11.5px] text-slate-500">Name</span>
        <input
          type="text"
          value={brand.name}
          onChange={(e) => updateConfiguredBrand({ name: e.target.value })}
          className={`rounded-md border ${accent.border} px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-slate-300`}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[11.5px] text-slate-500">Short name (header display)</span>
        <input
          type="text"
          value={brand.shortName ?? ''}
          onChange={(e) => updateConfiguredBrand({ shortName: e.target.value || undefined })}
          placeholder={brand.name}
          className={`rounded-md border ${accent.border} px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-slate-300`}
        />
      </label>

      <label className="flex flex-col gap-0.5">
        <span className="text-[11.5px] text-slate-500">Description (subtitle under the name)</span>
        <input
          type="text"
          value={brand.description ?? ''}
          onChange={(e) => updateConfiguredBrand({ description: e.target.value || undefined })}
          placeholder="Business Account"
          className={`rounded-md border ${accent.border} px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-slate-300`}
        />
      </label>

      <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
        <span className="text-[11.5px] text-slate-500">Verified business tick</span>
        <span className="relative inline-flex h-5 w-9 items-center">
          <input
            type="checkbox"
            checked={brand.verified ?? false}
            onChange={(e) => updateConfiguredBrand({ verified: e.target.checked })}
            className="peer sr-only"
          />
          <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-slate-700" />
          <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </span>
      </label>

      <p className="text-[10.5px] text-slate-400 mt-0.5 mb-0">Applies live — no need to restart.</p>
    </div>
  )
}
