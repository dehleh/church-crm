import { useState, useEffect } from 'react';
import { Bell, BellRing, Smartphone, CheckCircle2, X, Share2, Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  isIosDevice,
  isStandalone,
  subscribeUserToPush,
  getExistingSubscription,
} from '../../utils/pushNotifications';
import { memberPortalAPI } from '../../api/memberClient';

export default function PushNotificationPrompt({ churchName = 'Church' }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [testing, setTesting] = useState(false);

  const isIos = isIosDevice();
  const standalone = isStandalone();

  useEffect(() => {
    // Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem('dismiss_push_prompt') === 'true';
    if (isDismissed) setDismissed(true);

    const sup = isPushSupported();
    setSupported(sup);

    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }

    if (sup) {
      getExistingSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }

    // Capture PWA beforeinstallprompt event if available
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleEnablePush = async () => {
    setLoading(true);
    try {
      // 1. Get VAPID public key from backend
      const keyRes = await memberPortalAPI.getPushVapidKey();
      const vapidKey = keyRes.data?.data?.vapidPublicKey;

      if (!vapidKey) {
        throw new Error('VAPID public key unavailable');
      }

      // 2. Request browser permission and create subscription
      const subscription = await subscribeUserToPush(vapidKey);

      // 3. Register subscription on backend
      await memberPortalAPI.subscribePush({
        subscription,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setPermission('granted');
      toast.success('Phone notifications enabled! You will receive daily devotionals and church alerts.');

      // 4. Fire a test notification
      setTimeout(() => {
        memberPortalAPI.sendTestPush().catch(() => {});
      }, 1000);
    } catch (err) {
      console.error('Push subscription failed:', err);
      if (err.message?.includes('permission')) {
        toast.error('Notification permission was blocked. Please enable notifications in your phone browser settings.');
        setPermission('denied');
      } else {
        toast.error(err.message || 'Could not enable phone notifications.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App installed to your home screen!');
        setDeferredPrompt(null);
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const res = await memberPortalAPI.sendTestPush();
      if (res.data?.data?.sent > 0) {
        toast.success('Pop-up sent! Check your phone lock screen / notification shade.');
      } else {
        toast('Notification queued for your active device.');
      }
    } catch (err) {
      toast.error('Could not send test pop-up');
    } finally {
      setTesting(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('dismiss_push_prompt', 'true');
    setDismissed(true);
  };

  // If already subscribed, show a sleek quick-status card with test trigger
  if (isSubscribed) {
    return (
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Phone Pop-ups Active</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Your phone receives 6:00 AM Devotionals, Urgent Prayers & Church Notices.
            </p>
          </div>
        </div>
        <button
          onClick={handleTestNotification}
          disabled={testing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shrink-0 disabled:opacity-50"
        >
          <Send size={13} />
          <span>{testing ? 'Sending…' : 'Send Test Pop-Up'}</span>
        </button>
      </div>
    );
  }

  // If user dismissed or notifications permanently denied, don't show prompt
  if (dismissed || permission === 'denied') {
    return null;
  }

  // iOS Safari specific instruction if not installed to home screen
  if (isIos && !standalone) {
    return (
      <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg overflow-hidden border border-indigo-700/50">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-indigo-200 hover:text-white p-1 rounded-lg transition-colors"
          title="Dismiss"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 text-amber-300">
            <Smartphone size={22} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">iPhone / iPad Members</span>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">1-Step Setup</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Get {churchName} Pop-ups on Your Lock Screen
            </h3>
            <p className="text-xs text-indigo-100/90 leading-relaxed pt-1">
              Apple requires web apps to be on your home screen for notifications:
            </p>
            <div className="bg-black/20 rounded-xl p-3 mt-2 text-xs space-y-1.5 border border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[11px]">1</span>
                <span>Tap the Safari <strong>Share</strong> button <Share2 size={13} className="inline mx-0.5" /> at the bottom.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[11px]">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-[11px]">3</span>
                <span>Open from your Home Screen & tap <strong>Enable Pop-ups</strong>!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard Android / Chrome / Edge / Firefox / Standalone iOS prompt
  return (
    <div className="relative bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg overflow-hidden border border-indigo-700/50">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-indigo-200 hover:text-white p-1 rounded-lg transition-colors"
        title="Dismiss"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pr-6">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-300 text-amber-950 flex items-center justify-center shrink-0 shadow-md">
            <BellRing size={22} className="animate-bounce" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles size={11} /> Instant Phone Pop-ups
              </span>
            </div>
            <h3 className="text-base font-bold text-white">
              Get Daily Devotionals & Prayers on Your Phone
            </h3>
            <p className="text-xs text-indigo-100/90 leading-relaxed max-w-xl">
              Receive 6:00 AM devotionals, urgent prayer requests, and church announcements straight to your phone lock screen & notifications tray.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          {deferredPrompt && (
            <button
              onClick={handleInstallApp}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-semibold transition-all w-full sm:w-auto text-center"
            >
              📲 Install App
            </button>
          )}
          <button
            onClick={handleEnablePush}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-60"
          >
            <Bell size={14} />
            <span>{loading ? 'Activating…' : 'Enable Phone Pop-ups'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
