import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Download, 
  BookOpen, 
  AlignLeft,
  Loader2,
  Share2,
  FileText
} from 'lucide-react';
import { analyzeUrl } from './services/geminiService';
import { generatePdf } from './services/pdfService';
import { AppStatus, ExtractedContent } from './types';
import { Button } from './components/NeoButton';
import { Background } from './components/Marquee';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<ExtractedContent | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setStatus(AppStatus.SCANNING);
    setData(null);

    // Initial UX delay
    setTimeout(async () => {
      setStatus(AppStatus.ANALYZING);
      try {
        const result = await analyzeUrl(url);
        setData(result);
        setStatus(AppStatus.READY);
      } catch (error) {
        setStatus(AppStatus.ERROR);
      }
    }, 1200);
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setUrl('');
    setData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-white/20">
      <Background />

      {/* Navigation */}
      <nav className={`fixed top-0 w-full p-6 transition-all duration-300 z-50 ${scrolled ? 'bg-black/50 backdrop-blur-md border-b border-white/5' : ''}`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <AlignLeft size={20} strokeWidth={2.5} />
            </div>
            <span className="font-display text-2xl tracking-wide text-white">Article Reader</span>
          </div>
          
          {/* Subtle status indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-white/30">
            {status === AppStatus.IDLE ? 'Ready' : 'Processing'}
            <div className={`w-2 h-2 rounded-full ${status === AppStatus.IDLE ? 'bg-green-500/50' : 'bg-blue-500 animate-pulse'}`}></div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 min-h-screen flex flex-col items-center justify-center relative z-10 pt-24 pb-12">
        
        {/* HERO / INPUT SECTION */}
        <div className={`w-full max-w-2xl transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${status === AppStatus.READY ? 'hidden' : 'block'}`}>
          
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-display font-normal mb-8 leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              Read without<br/>distractions.
            </h1>
            <p className="text-lg md:text-xl text-slate-400 font-light max-w-md mx-auto leading-relaxed">
              Transform Twitter Articles and Threads into elegantly formatted, printable documents.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <form onSubmit={handleAnalyze} className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                <FileText size={20} />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste article link..."
                className="w-full bg-transparent border border-transparent rounded-xl py-6 pl-12 pr-40 text-lg text-white placeholder-slate-600 focus:border-white/20 focus:bg-white/5 focus:outline-none transition-all font-light"
                disabled={status !== AppStatus.IDLE && status !== AppStatus.ERROR}
              />
              <div className="absolute right-2 top-2 bottom-2">
                <Button 
                  type="submit" 
                  isLoading={status === AppStatus.SCANNING || status === AppStatus.ANALYZING}
                  disabled={!url}
                  className="h-full px-8 rounded-lg bg-white text-black hover:bg-slate-200 transition-colors"
                >
                  {status === AppStatus.IDLE || status === AppStatus.ERROR ? 'Read' : 'Processing'}
                </Button>
              </div>
            </form>
          </div>

          {/* Status Message */}
          <div className="mt-8 text-center h-8">
            {status !== AppStatus.IDLE && status !== AppStatus.READY && (
              <div className="inline-flex items-center gap-3 text-slate-400 animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm tracking-wider uppercase">{status === AppStatus.SCANNING ? 'Resolving Link...' : 'Formatting Article...'}</span>
              </div>
            )}
            {status === AppStatus.ERROR && (
              <span className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20">
                Invalid link. Please ensure it is a public Twitter/X post.
              </span>
            )}
          </div>
        </div>

        {/* READING MODE (SUCCESS STATE) */}
        {status === AppStatus.READY && data && (
          <div className="w-full max-w-4xl animate-fade-in">
            
            {/* Actions Toolbar */}
            <div className="sticky top-24 z-40 flex justify-between items-center mb-8 bg-black/80 backdrop-blur-xl p-4 rounded-xl border border-white/10 shadow-2xl">
              <button 
                onClick={handleReset}
                className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                <div className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                   <ArrowRight className="rotate-180" size={16} />
                </div>
                <span>Back</span>
              </button>
              
              <div className="flex gap-3">
                 <button 
                    onClick={() => navigator.clipboard.writeText(window.location.href)}
                    className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Copy Link"
                 >
                    <Share2 size={18} />
                 </button>
                 <button 
                    onClick={() => generatePdf(data)} 
                    className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                 >
                    <Download size={16} />
                    <span>Download PDF</span>
                 </button>
              </div>
            </div>

            {/* The Article "Paper" */}
            <div className="paper-texture text-slate-900 rounded-sm min-h-[100vh] p-8 md:p-20 relative">
              
              <article className="max-w-2xl mx-auto">
                {/* Editorial Header */}
                <header className="mb-14 text-center border-b-2 border-black pb-10">
                  <div className="flex justify-center mb-6">
                    <span className="px-3 py-1 border border-black text-[10px] font-bold tracking-[0.2em] uppercase">
                      Article Archive
                    </span>
                  </div>
                  
                  <h1 className="font-display text-5xl md:text-6xl mb-8 leading-tight text-black">
                    {data.title}
                  </h1>
                  
                  <div className="flex items-center justify-center gap-4 text-slate-600 font-sans text-sm font-medium">
                     <div className="flex items-center gap-2">
                       <span className="w-8 h-[1px] bg-slate-400"></span>
                       <span className="uppercase tracking-widest text-xs">By {data.author}</span>
                       <span className="w-8 h-[1px] bg-slate-400"></span>
                     </div>
                  </div>
                </header>

                {/* Abstract */}
                <div className="mb-12">
                   <p className="font-body text-xl md:text-2xl italic leading-relaxed text-slate-700 text-center px-4 md:px-10">
                     {data.summary}
                   </p>
                </div>

                {/* Drop Cap & Content */}
                <div className="prose prose-lg prose-slate max-w-none font-body text-slate-900 leading-loose">
                  {data.content.split('\n').map((paragraph, idx) => {
                    if (!paragraph.trim()) return null;
                    // Styling for first paragraph to have drop cap effect if desired, 
                    // simpler here just to render paragraphs cleanly
                    return (
                      <p key={idx} className={`mb-6 ${idx === 0 ? "first-letter:float-left first-letter:text-7xl first-letter:pr-4 first-letter:font-display first-letter:leading-[0.8]" : ""}`}>
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-24 pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
                   <div className="flex flex-wrap justify-center gap-3">
                     {data.tags.map(tag => (
                       <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold tracking-widest uppercase rounded-full">
                         {tag}
                       </span>
                     ))}
                   </div>
                   <div className="flex items-center gap-2 text-slate-400">
                      <BookOpen size={14} />
                      <span className="text-xs font-sans uppercase tracking-widest">End of Article</span>
                   </div>
                </div>
              </article>
            </div>
            
            {/* Spacer for bottom scrolling */}
            <div className="h-20"></div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;