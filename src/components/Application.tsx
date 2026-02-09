import { useState, useEffect, type FormEvent } from 'react';
import { Send, CheckCircle, Loader2, LogIn, FileSearch, Lock, Timer, Calendar } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { saveApplication, getSession, getAppFields, getApplicationStatus, getApplicationSchedule, formatScheduleDate, type UserAccount, type AppField, type ApplicationStatusType, type ApplicationSchedule } from '../lib/store';

interface Props {
  onLoginClick: () => void;
  onPortalClick: () => void;
}

export function Application({ onLoginClick, onPortalClick }: Props) {
  const [fields, setFields] = useState<AppField[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [user, setUser] = useState<UserAccount | null>(() => getSession());
  const [appStatus, setAppStatus] = useState<ApplicationStatusType>('open');
  const [schedule, setSchedule] = useState<ApplicationSchedule>({});
  const { ref, isInView } = useInView();

  useEffect(() => {
    setFields(getAppFields());
    setAppStatus(getApplicationStatus());
    setSchedule(getApplicationSchedule());
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate required fields
    const missing = fields
      .filter(f => f.enabled && f.required && !form[f.id]?.trim())
      .map(f => f.label);
      
    if (missing.length > 0) {
      alert(`Please fill in required fields: ${missing.join(', ')}`);
      return;
    }

    setStatus('submitting');
    setTimeout(() => {
      // Map form data to expected ApplicationEntry format for backward compatibility where possible
      // In a real generic system, ApplicationEntry would have a 'data' record field.
      // Here we map known IDs to specific fields and put the rest in notes or similar, 
      // but strictly for this task we'll just cast it as any to pass it to saveApplication 
      // which expects specific fields. 
      // To make it robust, we should probably update ApplicationEntry to handle dynamic data,
      // but for now let's map what we can.
      
      const appData: any = {
        userId: user.id,
        username: form['username'] || user.displayName, // Fallback
        age: form['age'] || 'N/A',
        timezone: form['timezone'] || 'N/A',
        why: form['why'] || 'N/A',
        experience: form['experience'] || 'N/A',
      };

      // Add other fields to the object so they are saved (even if not strictly typed in the interface yet)
      // The store's saveApplication might strip them if it strictly picks fields.
      // Let's check store.ts saveApplication... 
      // It takes Omit<ApplicationEntry, 'id' | 'status' | 'submittedAt'>.
      // ApplicationEntry has specific fields. 
      // To fully support custom fields, we'd need to add a generic 'customData' field to ApplicationEntry.
      // For this specific request "fully customizable", I should probably add that to store.ts too.
      // But let's append custom fields to the "notes" or "why" if they don't fit standard fields
      // to avoid breaking the type system too much in one go, OR update the type.
      
      // Actually, let's just append extra info to the 'experience' or 'why' field for now 
      // if they aren't standard, or just save them if the store allows it (JSON.stringify usually preserves extra props).
      // The Type definition in store.ts restricts it.
      
      // Let's try to map dynamically.
      Object.keys(form).forEach(key => {
        if (!['username', 'age', 'timezone', 'why', 'experience'].includes(key)) {
           // Append to experience for now as a catch-all if it's a custom field
           const fieldLabel = fields.find(f => f.id === key)?.label || key;
           appData.experience += `\n\n[${fieldLabel}]: ${form[key]}`;
        }
      });

      saveApplication(appData);
      setStatus('success');
    }, 1500);
  };

  const checkSession = () => {
    const session = getSession();
    setUser(session);
  };

  if (status === 'success') {
    return (
      <section id="apply" className="relative py-28 sm:py-36">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
        <div className="mx-auto max-w-2xl px-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 animate-fade-in-up">
            <CheckCircle size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-white animate-fade-in-up animation-delay-100">
            Application Submitted!
          </h2>
          <p className="mt-4 text-neutral-400 text-lg animate-fade-in-up animation-delay-200">
            Thank you for your interest in Dismine SMP. We'll review your application
            and update its status within 48 hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up animation-delay-300">
            <button
              onClick={onPortalClick}
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-neutral-950 bg-emerald-500 rounded-xl hover:bg-emerald-400 transition-all hover:shadow-lg hover:shadow-emerald-500/20"
            >
              <FileSearch size={14} />
              Track Application Status
            </button>
            <button
              onClick={() => {
                setStatus('idle');
                setForm({});
              }}
              className="px-6 py-3 text-sm text-neutral-400 border border-neutral-700 rounded-xl hover:bg-neutral-800 hover:text-white transition-all"
            >
              Submit Another
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="relative py-28 sm:py-36" onFocus={checkSession}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.04)_0%,_transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl px-6" ref={ref}>
        {/* Section Header */}
        <div className={`text-center transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-emerald-500 text-xs font-semibold tracking-widest uppercase">
            Apply
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Ready to join?
          </h2>
          <p className="mt-4 text-neutral-400 text-lg leading-relaxed max-w-lg mx-auto">
            Fill out the application below. We read every submission carefully and respond within 48 hours.
          </p>
        </div>

        {appStatus === 'closed' ? (
          <div className="mt-12 p-8 rounded-2xl bg-red-500/5 border border-red-500/10 text-center">
             <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
              <Lock size={22} className="text-red-500" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Applications Closed</h3>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto">
              We are currently not accepting new members. Please check back later or join our Discord for updates.
            </p>
          </div>
        ) : appStatus === 'coming_soon' ? (
          <div className="mt-12 p-8 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
             <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
              <Calendar size={22} className="text-amber-500" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">Applications Coming Soon</h3>
            <p className="text-neutral-500 text-sm max-w-sm mx-auto">
              {schedule.openDate ? (
                <>Applications will open on <span className="text-amber-400 font-medium">{formatScheduleDate(schedule.openDate)}</span>.</>
              ) : (
                "Applications for the next season will open shortly. Join our Discord to be notified when they go live."
              )}
            </p>
          </div>
        ) : (
          <>
            {appStatus === 'ending_soon' && (
              <div className="mt-8 mb-8 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center gap-4 animate-pulse-glow">
                <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                  <Timer size={20} className="text-orange-500" />
                </div>
                <div>
                  <h4 className="text-orange-200 font-medium text-sm">Hurry! Applications Closing Soon</h4>
                  <p className="text-orange-300/60 text-xs mt-0.5">We are finalizing our player list for the season.</p>
                </div>
              </div>
            )}
            {/* Not logged in */}
            {!user && (
              <div className={`mt-12 p-8 rounded-2xl bg-neutral-900/50 border border-neutral-800/50 text-center transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                  <LogIn size={22} className="text-emerald-500" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Sign in to apply</h3>
                <p className="text-neutral-500 text-sm max-w-sm mx-auto mb-6">
                  Create an account or sign in with Discord to submit your application. This lets you track your application status in real-time.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={onLoginClick}
                    className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#5865F2] rounded-xl hover:bg-[#4752C4] transition-all w-full sm:w-auto"
                  >
                    Continue with Discord
                  </button>
                  <button
                    onClick={onLoginClick}
                    className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-neutral-300 bg-neutral-800/50 border border-neutral-700/50 rounded-xl hover:bg-neutral-800 transition-all w-full sm:w-auto"
                  >
                    <LogIn size={14} />
                    Sign in with Email
                  </button>
                </div>
              </div>
            )}

            {/* Logged in — show form */}
            {user && (
              <>
                <div className={`mt-8 flex items-center justify-center gap-3 transition-all duration-700 ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '150ms' }}>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-medium">
                      Signed in as {user.displayName}
                    </span>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className={`mt-8 space-y-5 transition-all duration-700 ${
                    isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: '200ms' }}
                >
                  {fields.filter(f => f.enabled).map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className="block text-sm font-medium text-neutral-300 mb-2">
                        {field.label} {field.required && <span className="text-emerald-500">*</span>}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          id={field.id}
                          name={field.id}
                          value={form[field.id] || ''}
                          onChange={handleChange}
                          required={field.required}
                          rows={4}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 text-sm text-white bg-neutral-900/80 border border-neutral-800 rounded-xl placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={field.id}
                          name={field.id}
                          value={form[field.id] || ''}
                          onChange={handleChange}
                          required={field.required}
                          className="w-full px-4 py-3 text-sm text-white bg-neutral-900/80 border border-neutral-800 rounded-xl focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none"
                        >
                          <option value="" disabled className="text-neutral-600">Select {field.label}</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          id={field.id}
                          name={field.id}
                          value={form[field.id] || ''}
                          onChange={handleChange}
                          required={field.required}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 text-sm text-white bg-neutral-900/80 border border-neutral-800 rounded-xl placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-neutral-950 bg-emerald-500 rounded-xl hover:bg-emerald-400 transition-all hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <Send size={14} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-neutral-600 mt-4">
                    By submitting, you agree to follow our community guidelines and rules.
                  </p>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
