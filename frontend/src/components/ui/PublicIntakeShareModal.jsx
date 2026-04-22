import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, Loader2, QrCode } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function PublicIntakeShareModal({ open, onClose, title, description, url }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !url) return;

    let cancelled = false;
    setLoading(true);

    QRCode.toDataURL(url, {
      width: 220,
      margin: 2,
      color: {
        dark: '#1f2937',
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
  }, [open, url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Form link copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Close</button>
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

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex flex-col items-center gap-3">
          {loading ? (
            <div className="h-[220px] w-[220px] flex items-center justify-center rounded-2xl bg-white border border-gray-200">
              <Loader2 size={24} className="animate-spin text-brand-600" />
            </div>
          ) : qrCodeUrl ? (
            <img src={qrCodeUrl} alt="QR code for form link" className="h-[220px] w-[220px] rounded-2xl border border-gray-200 bg-white p-3" />
          ) : (
            <div className="h-[220px] w-[220px] flex items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-400">
              <QrCode size={28} />
            </div>
          )}

          <div className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-left">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Share URL</p>
            <p className="text-sm text-gray-700 break-all">{url}</p>
          </div>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ExternalLink size={15} /> Open form in new tab
        </a>
      </div>
    </Modal>
  );
}