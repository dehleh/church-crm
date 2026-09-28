import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactAPI } from '../api/services';
import {
  Users, Calendar, DollarSign, MessageSquare, Heart, BarChart3,
  Building2, ShieldCheck, Zap, Globe, ArrowRight, Check, Menu, X,
  Mail, Phone, MapPin, Star, Layers, ClipboardList, QrCode,
} from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Member Management', desc: 'Full member directory with photos, contact info, family links, departments, and rich profiles.' },
  { icon: Heart, title: 'First-Timers & Follow-Ups', desc: 'Capture visitors with public forms, assign follow-ups, convert to members in one click.' },
  { icon: Calendar, title: 'Events & Attendance', desc: 'Schedule services, track attendance with QR check-in, recurring events, RSVPs.' },
  { icon: DollarSign, title: 'Finance & Budgets', desc: 'Tithes, offerings, expenses, multi-fund accounting, budgets vs actuals, exports.' },
  { icon: MessageSquare, title: 'Communications', desc: 'Bulk email and SMS to members, departments, or custom segments. Templates included.' },
  { icon: Building2, title: 'Multi-Branch', desc: 'Run multiple branches under one church. Branch-scoped members, finance, and events.' },
  { icon: BarChart3, title: 'Reports & Insights', desc: 'Growth, retention, giving, attendance trends. Export to PDF or CSV.' },
  { icon: ClipboardList, title: 'Counseling & Welfare', desc: 'Confidential counseling notes, welfare requests, prayer wall, and care tracking.' },
  { icon: Layers, title: 'Departments & Groups', desc: 'Cell groups, ministries, choir, ushers — organize your people the way you operate.' },
];

const STEPS = [
  { n: 1, title: 'Sign up your church', desc: 'Create your account in 60 seconds — no credit card needed.' },
  { n: 2, title: 'Import your members', desc: 'Bulk-import via CSV or invite your team and add members manually.' },
  { n: 3, title: 'Run your ministry', desc: 'Take attendance, record giving, send messages — everything in one place.' },
];

const PRICING = [
  {
    name: 'Starter', price: '₦250,000', period: '/ year', tagline: 'Billed annually — perfect for a single-branch church getting started',
    features: [
      'Single branch HQ',
      'Up to 250 members',
      'Member directory & profiles',
      'Events & attendance',
      'First-timers tracking',
      'Basic reports',
      'Includes 2 months free',
      'Email support',
    ],
    cta: 'Start 14-Day Trial', highlight: false,
  },
  {
    name: 'Growth', price: '₦600,000', period: '/ year', tagline: 'Billed annually — for growing churches with multiple branches',
    features: [
      'Up to 3 branch campuses',
      'Up to 500 members',
      'Everything in Starter',
      'Consolidated multi-branch view',
      'Finance & budgets',
      'SMS & bulk email',
      'Counseling & welfare',
      'Includes 2 months free',
      'Priority support',
    ],
    cta: 'Start 14-Day Trial', highlight: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '', tagline: 'For denominations & large multi-site churches (10+ branches or 5,000+ members)',
    features: [
      'Unlimited members & branches',
      'Everything in Growth',
      'Custom integrations',
      'Dedicated account manager',
      'SLA & onboarding',
      'On-premise option',
      '24/7 support',
    ],
    cta: 'Contact Sales', highlight: false,
  },
];

const TESTIMONIALS = [
  { name: 'Pastor Emmanuel O.', church: 'The Branch Church, Lekki', quote: 'The Mobile Missionaries replaced 4 different tools for us. Our pastors actually use it because it just works.' },
  { name: 'Rev. Grace A.', church: 'Living Word Assembly', quote: 'We track giving, follow up new visitors, and run our cell groups all from one place. Game changer.' },
  { name: 'Bishop David M.', church: 'Faith Tabernacle Network', quote: 'Multi-branch was the dealbreaker for us. Each campus runs independently but I see everything from the top.' },
];

