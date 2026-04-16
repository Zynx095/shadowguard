export default function CyberGlobe() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-40">
      <div className="relative w-[800px] h-[800px] animate-[spin_20s_linear_infinite]">
        {/* Main glowing orb */}
        <div className="absolute inset-0 rounded-full border border-purple-500/30 shadow-[0_0_150px_rgba(168,85,247,0.2)]"></div>
        
        {/* Wireframe rings mimicking 3D */}
        <div className="absolute inset-0 rounded-full border border-purple-500/20 rotate-45 scale-y-50"></div>
        <div className="absolute inset-0 rounded-full border border-blue-500/20 -rotate-45 scale-x-50"></div>
        <div className="absolute inset-0 rounded-full border border-purple-500/20 rotate-90 scale-y-50"></div>
        
        {/* Crosshairs */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-purple-500/30"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-purple-500/30"></div>
      </div>
    </div>
  )
}