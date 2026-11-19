import React from 'react';
import { X, ExternalLink, GraduationCap, MapPin, Mail, Phone, BookOpen, ShieldCheck, Award } from 'lucide-react';
import { CrestLogo } from './Icons';

export const CollegeWebsiteModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Navbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0d2346] text-white">
          <div className="flex items-center gap-3">
            <CrestLogo size={36} />
            <div>
              <h2 className="text-base font-bold tracking-tight">Northbridge College</h2>
              <p className="text-[11px] text-blue-200">of Arts, Science and Technology • Established Academic Excellence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 relative overflow-hidden">
          <div className="max-w-xl z-10 relative">
            <span className="text-[11px] uppercase tracking-wider font-semibold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full inline-block mb-2">
              Official Portal
            </span>
            <h1 className="text-2xl font-bold mb-2">Welcome to Northbridge College</h1>
            <p className="text-xs text-blue-100 leading-relaxed mb-4">
              Committed to holistic learning, academic integrity, and student development across Arts, Science, and Advanced Technology disciplines.
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-300">
                <ShieldCheck size={14} /> NAAC A++ Grade
              </span>
              <span className="flex items-center gap-1 text-amber-300">
                <Award size={14} /> Autonomous Institution
              </span>
            </div>
          </div>
        </div>

        {/* Website Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-xl font-bold text-blue-900">18+</span>
              <span className="text-[11px] text-gray-500">Official Policies</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-xl font-bold text-blue-900">45+</span>
              <span className="text-[11px] text-gray-500">Degree Programmes</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-xl font-bold text-blue-900">100%</span>
              <span className="text-[11px] text-gray-500">Merit Admissions</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="block text-xl font-bold text-blue-900">24x7</span>
              <span className="text-[11px] text-gray-500">Anti-Ragging Helpline</span>
            </div>
          </div>

          {/* Policy Highlights */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-700" />
              Institutional Policy Handbook (Effective 1 January 2027)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">3. Attendance Policy</h4>
                <p className="text-[11px] text-gray-600">Minimum 75% required per course. Medical condonation considered between 65% and 74.9%.</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">4. Exam & Assessment</h4>
                <p className="text-[11px] text-gray-600">40% continuous internal evaluation + 60% end-semester exam. 50% overall pass mark.</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">9. Fees & Scholarships</h4>
                <p className="text-[11px] text-gray-600">Merit scholarships up to 50% waiver for top 5% students with CGPA 8.0+. Standard refund slabs.</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">10. Library Policy</h4>
                <p className="text-[11px] text-gray-600">Open 8:30 AM to 8:00 PM weekdays. UG: 4 books for 14 days, PG: 6 books for 21 days.</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">12. Hostel Policy</h4>
                <p className="text-[11px] text-gray-600">In-time rules: 8:30 PM (women's), 9:30 PM (men's). High-wattage heating appliances prohibited.</p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-1">17. Grievance Redressal</h4>
                <p className="text-[11px] text-gray-600">4-tier redressal system with strict resolution time limits (5-15 working days).</p>
              </div>
            </div>
          </div>

          {/* Contact Directory */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">College Directory & Helpdesks</h3>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div><strong>Principal's Office:</strong> principal@northbridgecollege.example</div>
              <div><strong>Admissions:</strong> admissions@northbridgecollege.example</div>
              <div><strong>Grievance Redressal:</strong> grievance@northbridgecollege.example</div>
              <div><strong>Data Protection Officer:</strong> dpo@northbridgecollege.example</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>© 2027 Northbridge College of Arts, Science and Technology. All rights reserved.</span>
          <button onClick={onClose} className="px-4 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
            Return to Policy Assistant
          </button>
        </div>
      </div>
    </div>
  );
};
