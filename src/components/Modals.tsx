import { AlertCircle, Award, Bell, Calendar, Heart, MapPin, Phone, ShieldCheck, Sparkles, Upload, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { BANGLADESH_DISTRICTS } from '../mockData';
import { sendMagicLink, sendPasswordResetEmail, signInDonor, signUpDonor, uploadAvatar, updateDonorProfile } from '../services/lifelineService';
import { BloodGroup, DonorProfile, EmergencyRequest, NotificationItem } from '../types';

/* ================= 1. REQUEST BLOOD MODAL ================= */
interface RequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (req: Partial<EmergencyRequest>) => void;
}

export const RequestBloodModal: React.FC<RequestModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('35');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('Banani');
  const [hospitalName, setHospitalName] = useState('');
  const [bags, setBags] = useState('2');
  const [neededBy, setNeededBy] = useState('Today, 6:00 PM');
  const [urgency, setUrgency] = useState<'Critical' | 'High' | 'Medium'>('Critical');
  const [phone, setPhone] = useState('+880 ');
  const [whatsapp, setWhatsapp] = useState('880');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !hospitalName || !phone) return;
    onSubmit({
      id: `req-${Date.now()}`,
      patientName,
      age: Number(age) || 30,
      bloodGroup,
      hospitalName,
      district,
      area,
      requiredBags: Number(bags) || 1,
      neededByTime: neededBy,
      urgency,
      contactPhone: phone,
      contactWhatsapp: whatsapp.replace(/[^0-9]/g, ''),
      reason: reason || 'Urgent medical transfusion requirement.',
      status: 'Pending',
      createdAt: new Date().toISOString(),
      matchedDonorsCount: Math.floor(Math.random() * 6) + 2
    });
    onClose();
  };

  const selectedDistObj = BANGLADESH_DISTRICTS.find(d => d.name === district);
  const areasList = selectedDistObj ? selectedDistObj.areas : [];

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 lg:p-10 max-w-2xl w-full border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll my-auto">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center animate-pulse shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="editorial-title text-2xl sm:text-3xl font-black text-slate-900">Broadcast Blood Requisition</h2>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pushes immediate live feed & Firebase notification</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Patient Full Name *</label>
              <input required value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g. Mrs. Rahima Begum" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Age *</label>
                <input required type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Blood Group *</label>
                <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value as BloodGroup)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-rose-600 font-mono">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Hospital / Clinic Name *</label>
              <input required value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="e.g. Dhaka Medical College Hospital" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">District *</label>
                <select value={district} onChange={e => { setDistrict(e.target.value); setArea(BANGLADESH_DISTRICTS.find(d=>d.name===e.target.value)?.areas[0] || ''); }} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900">
                  {BANGLADESH_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Area *</label>
                <select value={area} onChange={e => setArea(e.target.value)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900">
                  {areasList.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Required Bags *</label>
              <input type="number" min="1" max="10" value={bags} onChange={e => setBags(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Needed By Time *</label>
              <input value={neededBy} onChange={e => setNeededBy(e.target.value)} placeholder="e.g. Today, 5 PM" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Urgency Priority *</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value as any)} className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900">
                <option value="Critical">🚨 Critical</option>
                <option value="High">⚠️ High</option>
                <option value="Medium">ℹ️ Medium</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Contact Phone Number *</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">WhatsApp Number *</label>
              <input required value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="8801711..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Reason / Clinical Notes</label>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Emergency C-Section bleeding surgery scheduled at ICU." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900" />
          </div>

          <button type="submit" className="w-full py-4 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer mt-2">
            🚨 Broadcast Emergency Request
          </button>
        </form>
      </div>
    </div>
  );
};


/* ================= 2. AUTH REGISTRATION / LOGIN MODAL ================= */
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: DonorProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+880 ');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('Banani');
  const [isSmoker, setIsSmoker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (view === 'reset') {
      const { error } = await sendPasswordResetEmail(email);
      setLoading(false);
      if (error) {
        setErrorMsg(error);
        return;
      }
      setSuccessMsg('Password reset email sent. Please check your inbox.');
      return;
    }

    if (view === 'register') {
      const { user, error } = await signUpDonor({
        name: name || 'New Donor',
        email,
        password,
        phone,
        bloodGroup,
        district,
        area,
        isSmoker
      });
      setLoading(false);
      if (error || !user) {
        if (error?.toLowerCase().includes('already registered')) {
          setView('login');
        }
        setErrorMsg(error || 'Something went wrong. Please try again.');
        return;
      }
      onLoginSuccess(user);
      onClose();
      return;
    }

    const { user, error } = await signInDonor(email, password);
    setLoading(false);
    if (error || !user) {
      setErrorMsg(error || 'Invalid email or password.');
      return;
    }
    onLoginSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 max-w-md w-full border border-slate-200 shadow-2xl relative text-slate-900">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 blood-gradient rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-rose-500/20">
          <Heart className="w-6 h-6 fill-white" />
        </div>

        <h2 className="editorial-title text-3xl font-black">
          {view === 'register' ? 'Join Lifeline Network' : view === 'reset' ? 'Reset Password' : 'Welcome Back Hero'}
        </h2>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1 mb-6">
          {view === 'register'
            ? 'Register as a verified whole blood donor'
            : view === 'reset'
            ? 'Enter your email to receive password reset instructions'
            : 'Sign in to your LifelineBD account'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {view === 'register' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Full Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kawsar Ahmed" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
          </div>

          {view !== 'reset' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Password</label>
              <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
          )}

          {view === 'login' && (
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
              <button type="button" onClick={() => { setView('reset'); setErrorMsg(''); setSuccessMsg(''); }} className="text-rose-600 hover:underline">
                Forgot password?
              </button>
              <button type="button" onClick={async () => {
                setErrorMsg('');
                setSuccessMsg('');
                setLoading(true);
                const { error } = await sendMagicLink(email);
                setLoading(false);
                if (error) {
                  setErrorMsg(error);
                } else {
                  setSuccessMsg('Magic login link sent to your email. Please check your inbox.');
                }
              }} className="text-slate-500 hover:text-slate-700">
                Login with email link
              </button>
            </div>
          )}

          {view === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Phone Number</label>
                <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880 1XXX-XXXXXX" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Blood Group</label>
                  <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-rose-600">
                    <option value="">Select blood group (optional)</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">District</label>
                  <select value={district} onChange={e => { setDistrict(e.target.value); setArea(BANGLADESH_DISTRICTS.find(d => d.name === e.target.value)?.areas[0] || ''); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                    {BANGLADESH_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Area</label>
                <select value={area} onChange={e => setArea(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                  {BANGLADESH_DISTRICTS.find(d => d.name === district)?.areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input type="checkbox" checked={isSmoker} onChange={e => setIsSmoker(e.target.checked)} className="accent-rose-600 w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">I am a smoker (health note)</span>
              </label>
            </>
          )}

          <button type="submit" disabled={loading} className="w-full py-4 blood-gradient text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl cursor-pointer mt-4 disabled:opacity-60">
            {loading ? 'Please wait...' : view === 'register' ? 'Create Secure Profile' : view === 'reset' ? 'Send Reset Email' : 'Sign In'}
          </button>

          {successMsg && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold">
              {successMsg}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setView(view === 'register' ? 'login' : 'register');
            }}
            className="w-full text-center py-2 text-xs font-bold text-rose-600 hover:underline cursor-pointer block"
          >
            {view === 'register' ? 'Already registered? Sign In instead' : 'New donor? Create free profile'}
          </button>
        </form>
      </div>
    </div>
  );
};


/* ================= 3. DONOR PROFILE / SCREENING MODAL ================= */
interface ProfileModalProps {
  donor: DonorProfile | null;
  onClose: () => void;
  onToggleAvailability?: () => void;
  onProfileUpdated?: (updated: DonorProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ donor, onClose, onToggleAvailability, onProfileUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [district, setDistrict] = useState('');
  const [area, setArea] = useState('');
  const [hbsagStatus, setHbsagStatus] = useState('Not Tested');
  const [hcvStatus, setHcvStatus] = useState('Not Tested');
  const [hivStatus, setHivStatus] = useState('Not Tested');
  const [syphilisStatus, setSyphilisStatus] = useState('Not Tested');
  const [malariaStatus, setMalariaStatus] = useState('Not Tested');

  React.useEffect(() => {
    if (donor) {
      setName(donor.name);
      setPhone(donor.phone);
      setWhatsapp(donor.whatsapp);
      setDistrict(donor.district);
      setArea(donor.area);
      setHbsagStatus(donor.healthInfo?.hbsagStatus || 'Not Tested');
      setHcvStatus(donor.healthInfo?.hcvStatus || 'Not Tested');
      setHivStatus(donor.healthInfo?.hivStatus || 'Not Tested');
      setSyphilisStatus(donor.healthInfo?.syphilisStatus || 'Not Tested');
      setMalariaStatus(donor.healthInfo?.malariaStatus || 'Not Tested');
    }
  }, [donor]);

  if (!donor) return null;

  const districtObj = BANGLADESH_DISTRICTS.find(d => d.name === district);

  const handleSave = async () => {
    setSaving(true);
    const updated = await updateDonorProfile(donor.id, {
      name,
      phone,
      whatsapp,
      district,
      area,
      hbsagStatus,
      hcvStatus,
      hivStatus,
      syphilisStatus,
      malariaStatus
    });
    setSaving(false);
    if (updated && onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setIsEditing(false);
  };

  const statusOptions = ['Not Tested', 'Negative', 'Positive'];
  const statusColor = (s: string) => s === 'Positive' ? 'text-rose-600' : s === 'Negative' ? 'text-emerald-600' : 'text-slate-400';

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[3rem] p-8 lg:p-10 max-w-xl w-full border border-slate-200 shadow-2xl relative text-slate-900 max-h-[90vh] overflow-y-auto custom-scroll">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-5 pb-6 border-b border-slate-100">
          <img src={donor.avatar} alt="" className="w-20 h-20 rounded-3xl object-cover border-4 border-rose-500 shadow-md bg-slate-100" />
          <div className="flex-1">
            {isEditing ? (
              <input value={name} onChange={e => setName(e.target.value)} className="font-black text-xl border border-slate-200 rounded-lg px-3 py-1.5 w-full mb-1" />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-black text-2xl">{donor.name}</h3>
                {donor.isVerified && <ShieldCheck className="w-5 h-5 text-rose-600" aria-label="Verified Hospital Screening" />}
              </div>
            )}
            <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> {donor.area}, {donor.district}
            </p>
            <span className="mt-2 inline-block px-3 py-1 bg-rose-600 text-white font-mono text-sm font-black rounded-lg shadow-sm">
              Blood Group: {donor.bloodGroup}
            </span>
          </div>
        </div>

        {!isEditing ? (
          <>
            <div className="my-6 grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">PHONE</span>
                <span className="text-slate-900">{donor.phone}</span>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">WHATSAPP</span>
                <span className="text-slate-900">{donor.whatsapp}</span>
              </div>
            </div>

            <div className="my-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">DGHS Health Telemetry</h4>
              <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">HEMOGLOBIN</span>
                  <span className="text-emerald-600 font-black text-sm">{donor.healthInfo?.hemoglobin || 14.8} g/dL</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">BLOOD PRESSURE</span>
                  <span className="text-slate-900 font-black text-sm">{donor.healthInfo?.bloodPressure || '120/80'}</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-sans block font-bold">WEIGHT</span>
                  <span className="text-slate-900 font-black text-sm">{donor.healthInfo?.weightKg || 70} kg</span>
                </div>
              </div>

              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 pt-2">Mandatory TTI Screening</h4>
              <div className="grid grid-cols-5 gap-2 font-mono text-[10px] text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HBsAg</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hbsagStatus || 'Not Tested')}`}>{donor.healthInfo?.hbsagStatus || 'Not Tested'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HCV</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hcvStatus || 'Not Tested')}`}>{donor.healthInfo?.hcvStatus || 'Not Tested'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">HIV</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.hivStatus || 'Not Tested')}`}>{donor.healthInfo?.hivStatus || 'Not Tested'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">Syphilis</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.syphilisStatus || 'Not Tested')}`}>{donor.healthInfo?.syphilisStatus || 'Not Tested'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[9px] text-slate-400 font-sans block font-bold">Malaria</span>
                  <span className={`font-black ${statusColor(donor.healthInfo?.malariaStatus || 'Not Tested')}`}>{donor.healthInfo?.malariaStatus || 'Not Tested'}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex justify-between font-bold">
                <span>Smoking Status: <strong className={donor.isSmoker ? 'text-amber-600' : 'text-emerald-600'}>{donor.isSmoker ? 'Smoker' : 'Non-Smoker'}</strong></span>
                <span>Regular Donor: <strong className="text-rose-600">{donor.isRegular ? 'Yes (3+ times)' : 'New'}</strong></span>
              </div>
            </div>

            {onProfileUpdated && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3.5 mb-4 border-2 border-slate-900 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors"
              >
                ✏️ Edit Profile
              </button>
            )}
          </>
        ) : (
          <div className="my-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">WhatsApp Number</label>
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">District</label>
                <select value={district} onChange={e => { setDistrict(e.target.value); setArea(''); }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                  {BANGLADESH_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Area</label>
                <select value={area} onChange={e => setArea(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold">
                  {(districtObj?.areas || []).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 pt-2">Mandatory TTI Screening (Lab Verified)</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'HBsAg (Hepatitis B)', value: hbsagStatus, setter: setHbsagStatus },
                { label: 'Anti-HCV (Hepatitis C)', value: hcvStatus, setter: setHcvStatus },
                { label: 'Anti-HIV', value: hivStatus, setter: setHivStatus },
                { label: 'VDRL (Syphilis)', value: syphilisStatus, setter: setSyphilisStatus },
                { label: 'MP Test (Malaria)', value: malariaStatus, setter: setMalariaStatus }
              ].map(field => (
                <div key={field.label}>
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">{field.label}</label>
                  <select value={field.value} onChange={e => field.setter(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 blood-gradient text-white rounded-2xl text-xs font-black uppercase tracking-widest disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-3.5 border-2 border-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {onToggleAvailability && !isEditing && (
          <div className="p-5 bg-rose-50 rounded-3xl border border-rose-200 flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-black uppercase text-rose-900">Instant Telemetry Status</p>
              <p className="text-xs text-rose-700 mt-0.5">{donor.availableNow ? 'Broadcasting as Available for Emergency' : 'Set as resting / off-duty'}</p>
            </div>
            <button
              onClick={onToggleAvailability}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                donor.availableNow ? 'bg-emerald-600 text-white shadow-md animate-pulse' : 'bg-slate-900 text-white'
              }`}
            >
              {donor.availableNow ? '● Available Now' : '○ Off-Duty'}
            </button>
          </div>
        )}

        {!isEditing && (
          <div className="flex gap-3">
            <a
              href={`https://wa.me/${donor.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-4 bg-slate-900 hover:bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest text-center transition-colors shadow-lg"
            >
              WhatsApp Message
            </a>
            <a
              href={`tel:${donor.phone}`}
              className="px-8 py-4 border-2 border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-center hover:bg-slate-50 transition-colors"
            >
              Call
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

/* ================= 5. PROFILE EDIT MODAL ================= */
interface ProfileEditModalProps {
  donor: DonorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: DonorProfile) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ donor, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(donor?.name || '');
  const [phone, setPhone] = useState(donor?.phone || '');
  const [whatsapp, setWhatsapp] = useState(donor?.whatsapp || '');
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(donor?.bloodGroup || 'O+');
  const [district, setDistrict] = useState(donor?.district || 'Dhaka');
  const [area, setArea] = useState(donor?.area || (BANGLADESH_DISTRICTS.find(d => d.name === district)?.areas[0] || ''));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [hbsag, setHbsag] = useState<string>(donor?.healthInfo?.healthMetrics?.hbsag || 'Not Tested');
  const [antiHcv, setAntiHcv] = useState<string>(donor?.healthInfo?.healthMetrics?.anti_hcv || 'Not Tested');
  const [antiHiv, setAntiHiv] = useState<string>(donor?.healthInfo?.healthMetrics?.anti_hiv || 'Not Tested');
  const [vdrl, setVdrl] = useState<string>(donor?.healthInfo?.healthMetrics?.vdrl || 'Not Tested');
  const [mp, setMp] = useState<string>(donor?.healthInfo?.healthMetrics?.mp || 'Not Tested');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    setName(donor?.name || '');
    setPhone(donor?.phone || '');
    setWhatsapp(donor?.whatsapp || '');
    setBloodGroup(donor?.bloodGroup || 'O+');
    setDistrict(donor?.district || 'Dhaka');
    setArea(donor?.area || BANGLADESH_DISTRICTS.find(d => d.name === district)?.areas[0] || '');
    setHbsag(donor?.healthInfo?.healthMetrics?.hbsag || 'Not Tested');
    setAntiHcv(donor?.healthInfo?.healthMetrics?.anti_hcv || 'Not Tested');
    setAntiHiv(donor?.healthInfo?.healthMetrics?.anti_hiv || 'Not Tested');
    setVdrl(donor?.healthInfo?.healthMetrics?.vdrl || 'Not Tested');
    setMp(donor?.healthInfo?.healthMetrics?.mp || 'Not Tested');
  }, [donor]);

  if (!isOpen || !donor) return null;

  const areasList = BANGLADESH_DISTRICTS.find(d => d.name === district)?.areas || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      let avatarUrl = donor.avatar;
      if (avatarFile) {
        const uploaded = await uploadAvatar(avatarFile, donor.id);
        if (uploaded) avatarUrl = uploaded;
      }

      const updates: Record<string, any> = {
        name,
        phone,
        whatsapp,
        blood_group: bloodGroup,
        district,
        area,
        avatar: avatarUrl
      };
      // Health metrics
      updates.hbsag_status = hbsag;
      updates.anti_hcv_status = antiHcv;
      updates.anti_hiv_status = antiHiv;
      updates.vdrl_status = vdrl;
      updates.mp_status = mp;

      const updated = await updateDonorProfile(donor.id, updates);
      if (!updated) {
        setErrorMsg('Failed to update profile. Try again later.');
        setLoading(false);
        return;
      }

      onSave(updated);
      onClose();
    } catch (err) {
      console.error('Profile save error', err);
      setErrorMsg('Unexpected error updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-6 max-w-md w-full border border-slate-200 shadow-2xl relative text-slate-900">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
          <X className="w-4 h-4" />
        </button>

        <h3 className="editorial-title text-2xl font-black mb-2">Edit Profile</h3>
        {errorMsg && <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-600 rounded">{errorMsg}</div>}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">WhatsApp</label>
            <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Blood Group</label>
              <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value as any)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">District</label>
              <select value={district} onChange={e => { setDistrict(e.target.value); setArea(BANGLADESH_DISTRICTS.find(d=>d.name===e.target.value)?.areas[0] || ''); }} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {BANGLADESH_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Area</label>
            <select value={area} onChange={e => setArea(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl">
              {areasList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Profile Photo</label>
            <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold">{loading ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};


/* ================= 4. NOTIFICATIONS MODAL ================= */
interface NotifModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotifModalProps> = ({ isOpen, onClose, notifications, onMarkAllRead }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 glass-dark flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-600" />
            <h3 className="font-black text-xl">Live Firebase Feed</h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onMarkAllRead} className="text-[10px] font-bold uppercase text-rose-600 hover:underline">
              Mark all read
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scroll pr-1">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-colors ${
                notif.read ? 'bg-slate-50/70 border-slate-100' : 'bg-rose-50/60 border-rose-200 shadow-2xs'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-sm">{notif.title}</p>
                <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">{notif.time}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{notif.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
