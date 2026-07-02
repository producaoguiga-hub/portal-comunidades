import { X } from 'lucide-react'

export default function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-petroleum/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 2000 }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Brand top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-verde to-oceano shrink-0" />
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-petroleum">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-petroleum"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
