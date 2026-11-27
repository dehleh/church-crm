import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  Download, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  ArrowLeft,
  Scale,
  Award,
  Database,
  Key
} from 'lucide-react';

export default function PrivacyPolicy() {
  const lastUpdated = "November 27, 2026";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-brand-600 transition-colors">
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="ChurchOS" className="w-7 h-7 object-contain" />
              <span className="font-display font-bold text-gray-900 text-base">ChurchOS</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <ShieldCheck size={14} className="text-emerald-600" />
              NDPC Compliant (NDPA 2023)
            </div>
            <button
              onClick={handlePrint}
              type="button"
              className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download size={13} /> Print Policy
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-brand-900 via-gray-900 to-gray-950 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-gray-800">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-400/30 text-brand-300 text-xs font-bold uppercase tracking-widest">
            <Scale size={14} /> Nigeria Data Protection Commission (NDPC) Framework
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight">
            Privacy & Data Handling Policy
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Statutory disclosure on how ChurchOS and Subscribing Churches collect, process, safeguard, and honor the privacy rights of church members, visitors, and ministry staff under the Nigeria Data Protection Act (NDPA 2023).
          </p>
          <div className="pt-2 text-xs text-gray-400 font-medium">
            Effective Date: November 2026 · Last Updated: {lastUpdated}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Compliance Seal & Dual Role Overview */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Award size={26} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-gray-900">
                  NDPC Registered Data Processing Platform
                </h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Operating in strict compliance with the Nigeria Data Protection Act (NDPA) 2023.
                </p>
              </div>
            </div>
            <div className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-xs font-mono text-gray-700">
              NDPA 2023 / NDPC Regulated
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-brand-50/60 border border-brand-100 space-y-2">
              <div className="flex items-center gap-2 text-brand-900 font-semibold text-sm">
                <Building2 size={16} className="text-brand-700" />
                1. Subscribing Church: DATA CONTROLLER
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Your local church assembly or ministry parish is the <strong>Data Controller</strong>. The church decides what congregation records are gathered, conducts pastoral care and home visits, determines follow-up workflows, and assigns ministry duties.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-purple-50/60 border border-purple-100 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-sm">
                <Database size={16} className="text-purple-700" />
                2. ChurchOS / TMM: DATA PROCESSOR
              </div>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                <strong>ChurchOS</strong> (powered by The Mobile Missionary) is the <strong>Data Processor</strong>. We provide secure cloud infrastructure, encrypted databases, communication gateways, and software interfaces strictly on behalf and instruction of your church.
              </p>
            </div>
          </div>
        </section>

        {/* Section 1: Introduction */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">1</span>
            Statutory Framework & Commitment
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            The Mobile Missionary ("we", "us", or "our"), operating the ChurchOS platform, respects your fundamental right to privacy. We are committed to processing all personal and sensitive spiritual records in accordance with the <strong>Nigeria Data Protection Act (NDPA 2023)</strong> and guidelines issued by the <strong>Nigeria Data Protection Commission (NDPC)</strong>.
          </p>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            This Policy applies to all users of our digital platforms: church administrators, pastoral leaders, members, first-time visitors, fellowship leads, and any individual who interacts with our public intake links, member portals, check-in consoles, or mobile web applications.
          </p>
        </section>

        {/* Section 2: Categories of Data Collected */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">2</span>
            Categories of Personal & Spiritual Data Processed
          </h2>
          <p className="text-sm text-gray-600">
            Depending on your role and your interactions with the church, the following categories of data may be collected:
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-900">A. Identity & Contact Information</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Full name, gender, residential address, telephone number, WhatsApp contact, email address, date of birth, marital status, and profile photo.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-900">B. Spiritual & Discipleship Records</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Salvation decisions, water and Holy Ghost baptism records, church foundational school completion, assigned fellowship cell/zone, and service attendance dates.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-900">C. Pastoral Care & Confidential Requests</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Prayer requests, pastoral counseling records, welfare assistance applications, and praise testimonies submitted for church thanksgiving.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-900">D. Child Safeguarding & Family Demographics</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Spouse names, children count, children names and birthdates, allergies, and unique cryptographic security claim codes generated for safe check-in and pickup during church services.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-sm text-gray-900">E. Stewardship, Tithes & Giving Transactions</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Tithe, offering, and campaign contribution amounts, transaction references, and payment timestamps. Payment card details are never stored on ChurchOS servers; transactions are tokenized and processed via Central Bank of Nigeria (CBN) licensed and PCI-DSS certified payment processors (e.g. Paystack, Flutterwave).
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Lawful Bases for Processing */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">3</span>
            Lawful Bases for Processing (NDPA 2023)
          </h2>
          <p className="text-sm text-gray-600">
            In compliance with Section 25 and Section 26 of the NDPA 2023, data is collected and processed under the following lawful bases:
          </p>

          <ul className="space-y-3 pt-2 text-sm text-gray-700">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Explicit Consent:</strong> You give explicit consent when submitting your visitor card, onboarding form, prayer request, or checking the mandatory privacy consent box.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Legitimate Religious Interest:</strong> Processing is carried out in the course of legitimate church activities with appropriate safeguards, solely for fellowship, pastoral oversight, and spiritual integration of members and regular attendees.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Legal & Statutory Obligation:</strong> Maintaining verifiable financial accounting records, welfare disbursement logs, and child safeguarding standards required by statutory authorities.
              </div>
            </li>
          </ul>
        </section>

        {/* Section 4: Child Safeguarding */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">4</span>
            Children's Privacy & Safeguarding (NDPA Section 31)
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            The protection of children is paramount. We do not knowingly collect personal information directly from children under 13 without verifiable consent from a parent or legal guardian.
          </p>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <Lock size={15} /> Secure Child Check-In & Tag Verification
            </div>
            <p>
              When parents register their children for Sunday School or Children's Church, information is used strictly to produce real-time security claim tags, register medical or allergy notices, and ensure children are safely discharged only to authorized guardians presenting the matching pickup code.
            </p>
          </div>
        </section>

        {/* Section 5: Data Security & Storage */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">5</span>
            Technical & Organizational Security Measures
          </h2>
          <p className="text-sm text-gray-600">
            We employ modern cryptographic and organizational standards to safeguard church data:
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
              <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <Lock size={16} className="text-brand-600" />
                256-Bit TLS Encryption
              </div>
              <p className="text-xs text-gray-600">
                All data transmitted between your browser and our servers is encrypted using modern TLS 1.3 cryptographic protocols.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
              <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <Database size={16} className="text-brand-600" />
                Multi-Tenant Isolation
              </div>
              <p className="text-xs text-gray-600">
                Every church's database records are segregated with strict tenant isolation, preventing cross-organization access.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
              <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <Key size={16} className="text-brand-600" />
                Role-Based Access Control (RBAC)
              </div>
              <p className="text-xs text-gray-600">
                Staff and volunteers only see records required for their specific role (e.g., ushers see attendance, accountants see finances).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
              <div className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-600" />
                Automated Daily Backups
              </div>
              <p className="text-xs text-gray-600">
                Encrypted snapshots are created daily to guarantee business continuity, data redundancy, and disaster recovery.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: Data Subject Rights */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">6</span>
            Your Rights Under the Nigeria Data Protection Act
          </h2>
          <p className="text-sm text-gray-600">
            As a data subject, you hold statutory rights enforceable against the Data Controller and Data Processor:
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-2 text-sm">
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Access:</strong> Inspect and receive a copy of your personal records held in the database.
            </div>
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Rectification:</strong> Request correction or update of inaccurate or incomplete details.
            </div>
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Erasure:</strong> Request deletion ("Right to be Forgotten") of your records when no longer necessary.
            </div>
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Restrict Processing:</strong> Request suspension of data processing under contested conditions.
            </div>
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Data Portability:</strong> Obtain your digital records in a structured, commonly used machine-readable format.
            </div>
            <div className="p-3.5 rounded-lg border border-gray-100 bg-gray-50/40">
              <strong>Right to Withdraw Consent:</strong> Revoke previously granted consent for communications or follow-ups at any time.
            </div>
          </div>
        </section>

        {/* Section 7: DPO and Regulatory Contact */}
        <section className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm space-y-6">
          <h2 className="text-2xl font-display font-bold text-gray-900 flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 text-sm font-bold flex items-center justify-center">7</span>
            Data Protection Officer (DPO) & Regulatory Contact
          </h2>
          <p className="text-sm text-gray-600">
            If you have questions regarding this policy, wish to exercise any of your data rights, or want to make a privacy inquiry:
          </p>

          <div className="grid sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                ChurchOS Data Protection Office
              </h3>
              <p className="text-xs text-gray-600">
                The Mobile Missionary Data Governance & Compliance Team
              </p>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div><strong>Email:</strong> <a href="mailto:privacy@themobilemissionary.org" className="text-brand-600 hover:underline">privacy@themobilemissionary.org</a></div>
                <div><strong>Desk:</strong> <a href="mailto:dpo@themobilemissionary.org" className="text-brand-600 hover:underline">dpo@themobilemissionary.org</a></div>
                <div><strong>Helpline:</strong> +234 915 650 3692</div>
                <div><strong>Jurisdiction:</strong> Federal Republic of Nigeria</div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3">
              <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                Regulatory Authority (NDPC)
              </h3>
              <p className="text-xs text-gray-600">
                Nigeria Data Protection Commission (NDPC)
              </p>
              <div className="space-y-1.5 text-xs text-gray-700">
                <div><strong>Website:</strong> <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">https://ndpc.gov.ng</a></div>
                <div><strong>Complaints Desk:</strong> <a href="mailto:info@ndpc.gov.ng" className="text-brand-600 hover:underline">info@ndpc.gov.ng</a></div>
                <div><strong>Address:</strong> No. 12, Lake Chad Crescent, Maitama, Abuja, Nigeria</div>
              </div>
            </div>
          </div>
        </section>

        {/* Back to Home CTA */}
        <div className="pt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 shadow-md shadow-brand-600/20 transition-all hover:scale-[1.01]"
          >
            <ArrowLeft size={16} /> Return to ChurchOS Home
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} The Mobile Missionaries. All rights reserved.</p>
        <p className="mt-1 text-gray-400">Compliant with the Nigeria Data Protection Act (NDPA 2023) · Regulated by NDPC</p>
      </footer>
    </div>
  );
}
