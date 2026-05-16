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
    name: 'Starter', price: '₦25,000', period: '/ month', tagline: 'Perfect for a single-branch church getting started',
    features: [
      'Single branch',
      'Up to 250 members',
      'Member directory & profiles',
      'Events & attendance',
      'First-timers tracking',
      'Basic reports',
      'Email support',
    ],
    cta: 'Get Started', highlight: false,
  },
  {
    name: 'Growth', price: '₦60,000', period: '/ month', tagline: 'For growing churches with multiple branches',
    features: [
      'Up to 3 branches',
      'Up to 500 members',
      'Everything in Starter',
      'Finance & budgets',
      'SMS & bulk email',
      'Counseling & welfare',
      'Advanced reports',
      'Priority support',
    ],
    cta: 'Get Started', highlight: true,
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
    cta: 'Contact Admin', highlight: false,
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
  return <section id={id} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>;
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
    <div className="min-h-screen bg-white text-gray-900">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
        <Section className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="TMM" className="w-10 h-10 object-contain" />
            <div className="leading-tight">
              <div className="font-display font-bold text-xl">ChurchOS</div>
              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">The Mobile Missionaries</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-700">
            <a href="#features" className="hover:text-brand-600">Features</a>
            <a href="#how" className="hover:text-brand-600">How it works</a>
            <a href="#pricing" className="hover:text-brand-600">Pricing</a>
            <a href="#faq" className="hover:text-brand-600">FAQ</a>
            <a href="#contact" className="hover:text-brand-600">Contact</a>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-brand-600">Sign in</Link>
            <Link to="/register" className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
              Get Started
            </Link>
          </div>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </Section>
        {open && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <Section className="py-4 flex flex-col gap-3 text-sm">
              <a href="#features" onClick={() => setOpen(false)}>Features</a>
              <a href="#how" onClick={() => setOpen(false)}>How it works</a>
              <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
              <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
              <a href="#contact" onClick={() => setOpen(false)}>Contact</a>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Link to="/login" className="flex-1 px-4 py-2 text-center rounded-lg border border-gray-300">Sign in</Link>
                <Link to="/register" className="flex-1 px-4 py-2 text-center rounded-lg bg-brand-600 text-white">Get Started</Link>
              </div>
            </Section>
          </div>
        )}
      </header>

      {/* HERO */}
      <Section className="py-16 sm:py-24 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" /> Built for African churches
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-tight">
              Run your entire <span className="text-brand-600">church</span> from one place.
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-xl">
              The Mobile Missionaries is the all-in-one platform to manage your members, finances, events, communications, and multiple branches. Spend less time on admin, more time on ministry.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 shadow-lg shadow-brand-600/20">
                Start free <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 font-semibold hover:bg-gray-50">
                See pricing
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No credit card</div>
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Setup in minutes</div>
              <div className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Cancel anytime</div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-100 via-purple-100 to-pink-100 rounded-3xl blur-2xl opacity-60"></div>
            <div className="relative rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
              <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div className="ml-3 text-xs text-gray-500">app.themobilemissionary.org / dashboard</div>
              </div>
              <div className="p-6 grid grid-cols-2 gap-3">
                {[
                  { label: 'Members', value: '1,247', icon: Users, color: 'bg-brand-50 text-brand-700' },
                  { label: 'This Sunday', value: '892', icon: Calendar, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Giving (mo)', value: '₦4.2M', icon: DollarSign, color: 'bg-amber-50 text-amber-700' },
                  { label: 'New visitors', value: '38', icon: Heart, color: 'bg-pink-50 text-pink-700' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-gray-100 p-4">
                    <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                    <div className="text-xl font-bold">{s.value}</div>
                  </div>
                ))}
                <div className="col-span-2 rounded-xl border border-gray-100 p-4">
                  <div className="text-xs text-gray-500 mb-2">Attendance — last 8 weeks</div>
                  <div className="flex items-end gap-1.5 h-16">
                    {[40, 55, 50, 70, 65, 80, 75, 92].map((h, i) => (
                      <div key={i} className="flex-1 bg-brand-500 rounded-t" style={{ height: `${h}%` }}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* SOCIAL PROOF */}
      <Section className="pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8 border-y border-gray-100">
          {[
            { v: '500+', l: 'churches' },
            { v: '120k+', l: 'members managed' },
            { v: '₦2B+', l: 'in giving tracked' },
            { v: '99.9%', l: 'uptime' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-brand-600">{s.v}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="features" className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">FEATURES</div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Everything your church needs</h2>
          <p className="mt-4 text-lg text-gray-600">
            One platform for every part of ministry. No more juggling spreadsheets, WhatsApp groups, and disconnected apps.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-100 p-6 hover:border-brand-200 hover:shadow-md transition">
              <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* HOW */}
      <section id="how" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">HOW IT WORKS</div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Up and running in a day</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-lg mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold text-xl mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <Section id="pricing" className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">PRICING</div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Simple, honest pricing</h2>
          <p className="mt-4 text-lg text-gray-600">Pick a plan that fits your size. Upgrade or downgrade anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING.map((p) => (
            <div key={p.name} className={`rounded-2xl p-8 border-2 ${p.highlight ? 'border-brand-600 shadow-2xl shadow-brand-600/10 relative' : 'border-gray-100'}`}>
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-600 text-white text-xs font-semibold rounded-full">
                  MOST POPULAR
                </div>
              )}
              <div className="text-sm font-semibold text-brand-600 uppercase tracking-wide">{p.name}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                {p.period && <span className="text-gray-500">{p.period}</span>}
              </div>
              <p className="mt-2 text-sm text-gray-600">{p.tagline}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={p.name === 'Enterprise' ? '#contact' : '/register'}
                className={`mt-8 block text-center px-6 py-3 rounded-lg font-semibold transition ${
                  p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border-2 border-gray-200 hover:border-brand-600 hover:text-brand-600'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <Section className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">TESTIMONIALS</div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Loved by church leaders</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-gray-100 p-6 bg-gradient-to-br from-white to-gray-50">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">"{t.quote}"</p>
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-gray-500">{t.church}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* SECURITY STRIP */}
      <Section className="py-12">
        <div className="rounded-3xl bg-gray-900 text-white p-8 sm:p-12 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-brand-300 text-sm font-semibold mb-2">
              <ShieldCheck className="w-5 h-5" /> ENTERPRISE-GRADE SECURITY
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-bold mb-2">Your data is safe with us</h3>
            <p className="text-gray-300">
              Encrypted in transit and at rest. Role-based access. Tenant isolation. Daily backups. We take security as seriously as you take ministry.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white/5 rounded-xl p-3"><ShieldCheck className="w-5 h-5 mx-auto mb-1 text-brand-300" />Encrypted</div>
            <div className="bg-white/5 rounded-xl p-3"><Globe className="w-5 h-5 mx-auto mb-1 text-brand-300" />99.9% uptime</div>
            <div className="bg-white/5 rounded-xl p-3"><QrCode className="w-5 h-5 mx-auto mb-1 text-brand-300" />Daily backups</div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">FAQ</div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold">Questions, answered</h2>
        </div>
        <div className="max-w-3xl mx-auto divide-y divide-gray-100">
          {FAQ.map((f, i) => (
            <details key={i} className="py-5 group">
              <summary className="flex justify-between items-center cursor-pointer font-semibold text-lg list-none">
                {f.q}
                <span className="text-brand-600 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-gray-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" className="py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-4">CONTACT</div>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Talk to our team</h2>
            <p className="text-lg text-gray-600 mb-8">
              Questions about pricing, migrations, or enterprise plans? We're happy to help. Most messages get a reply within 4 business hours.
            </p>
            <div className="space-y-4">
              <a href="mailto:hello@themobilemissionary.org" className="flex items-center gap-3 text-gray-700 hover:text-brand-600">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><Mail className="w-5 h-5" /></div>
                hello@themobilemissionary.org
              </a>
              <a href="tel:+2348000000000" className="flex items-center gap-3 text-gray-700 hover:text-brand-600">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><Phone className="w-5 h-5" /></div>
                +234 800 000 0000
              </a>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center"><MapPin className="w-5 h-5" /></div>
                Lagos, Nigeria
              </div>
            </div>
          </div>
          <form onSubmit={submitContact} className="rounded-2xl border border-gray-200 p-6 sm:p-8 bg-white shadow-sm space-y-4">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Message sent!</h3>
                <p className="text-gray-600">Thanks — we'll be in touch within 4 business hours.</p>
                <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm text-brand-600 font-medium hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Your name</label>
                    <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <input required type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Church name</label>
                  <input value={contact.church} onChange={(e) => setContact({ ...contact, church: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Message</label>
                  <textarea required rows={5} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none" />
                </div>
                {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={submitting} className="w-full px-6 py-3 rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {submitting ? 'Sending…' : 'Send message'}
                </button>
                <p className="text-xs text-gray-500 text-center">We'll get back to you within 4 business hours.</p>
              </>
            )}
          </form>
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section className="py-20">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-10 sm:p-16 text-center text-white">
          <h2 className="text-3xl sm:text-5xl font-display font-bold mb-4">Ready to transform your ministry?</h2>
          <p className="text-lg sm:text-xl text-brand-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of churches running better with The Mobile Missionaries. Setup is free and takes 60 seconds.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-white text-brand-700 font-bold text-lg hover:bg-brand-50">
            Get started free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 mt-12">
        <Section className="py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="TMM" className="w-9 h-9 object-contain" />
              <div className="leading-tight">
                <div className="font-display font-bold">ChurchOS</div>
                <div className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold">The Mobile Missionaries</div>
              </div>
            </div>
            <p className="text-sm text-gray-500">The all-in-one platform for modern churches.</p>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Product</div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#features" className="hover:text-brand-600">Features</a></li>
              <li><a href="#pricing" className="hover:text-brand-600">Pricing</a></li>
              <li><Link to="/register" className="hover:text-brand-600">Get Started</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Company</div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#contact" className="hover:text-brand-600">Contact</a></li>
              <li><a href="mailto:hello@themobilemissionary.org" className="hover:text-brand-600">hello@themobilemissionary.org</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3 text-sm">Legal</div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-brand-600">Privacy</a></li>
              <li><a href="#" className="hover:text-brand-600">Terms</a></li>
            </ul>
          </div>
        </Section>
        <div className="border-t border-gray-100 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} The Mobile Missionaries. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
