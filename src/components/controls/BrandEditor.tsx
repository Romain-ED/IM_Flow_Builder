import { useRef } from 'react'
import { RotateCcw, Upload } from 'lucide-react'
import { useSimulatorStore } from '../../store/simulatorStore'
import { sectionAccents } from '../../utils/accents'
import { SectionHeading } from '../common/SectionHeading'
import { Avatar } from '../phone/Avatar'
import { assetUrl } from '../../utils/assetUrl'

/** Reads a picked file as a data: URL so it can be used with no upload/hosting needed. */
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
  const showToast = useSimulatorStore((s) => s.showToast)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const accent = sectionAccents.brand

  async function handlePickFile(file: File, field: 'avatar' | 'logo' | 'banner') {
    try {
      const dataUrl = await readFileAsDataUrl(file)
      updateConfiguredBrand({ [field]: dataUrl })
    } catch {
      showToast('Could not read that image file.')
    }
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

      <ImageField
        label="Business profile image"
        src={brand.avatar}
        name={brand.name}
        inputRef={avatarInputRef}
        onPick={(file) => void handlePickFile(file, 'avatar')}
        onRemove={() => updateConfiguredBrand({ avatar: undefined })}
        accent={accent.text}
      />
      <ImageField
        label="Account logo"
        src={brand.logo}
        name={brand.name}
        inputRef={logoInputRef}
        onPick={(file) => void handlePickFile(file, 'logo')}
        onRemove={() => updateConfiguredBrand({ logo: undefined })}
        accent={accent.text}
      />

      <div className="flex flex-col gap-1">
        <span className="text-[11.5px] text-slate-500">RCS business profile banner</span>
        {brand.banner && <img src={assetUrl(brand.banner)} alt="" className="h-16 w-full rounded-md object-cover" />}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className={`flex items-center gap-1 text-[11.5px] font-medium ${accent.text} hover:underline cursor-pointer`}
          >
            <Upload size={11} /> Upload banner
          </button>
          {brand.banner && (
            <button
              type="button"
              onClick={() => updateConfiguredBrand({ banner: undefined })}
              className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handlePickFile(file, 'banner')
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

      <p className="text-[10.5px] text-slate-400 mt-0.5 mb-0">Changes are saved to this scenario automatically.</p>
    </div>
  )
}

function ImageField({
  label,
  src,
  name,
  inputRef,
  onPick,
  onRemove,
  accent,
}: {
  label: string
  src?: string
  name: string
  inputRef: React.RefObject<HTMLInputElement | null>
  onPick: (file: File) => void
  onRemove: () => void
  accent: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar src={src} name={name} size={40} />
      <div className="flex flex-col gap-1">
        <span className="text-[11.5px] text-slate-500">{label}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`flex items-center gap-1 text-[11.5px] font-medium ${accent} hover:underline cursor-pointer`}
        >
          <Upload size={11} /> Upload picture
        </button>
        {src && (
          <button type="button" onClick={onRemove} className="text-[11px] text-slate-400 hover:text-rose-600 cursor-pointer text-left">
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
