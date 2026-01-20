
import React, { useState } from 'react';
import { Volunteer } from '../types';
import { VOLUNTEERS } from '../constants';

interface Props {
  onLogin: (volunteer: Volunteer) => void;
  onCancel: () => void;
}

const Login: React.FC<Props> = ({ onLogin, onCancel }) => {
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleProfileSelect = (v: Volunteer) => {
    setSelectedVolunteer(v);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVolunteer && password === selectedVolunteer.password) {
      onLogin(selectedVolunteer);
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleBackToProfiles = () => {
    setSelectedVolunteer(null);
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
      
      {/* Top Back Button - Only visible on selection screen */}
      {!selectedVolunteer && (
        <button 
          onClick={onCancel}
          className="absolute top-8 left-6 md:left-12 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors group z-10"
        >
          <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Scoreboard
        </button>
      )}

      <div className="max-w-md w-full py-12 relative z-10">
        {!selectedVolunteer ? (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl ring-4 ring-indigo-50">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Volunteer Login</h1>
              <p className="text-slate-500 mt-2 font-medium">Select your profile to manage the workshop</p>
            </div>

            <div className="space-y-3">
              {VOLUNTEERS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleProfileSelect(v)}
                  className="w-full bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:translate-x-1 transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <span className="text-lg font-black">{v.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-indigo-600">{v.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{v.role}</p>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-indigo-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}

              <button
                onClick={onCancel}
                className="w-full mt-8 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-in zoom-in-95 fade-in duration-300">
            <button 
              onClick={handleBackToProfiles}
              className="mb-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-all group"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Not {selectedVolunteer.name}?
            </button>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-black text-2xl shadow-inner">
                  {selectedVolunteer.name[0]}
                </div>
                <h2 className="text-2xl font-black text-slate-900">{selectedVolunteer.name}</h2>
                <p className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">{selectedVolunteer.role}</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enter Secret Password</label>
                  <div className="relative">
                    <input
                      autoFocus
                      type={showPassword ? "text" : "password"}
                      className={`w-full px-6 py-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold transition-all text-center tracking-[0.5em] text-lg ${
                        error ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-100 focus:border-indigo-300'
                      }`}
                      placeholder="••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.882 9.882L9.75 9.75M13.125 13.125l.125.125m9.938-9.938l-20.312 20.312" /></svg>
                      )}
                    </button>
                  </div>
                  {error && (
                    <p className="text-[10px] font-bold text-red-500 text-center animate-bounce">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!password}
                  className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all transform active:scale-95 ${
                    password 
                      ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  Verify & Enter
                </button>
              </form>
            </div>
          </div>
        )}
        
        <p className="text-center text-slate-300 text-[10px] mt-12 font-black uppercase tracking-[0.3em]">
          Sawan Kirpal Ruhani Mission
        </p>
      </div>
    </div>
  );
};

export default Login;
