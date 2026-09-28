import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Copy, ExternalLink, Loader2, QrCode, Award, Shield, UserCheck,
  Sparkles, Users, Maximize2, Minimize2, Printer, Download, Smartphone,
  Check, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const DESIGNATION_PRESETS = [
  { id: '', label: 'General Members', desc: 'Standard member registration', icon: Users, color: 'text-gray-700 bg-gray-50 border-gray-200' },
  { id: 'pastor', label: 'Pastors', desc: 'Pastors, campus & resident ministers', icon: Award, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { id: 'director', label: 'Directors', desc: 'Ministry directors & executive team', icon: Shield, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'hod', label: 'HODs / Unit Leads', desc: 'Department heads & team leads', icon: UserCheck, color: 'text-teal-700 bg-teal-50 border-teal-200' },
  { id: 'minister', label: 'Ministers & Elders', desc: 'Ordained ministers & council', icon: Sparkles, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'worker', label: 'Church Workers', desc: 'Workforce volunteers & servers', icon: Users, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

export default function PublicIntakeShareModal({
  open,
  onClose,
  title = 'Connect Form',
  description = 'Share this QR code or link with members and visitors.',
  url = '',
  allowDesignationSelect = false,
  defaultDesignation = '',
  churchName: propChurchName,
}) {
  const { user } = useAuth();
  const churchName = propChurchName || user?.churchName || 'Our Church';

  const [activeTab, setActiveTab] = useState('share'); // 'share' | 'print'
  const [printLayout, setPrintLayout] = useState('poster'); // 'poster' (Full A4) | 'pew' (2-up Pew cards)
  const [selectedDesignation, setSelectedDesignation] = useState(defaultDesignation);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [highResQrUrl, setHighResQrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [customHeadline, setCustomHeadline] = useState('');
  const [customSubtext, setCustomSubtext] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedDesignation(defaultDesignation);
      setFullscreen(false);
      setActiveTab('share');
      setPrintLayout('poster');
      setCustomHeadline('');
      setCustomSubtext('');
    }
  }, [open, defaultDesignation]);

  const computedUrl = url
    ? selectedDesignation
      ? `${url}${url.includes('?') ? '&' : '?'}designation=${encodeURIComponent(selectedDesignation)}`
      : url
    : '';

  useEffect(() => {
    if (!open || !computedUrl) return;

    let cancelled = false;
    setLoading(true);

    // Standard preview QR code
    QRCode.toDataURL(computedUrl, {
      width: fullscreen ? 360 : 250,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrCodeUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to generate QR code');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // High-resolution QR code for printing & image downloads (1000px)
    QRCode.toDataURL(computedUrl, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setHighResQrUrl(dataUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, computedUrl, fullscreen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(computedUrl);
      toast.success('Form link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDownloadQr = () => {
    if (!highResQrUrl && !qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = highResQrUrl || qrCodeUrl;
    const safeName = (title || 'church-qr').toLowerCase().replace(/[^a-z0-9]/g, '-');
    a.download = `${churchName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${safeName}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('High-resolution QR code downloaded!');
  };

  const handlePrint = () => {
    window.print();
  };

  const activePreset = DESIGNATION_PRESETS.find(p => p.id === selectedDesignation) || DESIGNATION_PRESETS[0];

  // Dynamic default headlines based on context
  const defaultHeadline = title.toLowerCase().includes('first')
    ? 'First Time Visiting? Welcome Home!'
    : title.toLowerCase().includes('member')
    ? 'Church Member & Leadership Registration'
    : title.toLowerCase().includes('give') || title.toLowerCase().includes('offering')
    ? 'Tithes, Offerings & Kingdom Giving'
    : title.toLowerCase().includes('prayer')
    ? 'Share Your Prayer Request With Us'
    : title.toLowerCase().includes('welfare')
    ? 'Welfare & Benevolence Assistance'
    : title.toLowerCase().includes('event') || title.toLowerCase().includes('check-in')
    ? 'Sunday Service Attendance Check-In'
    : `Connect With ${churchName}`;

  const defaultSubtext = title.toLowerCase().includes('first')
    ? 'Scan with your smartphone camera to connect with us in 30 seconds. We have a special gift for you!'
    : title.toLowerCase().includes('give')
    ? 'Scan to give online securely via Debit Card, Bank Transfer, or USSD.'
    : 'Scan with your smartphone camera to fill out this form right from your seat.';

  const displayHeadline = customHeadline || defaultHeadline;
  const displaySubtext = customSubtext || defaultSubtext;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        size={activeTab === 'print' ? 'lg' : fullscreen ? 'lg' : 'md'}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'share' ? 'print' : 'share')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                  activeTab === 'print'
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {activeTab === 'print' ? <QrCode size={14} /> : <Printer size={14} />}
                <span>{activeTab === 'print' ? 'Standard View' : 'Printable Poster / Pew Cards'}</span>
              </button>

              {activeTab === 'share' && (
                <button
                  type="button"
                  onClick={() => setFullscreen(v => !v)}
                  className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5"
                >
                  {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                  <span>{fullscreen ? 'Normal' : 'Projector Mode'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={onClose} className="btn-secondary text-xs py-1.5">Close</button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5"
                title="Download high-resolution QR PNG for print bulletins & screen slides"
              >
                <Download size={13} />
                <span>Save PNG</span>
              </button>

              {activeTab === 'print' ? (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 shadow-sm"
                >
                  <Printer size={14} />
                  <span>Print Flyer Now</span>
                </button>
              ) : (
                <button onClick={handleCopy} className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5">
                  <Copy size={13} /> Copy Link
                </button>
              )}
            </div>
          </div>
        }
      >
        {/* Tab 1: Standard Share & Projector View */}
        {activeTab === 'share' && (
          <div className="space-y-4 text-center">
            <div>
              <p className="text-sm text-gray-600">{description}</p>
            </div>

            {/* Designation Picker for Leadership Intake */}
            {allowDesignationSelect && (
              <div className="text-left bg-gray-50/80 rounded-2xl p-3 border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Award size={14} className="text-brand-600" />
                    Target Intake Designation
                  </label>
                  {selectedDesignation && (
                    <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                      Pre-tagging as {activePreset.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500">
                  Select a leadership tier to generate a dedicated QR code. Anyone who scans this QR code will automatically be tagged and prompted with that designation.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                  {DESIGNATION_PRESETS.map((p) => {
                    const isSelected = selectedDesignation === p.id;
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedDesignation(p.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-white shadow-xs ring-2 ring-brand-500/20'
                            : 'border-gray-200 bg-white/70 hover:bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-brand-900' : 'text-gray-800'}`}>
                            {p.label}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">
                            {p.id ? `Tag as ${p.id}` : 'General'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4 flex flex-col items-center gap-3">
              {selectedDesignation && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border border-brand-200 shadow-2xs text-brand-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Scanning registers as: <strong>{activePreset.label}</strong></span>
                </div>
              )}

              {loading ? (
                <div className={`${fullscreen ? 'h-[360px] w-[360px]' : 'h-[240px] w-[240px]'} flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm`}>
                  <Loader2 size={30} className="animate-spin text-brand-600" />
                </div>
              ) : qrCodeUrl ? (
                <div className="relative group">
                  <img
                    src={qrCodeUrl}
                    alt="QR code for form link"
                    className={`${fullscreen ? 'h-[360px] w-[360px]' : 'h-[240px] w-[240px]'} rounded-2xl border border-gray-200 bg-white p-3 shadow-md`}
                  />
                </div>
              ) : (
                <div className={`${fullscreen ? 'h-[360px] w-[360px]' : 'h-[240px] w-[240px]'} flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400`}>
                  <QrCode size={36} />
                </div>
              )}

              {/* Action Banner to Switch to Print */}
              <div className="w-full flex items-center justify-between p-2.5 bg-brand-50 border border-brand-200/80 rounded-xl text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
                    <Printer size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-brand-950">Need this printed for church pews or walls?</div>
                    <div className="text-[11px] text-brand-700">Click to preview printable A4 posters or 2-up seat cards.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('print')}
                  className="px-2.5 py-1 bg-white hover:bg-brand-100 text-brand-900 border border-brand-200 rounded-lg text-xs font-bold transition-all shrink-0"
                >
                  Print View →
                </button>
              </div>

              <div className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Shareable URL</p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-brand-600 hover:text-brand-700 font-semibold"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-700 font-mono break-all">{computedUrl}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              <a
                href={computedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700"
              >
                <ExternalLink size={14} /> Open Form in New Tab
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
              >
                <Copy size={14} /> Copy Registration Link
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Printable Poster & Pew Card Designer & Preview */}
        {activeTab === 'print' && (
          <div className="space-y-4">
            {/* Format Selection Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Print Size:</span>
                <div className="inline-flex p-1 bg-white border border-gray-200 rounded-xl shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPrintLayout('poster')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      printLayout === 'poster'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Full Poster (A4 / Walls)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintLayout('pew')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      printLayout === 'pew'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pew Cards (2-Up / Seats)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <Printer size={14} />
                  <span>Send to Printer</span>
                </button>
              </div>
            </div>

            {/* Quick Text Customization Accordion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Poster Headline
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-500"
                  value={customHeadline}
                  onChange={(e) => setCustomHeadline(e.target.value)}
                  placeholder={defaultHeadline}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Instruction Subtitle
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-brand-500"
                  value={customSubtext}
                  onChange={(e) => setCustomSubtext(e.target.value)}
                  placeholder={defaultSubtext}
                />
              </div>
            </div>

            {/* On-screen Print Preview Box */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-gray-100 flex flex-col items-center max-h-[460px] overflow-y-auto">
              <div className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                Print Preview (Paper Simulation)
              </div>

              {printLayout === 'poster' ? (
                /* Poster Preview (Single A4 Page) */
                <div className="w-full max-w-md bg-white border border-gray-300 rounded-xl shadow-lg p-6 sm:p-8 text-center space-y-4">
                  {/* Church Header */}
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                      <span>⛪ {churchName}</span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight leading-snug">
                      {displayHeadline}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      {displaySubtext}
                    </p>
                  </div>

                  {/* QR Box with Scan Brackets */}
                  <div className="relative inline-block mx-auto p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl">
                    <img
                      src={highResQrUrl || qrCodeUrl}
                      alt="Printable QR Code"
                      className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-xl bg-white p-2 shadow-sm"
                    />
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                      Scan with Phone Camera
                    </div>
                  </div>

                  {/* 3 Step Icons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                    <div className="p-1.5 bg-gray-50 rounded-lg">
                      <div className="text-[11px] font-bold text-gray-800">1. Open Camera</div>
                      <div className="text-[9px] text-gray-500">On your phone</div>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded-lg">
                      <div className="text-[11px] font-bold text-gray-800">2. Point at QR</div>
                      <div className="text-[9px] text-gray-500">Hold steady</div>
                    </div>
                    <div className="p-1.5 bg-gray-50 rounded-lg">
                      <div className="text-[11px] font-bold text-gray-800">3. Tap to Open</div>
                      <div className="text-[9px] text-gray-500">Fill in details</div>
                    </div>
                  </div>

                  {/* Direct Link Fallback */}
                  <div className="pt-2 text-[10px] text-gray-400 font-mono break-all">
                    Direct Link: {computedUrl}
                  </div>
                </div>
              ) : (
                /* Pew Cards Preview (2-Up) */
                <div className="w-full max-w-md space-y-3">
                  {[1, 2].map((idx) => (
                    <div key={idx} className="bg-white border border-gray-300 rounded-xl shadow-md p-4 text-center space-y-2 relative">
                      <span className="absolute top-2 right-2 text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        Pew Card #{idx}
                      </span>
                      <div className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                        ⛪ {churchName}
                      </div>
                      <h3 className="text-sm font-black text-gray-900">
                        {displayHeadline}
                      </h3>
                      <div className="flex items-center justify-center gap-3 py-1">
                        <img
                          src={highResQrUrl || qrCodeUrl}
                          alt="Pew QR Code"
                          className="w-24 h-24 rounded-lg border border-gray-200 bg-white p-1"
                        />
                        <div className="text-left text-[11px] space-y-1">
                          <p className="font-semibold text-gray-700">How to Connect:</p>
                          <p className="text-gray-500 text-[10px]">• Open phone camera</p>
                          <p className="text-gray-500 text-[10px]">• Aim at this code</p>
                          <p className="text-gray-500 text-[10px]">• Tap link to open</p>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-mono truncate">{computedUrl}</p>
                    </div>
                  ))}
                  <div className="text-[10px] text-gray-400 text-center italic">
                    ✂️ Dotted cut line divides sheet into two pew cards upon printing.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* PURE PRINT-ONLY DOCUMENT CONTAINER (Hidden on Screen, Visible on Print)  */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          /* Hide normal web app body */
          body * {
            visibility: hidden !important;
          }
          /* Reveal only the dedicated printable church flyer container */
          #church-printable-flyer,
          #church-printable-flyer * {
            visibility: visible !important;
          }
          #church-printable-flyer {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            min-height: 100vh !important;
            margin: 0 !important;
            padding: 28px 40px !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 9999999 !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: auto;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="church-printable-flyer" className="hidden">
        {printLayout === 'poster' ? (
          /* ============================================================ */
          /* PRINT MODE: A4 / LETTER FULL PAGE POSTER                     */
          /* ============================================================ */
          <div className="w-full max-w-2xl mx-auto my-auto border-4 border-slate-900 rounded-3xl p-10 text-center flex flex-col items-center justify-between" style={{ minHeight: '88vh' }}>
            {/* Header */}
            <div className="w-full border-b-2 border-slate-200 pb-6">
              <div className="inline-block px-4 py-1.5 rounded-full border-2 border-slate-900 text-slate-900 text-xs font-black uppercase tracking-widest mb-3">
                ⛪ {churchName}
              </div>
              <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight mt-1 mb-2">
                {displayHeadline}
              </h1>
              <p className="text-sm font-medium text-slate-600 max-w-lg mx-auto">
                {displaySubtext}
              </p>
            </div>

            {/* Huge Clean High-Res QR Code */}
            <div className="my-6 p-6 border-4 border-slate-900 rounded-3xl bg-white shadow-none">
              <img
                src={highResQrUrl || qrCodeUrl}
                alt="Church QR Code"
                className="w-72 h-72 mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="text-xs font-black uppercase tracking-widest text-slate-900 mt-4">
                Point Phone Camera Here
              </div>
            </div>

            {/* 3 Step Instruction Row */}
            <div className="w-full grid grid-cols-3 gap-4 border-t-2 border-b-2 border-slate-200 py-4 my-2 text-center">
              <div className="p-2">
                <div className="text-sm font-black text-slate-900 uppercase">1. Open Camera</div>
                <div className="text-xs text-slate-600 font-medium">Use your smartphone</div>
              </div>
              <div className="p-2 border-l border-r border-slate-200">
                <div className="text-sm font-black text-slate-900 uppercase">2. Point at QR</div>
                <div className="text-xs text-slate-600 font-medium">No app required</div>
              </div>
              <div className="p-2">
                <div className="text-sm font-black text-slate-900 uppercase">3. Tap Link</div>
                <div className="text-xs text-slate-600 font-medium">Fill in seconds</div>
              </div>
            </div>

            {/* Direct Fallback URL */}
            <div className="w-full pt-4">
              <p className="text-xs text-slate-500 font-medium">Camera having trouble? Type this clean link directly:</p>
              <p className="text-sm font-mono font-bold text-slate-900 mt-1">{computedUrl}</p>
              <p className="text-[11px] text-slate-400 mt-4 font-semibold">
                Thank you for worshiping with {churchName} · God bless you!
              </p>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PRINT MODE: 2-UP PEW & SEAT TENT CARDS                       */
          /* ============================================================ */
          <div className="w-full max-w-xl mx-auto my-auto flex flex-col justify-between" style={{ minHeight: '90vh' }}>
            {[1, 2].map((cardIdx) => (
              <div key={cardIdx} className="border-2 border-slate-900 rounded-2xl p-6 text-center flex flex-col justify-between" style={{ height: '44vh' }}>
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-900">
                    ⛪ {churchName}
                  </span>
                  <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight mt-1">
                    {displayHeadline}
                  </h2>
                </div>

                <div className="flex items-center justify-center gap-6 my-auto py-2">
                  <div className="p-2 border-2 border-slate-900 rounded-xl bg-white shrink-0">
                    <img
                      src={highResQrUrl || qrCodeUrl}
                      alt="Pew QR Code"
                      className="w-36 h-36"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <div className="text-left space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-900">How to Scan:</p>
                    <p className="text-xs text-slate-700">1. Open your smartphone camera</p>
                    <p className="text-xs text-slate-700">2. Point it at the QR code</p>
                    <p className="text-xs text-slate-700">3. Tap the pop-up link</p>
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">{computedUrl}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 text-[10px] font-semibold text-slate-500">
                  Welcome to {churchName} · Feel free to connect from your seat!
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}