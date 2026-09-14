import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Button } from "@/components/ui/button"
import CyberGlobe from './components/CyberGlobe'
import { Activity, ShieldAlert, ShieldCheck, UploadCloud, Video, ShieldX, MessageSquare, LayoutDashboard, Send, Loader2, Cpu, ScanEye, Terminal, Lock, Mic, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts'

export default function App() {
  const [events, setEvents] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [videoResult, setVideoResult] = useState(null)
  const [view, setView] = useState('admin') 
  const [chatInput, setChatInput] = useState("")
  const [chatHistory, setChatHistory] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [isLockdown, setIsLockdown] = useState(false) // NEW LOCKDOWN STATE
  const chatEndRef = useRef(null)
  const [forensicMode, setForensicMode] = useState('video') 
  const [audioResult, setAudioResult] = useState(null)

  const clearLogs = async () => {
    try {
      await fetch('http://192.168.137.1:8000/api/logs/clear', { method: 'DELETE' });
      setEvents([]); 
    } catch (err) {
      console.error("Clear Failed:", err);
    }
  };

  useEffect(() => {
    fetch('http://192.168.137.1:8000/api/logs')
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch(err => console.error("Telemetry Error:", err))

    const ws = new WebSocket('ws://192.168.137.1:8000/ws/alerts')
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'NEW_SHADOW_AI_ALERT') { 
        setEvents(prev => [message.data, ...prev].slice(0, 100)) 
      }
      // NEW LOCKDOWN LISTENER
      if (message.type === 'SYSTEM_LOCKDOWN') {
        setIsLockdown(true)
        // Auto reset after 8 seconds for the demo
        setTimeout(() => setIsLockdown(false), 8000)
      }
    }
    return () => ws.close()
  }, [])
