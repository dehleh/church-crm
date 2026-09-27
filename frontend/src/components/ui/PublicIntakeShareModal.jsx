import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, Loader2, QrCode, Award, Shield, UserCheck, Sparkles, Users, Maximize2, Minimize2 } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

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
  title,
  description,
  url,
  allowDesignationSelect = false,
  defaultDesignation = '',
}) {
  const [selectedDesignation, setSelectedDesignation] = useState(defaultDesignation);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedDesignation(defaultDesignation);
      setFullscreen(false);
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

    QRCode.toDataURL(computedUrl, {
      width: fullscreen ? 340 : 230,
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

    return () => {
      cancelled = true;
    };
  }, [open, computedUrl, fullscreen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(computedUrl);
      toast.success('Form link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const activePreset = DESIGNATION_PRESETS.find(p => p.id === selectedDesignation) || DESIGNATION_PRESETS[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={fullscreen ? 'lg' : 'md'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button
            type="button"
            onClick={() => setFullscreen(v => !v)}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {fullscreen ? 'Normal View' : 'Projector Mode'}
          </button>
          <button onClick={handleCopy} className="btn-primary inline-flex items-center gap-2">
            <Copy size={15} /> Copy Link
          </button>
        </>
      }
    >
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
            <div className={`${fullscreen ? 'h-[340px] w-[340px]' : 'h-[230px] w-[230px]'} flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm`}>
              <Loader2 size={30} className="animate-spin text-brand-600" />
            </div>
          ) : qrCodeUrl ? (
            <div className="relative group">
              <img
                src={qrCodeUrl}
                alt="QR code for form link"
                className={`${fullscreen ? 'h-[340px] w-[340px]' : 'h-[230px] w-[230px]'} rounded-2xl border border-gray-200 bg-white p-3 shadow-md`}
              />
            </div>
          ) : (
            <div className={`${fullscreen ? 'h-[340px] w-[340px]' : 'h-[230px] w-[230px]'} flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400`}>
              <QrCode size={36} />
            </div>
          )}

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
    </Modal>
  );
}