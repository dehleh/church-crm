import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/services';
import toast from 'react-hot-toast';
import { validateForm, required, email, minLength, slug } from '../utils/validation';

const STEPS = ['Church Info', 'Admin Account', 'Review'];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    churchName: '', churchSlug: '', denomination: '',
    adminFirstName: '', adminLastName: '', adminEmail: '',
    adminPassword: '', adminPhone: '',
  });

  const set = (k) => (e) => {
    let val = e.target.value;
    if (k === 'churchSlug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (k === 'churchName' && !form.churchSlug) {
      setForm(f => ({ ...f, [k]: val, churchSlug: val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') }));
      setErrors(e2 => ({ ...e2, [k]: undefined }));
      return;
    }
    setForm(f => ({ ...f, [k]: val }));
    setErrors(e2 => ({ ...e2, [k]: undefined }));
  };

  const validateStep = (s) => {
    if (s === 0) {
      return validateForm(form, {
        churchName: [required('Church name')],
        churchSlug: [required('Church slug'), slug],
      });
    }
    if (s === 1) {
      return validateForm(form, {
        adminFirstName: [required('First name')],
        adminLastName: [required('Last name')],
        adminEmail: [required('Email'), email],
        adminPassword: [required('Password'), minLength('Password', 8)],
      });
    }
    return { valid: true, errors: {} };
  };

  const nextStep = () => {
    const { valid, errors: errs } = validateStep(step);
    setErrors(errs);
    if (valid) setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      login(data.data.user, data.data);
      toast.success('Church registered! Welcome to ChurchOS 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <span className="text-3xl">⛪</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">ChurchOS</h1>
          <p className="text-brand-300 text-sm mt-1">Register your church in minutes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Steps */}
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors
                  ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-brand-600' : 'text-gray-400'}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-green-300' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-gray-900 mb-4">Church Information</h2>
              <div>
                <label className="label">Church Name *</label>
                <input className="input" placeholder="Grace Cathedral" value={form.churchName} onChange={set('churchName')} required />
              </div>
              <div>
                <label className="label">Church URL Slug *</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm">churchos.app/</span>
                  <input className={`input rounded-l-none ${errors.churchSlug ? 'border-red-400' : ''}`} placeholder="grace-cathedral" value={form.churchSlug} onChange={set('churchSlug')} />
                </div>
                {errors.churchSlug ? <p className="text-xs text-red-500 mt-1">{errors.churchSlug}</p> : <p className="text-xs text-gray-400 mt-1">Only lowercase letters, numbers, and hyphens</p>}
              </div>
              <div>
                <label className="label">Denomination</label>
                <select className="input" value={form.denomination} onChange={set('denomination')}>
                  <option value="">Select denomination</option>
                  {['Pentecostal','Baptist','Anglican','Catholic','Methodist','Presbyterian','Evangelical','Non-denominational','Others'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-gray-900 mb-4">Admin Account</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name *</label>
                  <input className={`input ${errors.adminFirstName ? 'border-red-400' : ''}`} placeholder="John" value={form.adminFirstName} onChange={set('adminFirstName')} />
                  {errors.adminFirstName && <p className="text-xs text-red-500 mt-1">{errors.adminFirstName}</p>}
                </div>
                <div>
                  <label className="label">Last Name *</label>
                  <input className={`input ${errors.adminLastName ? 'border-red-400' : ''}`} placeholder="Adeyemi" value={form.adminLastName} onChange={set('adminLastName')} />
                  {errors.adminLastName && <p className="text-xs text-red-500 mt-1">{errors.adminLastName}</p>}
                </div>
              </div>
              <div>
                <label className="label">Email Address *</label>
                <input type="email" className={`input ${errors.adminEmail ? 'border-red-400' : ''}`} placeholder="pastor@mychurch.org" value={form.adminEmail} onChange={set('adminEmail')} />
                {errors.adminEmail && <p className="text-xs text-red-500 mt-1">{errors.adminEmail}</p>}
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input type="tel" className="input" placeholder="+234 800 000 0000" value={form.adminPhone} onChange={set('adminPhone')} />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className={`input ${errors.adminPassword ? 'border-red-400' : ''}`} placeholder="Min. 8 characters" value={form.adminPassword} onChange={set('adminPassword')} />
                {errors.adminPassword && <p className="text-xs text-red-500 mt-1">{errors.adminPassword}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900 mb-4">Review & Confirm</h2>
              <div className="space-y-3">
                {[
                  { label: 'Church Name', value: form.churchName },
                  { label: 'Church Slug', value: `churchos.app/${form.churchSlug}` },
                  { label: 'Denomination', value: form.denomination || 'Not specified' },
                  { label: 'Admin Name', value: `${form.adminFirstName} ${form.adminLastName}` },
                  { label: 'Admin Email', value: form.adminEmail },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5 border-b border-gray-50">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4">By registering, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="btn-secondary flex-1 justify-center">
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={nextStep}
                className="btn-primary flex-1 justify-center"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : '🎉 Register Church'}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already registered? <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
