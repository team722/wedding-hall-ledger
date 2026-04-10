export default function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] space-y-4">
      <div className="relative w-12 h-12">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-stone-200"></div>
        {/* Spinning arc */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-stone-900 animate-spin"></div>
      </div>
      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">{text}</p>
    </div>
  );
}

export function FullScreenLoader({ text = 'Authenticating...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col items-center justify-center z-50 space-y-6">
      {/* Logo */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-serif italic tracking-tight text-stone-900">Wedding Hall Ledger</h1>
        <p className="text-xs text-stone-400 mt-1 uppercase tracking-widest">Financial Management</p>
      </div>

      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-stone-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-stone-900 animate-spin"></div>
      </div>

      <p className="text-xs text-stone-400 uppercase tracking-widest animate-pulse">{text}</p>
    </div>
  );
}