const FAQ = [
  { q: 'How long does setup take?', a: 'Most churches are fully operational within a day. Import your members via CSV, invite your team, and you\'re live.' },
  { q: 'Is my church\'s data secure?', a: 'Yes. We use industry-standard encryption, role-based access control, and tenant isolation. Your data is never shared with other churches.' },
  { q: 'Can we move our existing data in?', a: 'Absolutely. Bulk CSV import is built in for members, first-timers, and finance records. Our team can help with larger migrations.' },
  { q: 'Do you support multiple branches?', a: 'Yes — multi-branch is a core feature. Each branch has its own members, events, and finances, while leadership sees the whole picture.' },
  { q: 'What if we need to cancel?', a: 'No long contracts. Cancel any time, export all your data, and we\'ll keep a backup for 30 days in case you change your mind.' },
];

function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-24 ${className}`}>
      {children}
    </section>
  );
}

export default function Landing() {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', church: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submitContact = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await contactAPI.submit({ ...contact, source: 'landing' });
      setSent(true);
      setContact({ name: '', email: '', church: '', message: '' });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.msg || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 w-full overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 w-full">
        <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-24 flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="TMM" className="w-12 h-12 md:w-14 md:h-14 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-bold text-xl md:text-2xl text-gray-950">ChurchOS</div>
              <div className="text-[10px] md:text-[11px] uppercase tracking-widest text-brand-600 font-bold">The Mobile Missionaries</div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-10 text-sm font-semibold text-gray-700">
            <a href="#features" className="hover:text-brand-600 transition-colors">Features</a>
            <a href="#how" className="hover:text-brand-600 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-brand-600 transition-colors">Contact</a>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-brand-600 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link to="/register" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
              Start Free Trial
            </Link>
          </div>
          <button className="lg:hidden p-2 text-gray-700" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {open && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-3 text-sm">
            <a href="#features" onClick={() => setOpen(false)} className="py-1 font-medium text-gray-800">Features</a>
            <a href="#how" onClick={() => setOpen(false)} className="py-1 font-medium text-gray-800">How it works</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="py-1 font-medium text-gray-800">Pricing</a>
            <a href="#faq" onClick={() => setOpen(false)} className="py-1 font-medium text-gray-800">FAQ</a>
            <a href="#contact" onClick={() => setOpen(false)} className="py-1 font-medium text-gray-800">Contact</a>
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <Link to="/login" className="flex-1 px-4 py-2.5 text-center rounded-lg border border-gray-300 font-semibold">Sign in</Link>
              <Link to="/register" className="flex-1 px-4 py-2.5 text-center rounded-lg bg-brand-600 text-white font-semibold">Start Free Trial</Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <Section className="py-12 sm:py-16 lg:py-20 xl:py-24">
        <div className="grid lg:grid-cols-12 gap-10 xl:gap-16 items-center">
          <div className="lg:col-span-6 xl:col-span-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-6 border border-brand-200/60 shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-brand-600 text-brand-600" /> Built for African churches & multi-campus ministries
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-extrabold tracking-tight leading-[1.1] text-gray-950">
              Run your entire <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">church</span> from one place.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl">
              The Mobile Missionaries is the all-in-one platform to manage your members, finances, events, communications, and multiple branches. Spend less time on admin, more time on ministry.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-wrap gap-4 items-center">
              <Link to="/register" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 shadow-xl shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]">
                Start 14-day free trial <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all">
                View Pricing Plans
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm font-medium text-gray-600">
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> 14-day full free trial</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> No credit card required</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> Setup in minutes</div>
            </div>
          </div>

          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-200 via-indigo-100 to-purple-200 rounded-3xl blur-3xl opacity-70"></div>
            <div className="relative rounded-2xl border border-gray-200/80 shadow-2xl shadow-gray-400/20 overflow-hidden bg-white">
              {/* Window chrome header */}
              <div className="bg-gray-50/90 backdrop-blur px-5 py-3 flex items-center justify-between border-b border-gray-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <div className="ml-3 text-xs font-mono text-gray-500">app.themobilemissionary.org / dashboard</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Campus
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'Total Members', value: '1,247', icon: Users, color: 'bg-brand-50 text-brand-600 border-brand-100', change: '+12% this mo' },
                    { label: 'Sunday Attendance', value: '892', icon: Calendar, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', change: '94% turn-out' },
                    { label: 'Giving (This Month)', value: '₦4.2M', icon: DollarSign, color: 'bg-amber-50 text-amber-600 border-amber-100', change: '+18% vs goal' },
                    { label: 'New First-Timers', value: '38', icon: Heart, color: 'bg-pink-50 text-pink-600 border-pink-100', change: '85% followed up' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all">
                      <div className={`w-10 h-10 rounded-lg ${s.color} border flex items-center justify-center mb-3 shadow-xs`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div className="text-xs text-gray-500 font-medium truncate">{s.label}</div>
                      <div className="text-xl sm:text-2xl font-bold font-display text-gray-900 mt-0.5">{s.value}</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-1">{s.change}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-gray-100 p-5 bg-white shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Attendance Trends (Sunday Services)</div>
                      <div className="text-xs text-gray-500">Last 10 weeks across all branches</div>
                    </div>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">Avg: 864 members</span>
                  </div>
                  <div className="flex items-end gap-2 sm:gap-3 h-28 pt-4">
                    {[45, 58, 52, 68, 62, 75, 70, 85, 80, 95].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                        <div className="w-full bg-gradient-to-t from-brand-600 to-indigo-500 rounded-t-md transition-all group-hover:brightness-110" style={{ height: `${h}%` }}></div>
                        <span className="text-[10px] text-gray-400 font-mono">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* SOCIAL PROOF */}
      <Section className="pb-16">
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 border-y border-gray-100 bg-gray-50/50 rounded-2xl px-6">
          {[
            { v: '500+', l: 'churches onboarded', sub: 'Across Nigeria & West Africa' },
            { v: '120k+', l: 'members managed', sub: 'Growing active congregations' },
            { v: '₦2B+', l: 'in giving tracked', sub: '100% audited financial accounting' },
            { v: '99.9%', l: 'platform uptime', sub: 'Enterprise high availability' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand-600 font-display">{s.v}</div>
              <div className="text-sm sm:text-base font-bold text-gray-900 mt-1.5">{s.l}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features" className="py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
            COMPREHENSIVE FEATURES
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950">
            Everything your church needs to thrive
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            One platform for every part of ministry. No more juggling spreadsheets, fragmented WhatsApp groups, and disconnected paperwork.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 p-8 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-600/5 transition-all bg-white group">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-2 font-display">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW */}
      <section id="how" className="bg-gray-50/70 py-20 lg:py-28 border-y border-gray-100 w-full">
        <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
              SIMPLE ONBOARDING
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950">
              Up and running in less than a day
            </h2>
            <p className="mt-4 text-lg text-gray-600">Getting started is seamless. Here is how your church joins ChurchOS in three quick steps.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-10">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-2xl p-8 lg:p-10 border border-gray-100 shadow-sm relative overflow-hidden group hover:border-brand-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xl mb-6 shadow-md shadow-brand-600/20">
                  {s.n}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-3 font-display">{s.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <Section id="pricing" className="py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
            ANNUAL BILLING
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950">
            Simple, honest pricing for kingdom work
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            All plans billed annually — includes 2 months free. Start immediately with your 14-day full access trial.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-stretch">
          {PRICING.map((p) => (
            <div key={p.name} className={`rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all ${
              p.highlight
                ? 'border-2 border-brand-600 shadow-2xl shadow-brand-600/15 relative bg-white ring-4 ring-brand-50'
                : 'border border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <div>
                {p.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-extrabold tracking-wider uppercase rounded-full shadow-md">
                    MOST POPULAR
                  </div>
                )}
                <div className="text-sm font-bold text-brand-600 uppercase tracking-wider">{p.name}</div>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-extrabold font-display text-gray-950">{p.price}</span>
                  {p.period && <span className="text-gray-500 font-medium text-base">{p.period}</span>}
                </div>
                <p className="mt-3 text-sm text-gray-600 font-medium leading-relaxed">{p.tagline}</p>
                <div className="my-8 border-t border-gray-100"></div>
                <ul className="space-y-3.5 text-sm text-gray-700">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                to={p.name === 'Enterprise' ? '/get-started?plan=enterprise' : `/register?plan=${p.name.toLowerCase()}`}
                className={`mt-10 block text-center px-6 py-3.5 rounded-xl font-bold text-base transition-all ${
                  p.highlight
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:scale-[1.01]'
                    : 'border-2 border-gray-200 text-gray-800 hover:border-brand-600 hover:text-brand-600 hover:bg-brand-50/30'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
            TESTIMONIALS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950">
            Trusted by senior pastors & church administrators
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-gray-200/80 p-8 bg-gradient-to-br from-white to-gray-50/50 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed text-base italic">"{t.quote}"</p>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <div className="font-bold text-gray-900 font-display">{t.name}</div>
                <div className="text-xs text-brand-600 font-semibold mt-0.5">{t.church}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* SECURITY STRIP */}
      <Section className="py-12">
        <div className="rounded-3xl bg-gray-950 text-white p-8 sm:p-12 lg:p-16 grid lg:grid-cols-12 gap-8 items-center border border-gray-800 shadow-2xl">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-2 text-brand-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-5 h-5 text-brand-400" /> ENTERPRISE-GRADE SECURITY & ISOLATION
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-extrabold mb-3">Your congregation data is sacred and protected</h3>
            <p className="text-gray-300 text-base leading-relaxed max-w-3xl">
              Encrypted in transit and at rest with TLS 1.3. Role-based access controls for pastors, accountants, and volunteers. Complete tenant isolation, mathematical webhook validation, and automated daily backups.
            </p>
          </div>
          <div className="lg:col-span-4 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur"><ShieldCheck className="w-6 h-6 mx-auto mb-2 text-brand-300" /><div className="font-bold">256-Bit TLS</div><div className="text-[10px] text-gray-400 mt-1">Encrypted</div></div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur"><Globe className="w-6 h-6 mx-auto mb-2 text-brand-300" /><div className="font-bold">99.9%</div><div className="text-[10px] text-gray-400 mt-1">SLA Uptime</div></div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur"><QrCode className="w-6 h-6 mx-auto mb-2 text-brand-300" /><div className="font-bold">Auto Backup</div><div className="text-[10px] text-gray-400 mt-1">Daily Snapshots</div></div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="py-20 lg:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950">Questions, answered</h2>
        </div>
        <div className="max-w-4xl xl:max-w-5xl mx-auto divide-y divide-gray-200">
          {FAQ.map((f, i) => (
            <details key={i} className="py-6 group">
              <summary className="flex justify-between items-center cursor-pointer font-bold text-lg text-gray-900 list-none select-none hover:text-brand-600 transition-colors">
                {f.q}
                <span className="text-brand-600 group-open:rotate-45 transition-transform text-2xl font-light leading-none ml-4">+</span>
              </summary>
              <p className="mt-3.5 text-gray-600 leading-relaxed text-base">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" className="py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 xl:gap-16 items-start">
          <div className="lg:col-span-5">
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold mb-4 border border-brand-200/60">
              DIRECT ASSISTANCE
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-gray-950 mb-4">
              Talk to our team
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
              Questions about annual billing, custom data migrations, or multi-campus deployments? Our pastoral solutions team replies within 4 business hours.
            </p>
            <div className="space-y-4">
              <a href="mailto:hello@themobilemissionary.org" className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all text-gray-700 hover:text-brand-600">
                <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs"><Mail className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Email Us</div>
                  <div className="font-medium text-sm sm:text-base">hello@themobilemissionary.org</div>
                </div>
              </a>
              <a href="tel:+2349156503692" className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all text-gray-700 hover:text-brand-600">
                <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs"><Phone className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Call / WhatsApp</div>
                  <div className="font-medium text-sm sm:text-base">+234 915 650 3692</div>
                </div>
              </a>
              <div className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 text-gray-700">
                <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shadow-xs"><MapPin className="w-5 h-5" /></div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Location</div>
                  <div className="font-medium text-sm sm:text-base">No 7 Adetoro Ipaye, Lekki, Lagos, Nigeria</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={submitContact} className="rounded-3xl border border-gray-200 p-8 sm:p-10 bg-white shadow-xl shadow-gray-200/50 space-y-5">
              {sent ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2 text-gray-900 font-display">Message sent successfully!</h3>
                  <p className="text-gray-600">Thank you. One of our ministry tech advisors will reach out shortly.</p>
                  <button type="button" onClick={() => setSent(false)} className="mt-6 px-5 py-2.5 rounded-lg border border-brand-600 text-brand-600 font-semibold hover:bg-brand-50 transition-colors">
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold font-display text-gray-900">Send an inquiry</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Your Name *</label>
                      <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        placeholder="Pastor John Doe"
                        className="mt-1.5 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Email Address *</label>
                      <input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                        placeholder="pastor@church.org"
                        className="mt-1.5 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Church or Ministry Name</label>
                    <input value={contact.church} onChange={(e) => setContact({ ...contact, church: e.target.value })}
                      placeholder="e.g. Grace Tabernacle Lekki"
                      className="mt-1.5 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Message *</label>
                    <textarea required rows={5} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })}
                      placeholder="Tell us about your congregation size, branches, or any questions..."
                      className="mt-1.5 w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all" />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>}
                  <button type="submit" disabled={submitting} className="w-full px-6 py-3.5 rounded-xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 shadow-md shadow-brand-600/20 disabled:opacity-60 transition-all hover:scale-[1.01] active:scale-[0.99]">
                    {submitting ? 'Sending message…' : 'Submit message'}
                  </button>
                  <p className="text-xs text-gray-500 text-center font-medium">We respect your privacy. No spam ever.</p>
                </>
              )}
            </form>
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-16 sm:py-20 lg:py-24">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-10 sm:p-16 lg:p-20 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold mb-5 tracking-tight">
              Ready to transform your church operations?
            </h2>
            <p className="text-lg sm:text-xl text-brand-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of ministry leaders running smoother, growing faster, and discipling better with ChurchOS.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/get-started" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-white text-brand-700 font-bold text-lg hover:bg-brand-50 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]">
                Get Started Now <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl border-2 border-white/40 text-white font-bold text-lg hover:bg-white/10 transition-all">
                Start 14-day free trial
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 mt-12 bg-white">
        <div className="w-full px-6 sm:px-10 lg:px-12 xl:px-16 2xl:px-24 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="TMM" className="w-12 h-12 object-contain" />
              <div className="leading-tight">
                <div className="font-display font-bold text-lg text-gray-950">ChurchOS</div>
                <div className="text-[9px] uppercase tracking-widest text-brand-600 font-bold">The Mobile Missionaries</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              The complete church management system built specifically for modern multi-campus and kingdom ministries.
            </p>
          </div>
          <div>
            <div className="font-bold mb-4 text-sm text-gray-900 uppercase tracking-wider">Product</div>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-brand-600 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-brand-600 transition-colors">Pricing</a></li>
              <li><Link to="/get-started" className="hover:text-brand-600 transition-colors">Get Started</Link></li>
              <li><Link to="/register" className="hover:text-brand-600 transition-colors">Free 14-day trial</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-4 text-sm text-gray-900 uppercase tracking-wider">Company</div>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li><a href="#contact" className="hover:text-brand-600 transition-colors">Contact</a></li>
              <li><a href="mailto:hello@themobilemissionary.org" className="hover:text-brand-600 transition-colors">hello@themobilemissionary.org</a></li>
              <li><span className="text-gray-500 font-medium">+234 915 650 3692</span></li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-4 text-sm text-gray-900 uppercase tracking-wider">Legal & Compliance</div>
            <ul className="space-y-2.5 text-sm text-gray-600">
              <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Security Overview</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 py-6 text-center text-xs text-gray-500 font-medium">
          © {new Date().getFullYear()} The Mobile Missionaries. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
