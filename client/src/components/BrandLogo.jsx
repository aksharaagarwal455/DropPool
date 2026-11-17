export default function BrandLogo({ className = 'h-7', showText = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Deck Identity Cart Icon */}
      <div className="w-8 h-8 rounded-xl bg-[#0F3D1E] flex items-center justify-center text-[#A3E635] shadow-xs shrink-0">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="9" cy="20" r="1.5" fill="#A3E635" />
          <circle cx="18" cy="20" r="1.5" fill="#A3E635" />
          <path
            d="M3 4h2.5l2.2 10.5a1.5 1.5 0 001.5 1.2h8.6a1.5 1.5 0 001.5-1.2L21 6H6"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 8v4m-2-2h4"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <span className="font-extrabold text-xl tracking-tight text-[#0F3D1E] flex items-center">
          Drop<span className="text-[#65A30D]">Pool</span>
        </span>
      )}
    </div>
  )
}
