import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Download,
  BookOpen,
  AlignLeft,
  Loader2,
  Share2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { fetchTweet } from './services/twitterService';
import { generatePdf } from './services/pdfService';
import { AppStatus, ExtractedContent, ContentBlock } from './types';
import { Button } from './components/NeoButton';
import { Background } from './components/Marquee';

// Render a text block with clickable links
const TextWithLinks: React.FC<{ content: string; links?: { text: string; url: string }[] }> = ({ content, links }) => {
  if (!links || links.length === 0) {
    return <>{content}</>;
  }

  // Find and replace links in content
  let result = content;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  links.forEach((link, i) => {
    const index = result.indexOf(link.text, lastIndex);
    if (index !== -1) {
      // Add text before link
      if (index > lastIndex) {
        elements.push(<span key={`text-${i}`}>{result.slice(lastIndex, index)}</span>);
      }
      // Add link
      elements.push(
        <a
          key={`link-${i}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          {link.text}
          <ExternalLink size={12} className="inline" />
        </a>
      );
      lastIndex = index + link.text.length;
    }
  });

  // Add remaining text
  if (lastIndex < result.length) {
    elements.push(<span key="text-end">{result.slice(lastIndex)}</span>);
  }

  return <>{elements.length > 0 ? elements : content}</>;
};

// Render content blocks (text, images, headings)
const ContentBlocks: React.FC<{ blocks: ContentBlock[] }> = ({ blocks }) => {
  return (
    <div className="space-y-6">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <h2 key={idx} className="font-bold text-2xl text-black mt-10 mb-4 font-display">
              {block.content}
            </h2>
          );
        }

        if (block.type === 'image') {
          return (
            <figure key={idx} className="my-8">
              <img
                src={block.url}
                alt=""
                className="w-full rounded-lg shadow-lg"
                crossOrigin="anonymous"
              />
            </figure>
          );
        }

        if (block.type === 'text') {
          return (
            <p key={idx} className="text-lg leading-relaxed text-slate-800 font-body">
              <TextWithLinks content={block.content || ''} links={block.links} />
            </p>
          );
        }

        return null;
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [data, setData] = useState<ExtractedContent | null>(null);
  const [scrolled, setScrolled] = useState(false);

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

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setStatus(AppStatus.ANALYZING);

      const result = await fetchTweet(url);
      setData(result);
      setStatus(AppStatus.READY);
    } catch (error) {
      console.error(error);
      setStatus(AppStatus.ERROR);
    }
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
              Transform Twitter Articles into elegantly formatted, printable documents.
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
                placeholder="Paste X Article link..."
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
                <span className="text-sm tracking-wider uppercase">
                  {status === AppStatus.SCANNING ? 'Connecting...' : 'Extracting Article (~15s)...'}
                </span>
              </div>
            )}
            {status === AppStatus.ERROR && (
              <span className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20">
                Failed to load article. Make sure the backend is running and the URL is valid.
              </span>
            )}
          </div>
        </div>

        {/* ARTICLE VIEW */}
        {status === AppStatus.READY && data && (
          <div className="w-full max-w-3xl animate-fade-in">

            {/* Actions Toolbar */}
            <div className="sticky top-24 z-40 flex justify-between items-center mb-6 bg-black/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
              <button
                onClick={handleReset}
                className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                <ArrowRight className="rotate-180" size={16} />
                <span>Back</span>
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => data.tweetUrl && window.open(data.tweetUrl, '_blank')}
                  className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="View Original"
                >
                  <ExternalLink size={18} />
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(data.tweetUrl || '')}
                  className="p-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Copy Link"
                >
                  <Share2 size={18} />
                </button>
                <button
                  onClick={() => generatePdf(data).catch(console.error)}
                  className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  <Download size={16} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Twitter-style Article Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">

              {/* Cover Image */}
              {data.coverImage && (
                <div className="w-full aspect-[2/1] overflow-hidden">
                  <img
                    src={data.coverImage}
                    alt="Article cover"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              {/* Article Header */}
              <div className="p-8 pb-0">
                {/* Author Info */}
                <div className="flex items-center gap-3 mb-6">
                  {data.authorAvatar ? (
                    <img
                      src={data.authorAvatar}
                      alt={data.author}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-xl font-bold text-slate-500">
                        {data.author?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-black">{data.author}</div>
                    {data.authorHandle && (
                      <div className="text-slate-500 text-sm">{data.authorHandle}</div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-black mb-6 font-display leading-tight">
                  {data.title}
                </h1>

                {/* Divider */}
                <div className="border-b border-slate-200 mb-8"></div>
              </div>

              {/* Article Content */}
              <div className="px-8 pb-8">
                {data.blocks && data.blocks.length > 0 ? (
                  <ContentBlocks blocks={data.blocks} />
                ) : (
                  // Fallback to simple content
                  <div className="prose prose-lg max-w-none">
                    {data.content.split('\n').map((paragraph, idx) => {
                      if (!paragraph.trim()) return null;
                      return (
                        <p key={idx} className="text-lg leading-relaxed text-slate-800 mb-4">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <BookOpen size={14} />
                    <span>Archived from X</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-20"></div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