// ==========================================
  // NEW: TAURI HARDWARE KILLSWITCH LISTENER
  // ==========================================
  useEffect(() => {
    let unlistenFn;
    
    const setupHardwareListener = async () => {
      // Listen for the Rust event we created in main.rs
      unlistenFn = await listen('HARDWARE_BREACH', (event) => {
        console.warn("RUST TRIGGERED:", event.payload);
        setIsLockdown(true); // TRIGGER THE RED SCREEN
        
        // Auto-recover after 10 seconds for demo purposes
        setTimeout(() => setIsLockdown(false), 10000);
      });
    };

    setupHardwareListener();

    return () => {
      if (unlistenFn) unlistenFn();
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, isTyping])

  const sendMessage = async () => {
    if (!chatInput.trim()) return
    const currentInput = chatInput
    setChatHistory(prev => [...prev, { role: 'user', content: currentInput }])
    setChatInput(""); setIsTyping(true)
    
    try {
      const res = await fetch('http://192.168.137.1:8000/api/chat/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      })
      const data = await res.json()
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        content: data.processed_message || "Enforcer bypassed.", 
        status: data.status 
      }])
    } catch (err) { 
      setChatHistory(prev => [...prev, { role: 'ai', content: "CRITICAL: Connection to Enforcer lost.", status: "ERROR" }])
    } finally { setIsTyping(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploading(true); setVideoResult(null)
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('http://192.168.137.1:8000/api/video/upload', { method: 'POST', body: formData })
      const data = await res.json()
      const interval = setInterval(async () => {
        const sRes = await fetch(`http://192.168.137.1:8000/api/video/${data.id}`); const sData = await sRes.json()
        if (sData.status === 'ANALYSIS_COMPLETE') { clearInterval(interval); setVideoResult(sData); setUploading(false) }
      }, 2000)
    } catch (err) { setUploading(false) }
  }

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploading(true); setAudioResult(null)
    const formData = new FormData(); formData.append('file', file)
    try {
      const res = await fetch('http://192.168.137.1:8000/api/audio/upload', { method: 'POST', body: formData })
      const data = await res.json()
      const interval = setInterval(async () => {
        const sRes = await fetch(`http://192.168.137.1:8000/api/audio/${data.id}`); const sData = await sRes.json()
        if (sData.status === 'ANALYSIS_COMPLETE') { clearInterval(interval); setAudioResult(sData); setUploading(false) }
      }, 2000)
    } catch (err) { setUploading(false) }
  }

  const chartData = [...events].reverse().map((e, idx) => ({ name: idx, Risk: e.risk_score }))
  const systemStatusColor = events[0]?.action_taken === 'BLOCKED' ? 'bg-rose-500' : 'bg-purple-500'

  return (
    // Dynamic background color based on lockdown status
    <div className={`min-h-screen p-8 relative selection:bg-purple-500/30 text-zinc-300 font-mono overflow-hidden transition-colors duration-1000 ${isLockdown ? 'bg-red-950/40' : 'bg-[#050505]'}`}>
      
      {/* Lockdown Overlay UI */}
      {isLockdown && (
         <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center bg-red-900/20 border-[10px] border-red-600 animate-pulse">
           <ShieldAlert size={120} className="text-red-500 opacity-80 mb-6 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" />
           <h1 className="text-7xl md:text-9xl font-black text-red-500 opacity-80 tracking-[0.2em] mix-blend-overlay">LOCKDOWN ACTIVE</h1>
         </div>
      )}

      {/* Passed events to the globe */}
      <CyberGlobe logs={events} />
      
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-10"></div>
      <div className={`fixed top-[-20%] left-[-10%] w-[50%] h-[50%] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000 ${isLockdown ? 'bg-red-900/40' : 'bg-purple-900/20'}`}></div>

      <div className="max-w-[1600px] mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end mb-10 border-b border-white/5 pb-6">
          <div>
            <h1 className={`text-5xl flex items-center gap-4 font-black text-white mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(168,85,247,0.4)] ${isLockdown ? 'text-red-500' : ''}`}>
              <ShieldAlert size={42} className={isLockdown ? "text-red-500 animate-bounce" : "text-purple-500"}/> SHADOWGUARD <span className="font-light text-zinc-500">OS</span>
            </h1>
            <p className="text-[10px] text-purple-400/80 tracking-[0.3em] uppercase flex items-center gap-2">
              <Lock size={10}/> Enterprise Data Loss Prevention Matrix
            </p>
            <div className="flex gap-3 mt-8">
              
              <Button 
                onClick={() => setView('admin')} 
                variant="outline"
                className={`flex items-center gap-2 px-8 py-5 rounded-sm font-black text-xs uppercase tracking-widest transition-all duration-300 ${view === 'admin' ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(147,51,234,0.5)] border-purple-400' : 'bg-[#0a0a0c] text-zinc-500 border border-white/5 hover:border-purple-500/50 hover:text-purple-400'}`}
              >
                <LayoutDashboard size={14}/> Grid View
              </Button>

              <Button 
                onClick={() => setView('chat')} 
                variant="outline"
                className={`flex items-center gap-2 px-8 py-5 rounded-sm font-black text-xs uppercase tracking-widest transition-all duration-300 ${view === 'chat' ? 'bg-purple-600 text-white shadow-[0_0_25px_rgba(147,51,234,0.5)] border-purple-400' : 'bg-[#0a0a0c] text-zinc-500 border border-white/5 hover:border-purple-500/50 hover:text-purple-400'}`}
              >
                <Terminal size={14}/> Secure Terminal
              </Button>

              <Button 
                onClick={clearLogs} 
                variant="destructive"
                className="flex items-center gap-2 px-8 py-5 rounded-sm font-black text-xs uppercase tracking-widest transition-all duration-300 bg-rose-900/20 text-rose-500 border border-rose-500/30 hover:bg-rose-600 hover:text-white"
              >
                <Trash2 size={14}/> Clear Logs
              </Button>

            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Enforcer Node</p>
              <p className={`text-sm font-black tracking-[0.2em] uppercase ${isConnected ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'text-rose-500'}`}>
                {isConnected ? 'Intercepting' : 'Offline'}
              </p>
            </div>
            <div className="bg-[#0a0a0c] p-5 rounded-full border border-white/5 shadow-2xl relative">
              {isConnected && !isLockdown && (
                <>
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${systemStatusColor}`}></div>
                  <div className={`absolute inset-[-10px] rounded-full blur-xl opacity-30 ${systemStatusColor} transition-colors duration-500`}></div>
                </>
              )}
              {isLockdown && (
                <div className="absolute inset-[-15px] rounded-full blur-xl opacity-70 bg-red-600 animate-pulse transition-colors duration-500"></div>
              )}
              <Cpu size={28} className={`relative z-10 ${isConnected ? (isLockdown ? 'text-red-500' : 'text-white') : 'text-rose-500'}`}/>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {view === 'admin' ? (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-4 gap-6 mb-6">
                <div className="bg-[#0a0a0c]/80 backdrop-blur-md p-6 border-l-2 border-l-purple-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-y border-r border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={48}/></div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] mb-2">Packets Inspected</p>
                  <p className="text-5xl font-black text-white tracking-tighter">{events.length}</p>
                </div>
                <div className="bg-[#0a0a0c]/80 backdrop-blur-md p-6 border-l-2 border-l-rose-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-y border-r border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 blur-2xl rounded-full"></div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] mb-2">Threats Blocked</p>
                  <p className="text-5xl font-black text-rose-500 tracking-tighter drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">{events.filter(e=>e.action_taken==='BLOCKED').length}</p>
                </div>
                <div className="bg-[#0a0a0c]/80 backdrop-blur-md p-6 border-l-2 border-l-amber-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] border-y border-r border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 blur-2xl rounded-full"></div>
                  <p className="text-zinc-500 text-[9px] uppercase tracking-[0.2em] mb-2">In-Flight Redactions</p>
                  <p className="text-5xl font-black text-amber-500 tracking-tighter drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]">{events.filter(e=>e.action_taken==='REDACTED').length}</p>
                </div>
                <div className="bg-[#0a0a0c]/80 backdrop-blur-md h-32 p-4 border border-white/5 relative">
                  <p className="absolute top-4 left-4 text-zinc-500 text-[9px] uppercase tracking-[0.2em] z-10">Live Risk Telemetry</p>
                  <div style={{ width: '100%', height: '100%' }} className="pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <Area type="monotone" dataKey="Risk" stroke={isLockdown ? "#ef4444" : "#a855f7"} strokeWidth={2} fill={isLockdown ? "#ef4444" : "#a855f7"} fillOpacity={0.1}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-[#0a0a0c]/80 backdrop-blur-md h-[550px] flex flex-col border border-white/5 shadow-2xl relative">
                  <div className="bg-[#050505] p-5 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center gap-3">
                      <Activity size={14} className="animate-pulse"/> Network Intercept Log
                    </h2>
                  </div>
                  <div className="overflow-y-auto flex-grow custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#050505]/90 backdrop-blur-sm z-10 text-zinc-600 text-[9px] uppercase tracking-[0.2em] border-b border-white/5">
                        <tr>
                          <th className="p-5 font-medium w-1/4">Intercept Origin</th>
                          <th className="p-5 font-medium w-1/2">NLP Payload Trace</th>
                          <th className="p-5 font-medium w-1/4 text-right">Enforcement</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {events.map((e, idx) => (
                          <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} key={e.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                            <td className="p-5 text-zinc-500 flex flex-col items-start gap-1">
                              <span>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '...'}</span>
                              <div className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 inline-block px-2 py-1 rounded-sm border border-indigo-500/20">
                                {e.employee_id}
                              </div>
                            </td>
                            <td className="p-5 text-zinc-300 max-w-md truncate">{e.prompt_text}</td>
                            <td className="p-5 text-right">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${e.action_taken === 'BLOCKED' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : e.action_taken === 'REDACTED' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-purple-400 bg-purple-500/10 border border-purple-500/20'}`}>
                                {e.action_taken === 'BLOCKED' ? <ShieldX size={10}/> : <ShieldCheck size={10}/>}
                                {e.action_taken}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-span-1 bg-[#0a0a0c]/80 backdrop-blur-md p-8 border border-white/5 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
                  <div className="flex bg-[#050505] p-1 rounded-sm border border-white/5 mb-6 w-full">
                    <button onClick={() => setForensicMode('video')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${forensicMode === 'video' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>Video Mesh</button>
                    <button onClick={() => setForensicMode('audio')} className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${forensicMode === 'audio' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-zinc-600 hover:text-zinc-400'}`}>Voice Print</button>
                  </div>

                  {forensicMode === 'video' ? <ScanEye className="text-purple-500 mb-4 opacity-80" size={48}/> : <Mic className="text-indigo-500 mb-4 opacity-80" size={48}/>}
                  <h3 className="text-sm font-black mb-2 tracking-[0.2em] uppercase text-white">{forensicMode === 'video' ? 'Biometric Forensics' : 'Vocal Forensics'}</h3>
                  <p className="text-zinc-500 text-[9px] mb-6 uppercase tracking-widest">{forensicMode === 'video' ? 'OpenCV Mesh Analysis' : 'Spectral Entropy Analysis'}</p>
                  
                  <label className={`w-full cursor-pointer bg-[#050505] p-6 border border-dashed border-zinc-800 transition-all ${forensicMode === 'video' ? 'hover:border-purple-500' : 'hover:border-indigo-500'}`}>
                    <UploadCloud size={20} className="mx-auto mb-3 text-zinc-600"/>
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Deploy Target</span>
                    <input type="file" className="hidden" accept={forensicMode === 'video' ? 'video/*' : 'audio/*'} onChange={forensicMode === 'video' ? handleFileUpload : handleAudioUpload} />
                  </label>

                  {uploading && <div className="mt-6 flex items-center justify-center gap-3 text-[10px] font-bold uppercase animate-pulse text-purple-400"><Loader2 className="animate-spin" size={14}/> Processing...</div>}
                  {videoResult && !uploading && forensicMode === 'video' && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-6 p-4 w-full border ${videoResult.deepfake_score > 50 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      <p className={`text-4xl font-black tracking-tighter ${videoResult.deepfake_score > 50 ? 'text-rose-500' : 'text-emerald-400'}`}>{videoResult.deepfake_score}%</p>
                      <p className="text-[8px] uppercase font-bold text-zinc-500 mt-1">Anomaly Probability</p>
                    </motion.div>
                  )}
                  {audioResult && !uploading && forensicMode === 'audio' && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-6 p-4 w-full border ${audioResult.deepfake_score > 50 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                      <p className={`text-4xl font-black tracking-tighter ${audioResult.deepfake_score > 50 ? 'text-rose-500' : 'text-emerald-400'}`}>{audioResult.deepfake_score}%</p>
                      <p className="text-[8px] uppercase font-bold text-zinc-500 mt-1">Clone Probability</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="max-w-4xl mx-auto bg-[#0a0a0c]/90 backdrop-blur-lg h-[700px] flex flex-col shadow-2xl border border-white/5 relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full z-20 transition-colors ${isLockdown ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,1)]' : 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,1)]'}`}></div>
              <div className="p-6 bg-[#050505] border-b border-white/5 flex items-center justify-between z-10 relative">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center gap-3"><Terminal size={14}/> ShadowGuard Secure Gateway</h2>
              </div>
              
              <div className="flex-grow overflow-y-auto p-10 space-y-8 custom-scrollbar relative z-10">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                    <ShieldCheck size={48} className="mb-6 opacity-20"/><p className="text-[10px] uppercase tracking-[0.3em] font-bold">Awaiting Data Input...</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <motion.div initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-6 shadow-2xl relative ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-l-xl rounded-br-xl' : 'bg-[#050505] border border-white/5 text-zinc-300 rounded-r-xl rounded-bl-xl'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      {msg.status && <div className={`mt-4 pt-4 border-t border-white/5 text-[9px] font-black uppercase ${msg.status === 'ENFORCING LOCKDOWN' ? 'text-red-500 animate-pulse' : 'text-rose-500'}`}>[ Policy: {msg.status} ]</div>}
                    </div>
                  </motion.div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-[#050505] px-6 py-4 rounded-r-xl border border-white/5 text-[9px] text-purple-400 animate-pulse">[ PROCESSING ]</div></div>}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-[#050505] border-t border-white/5 flex gap-4 z-10 relative">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type '> INITIATE LOCKDOWN' to test hardware killswitch..." className="flex-grow bg-[#0a0a0c] border border-white/10 rounded-sm px-6 py-4 text-sm focus:outline-none focus:border-purple-500 text-zinc-200" />
                
                <Button 
                  onClick={sendMessage} 
                  className={`px-10 py-6 rounded-sm font-black text-[10px] uppercase tracking-[0.2em] text-white ${isLockdown ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                >
                  Execute <Send size={14}/>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}