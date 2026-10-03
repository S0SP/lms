'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, BookOpen, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { PhoneInputWithCountry } from '@/components/ui/PhoneInputWithCountry';
import { validateEmail, validatePhone } from '@/lib/validation';

export default function PublicConsultation() {
  const [step, setStep] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Parent Contact Details
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = [
    'Mathematics (IGCSE/A-Level)',
    'Physics (IGCSE/A-Level)',
    'Chemistry (IB DP)',
    'Computer Science & Coding',
    'English Literature',
    'Biology & Sciences',
  ];

  const times = ['09:00 AM', '10:30 AM', '01:00 PM', '03:30 PM', '05:00 PM', '06:30 PM'];

  const handleSubmitBooking = async () => {
    if (!parentName.trim()) {
      setError('Please provide your name');
      return;
    }

    const emailVal = validateEmail(email, { required: true });
    if (!emailVal.isValid) {
      setError(emailVal.error || 'Please enter a valid email address');
      return;
    }

    if (phone) {
      const phoneVal = validatePhone(phone);
      if (!phoneVal.isValid) {
        setError(phoneVal.error || 'Please enter a valid phone number');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      // Calculate datetime if date and time provided
      let slotAtIso: string | undefined = undefined;
      if (selectedDate && selectedTime) {
        // e.g. "2026-09-28" + "10:30 AM"
        const [timePart, modifier] = selectedTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
        
        const d = new Date(selectedDate);
        d.setHours(hours, minutes, 0, 0);
        slotAtIso = d.toISOString();
      }

      const res = await fetch('/api/v1/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: parentName.trim(),
          prospectEmail: email.trim(),
          prospectPhone: phone.trim() || undefined,
          notes: `Subject: ${selectedSubject || 'Not specified'}. Slot: ${selectedDate} ${selectedTime}`,
          slotAt: slotAtIso,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to submit consultation request');
      }

      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What subject are you interested in?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSubject(sub)}
            className={`p-4 text-left rounded-xl border-2 transition-all ${
              selectedSubject === sub
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            <BookOpen className={`w-6 h-6 mb-3 ${selectedSubject === sub ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="font-semibold">{sub}</div>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-6">
        <button
          disabled={!selectedSubject}
          onClick={() => setStep(2)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          Next Step <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Choose a Preferred Date & Time</h2>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Time</label>
          <div className="grid grid-cols-2 gap-3">
            {times.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`py-2 px-3 text-sm font-medium rounded-lg border text-center transition-colors ${
                  selectedTime === t
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161B26] text-gray-700 dark:text-gray-300 hover:border-blue-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={() => setStep(1)}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          disabled={!selectedDate || !selectedTime}
          onClick={() => setStep(3)}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          Next Step <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Contact Details</h2>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder="e.g. John Doe" 
              className="w-full px-4 py-3 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com" 
              className="w-full px-4 py-3 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
            />
          </div>
          <div>
            <PhoneInputWithCountry
              label="Phone / WhatsApp Number"
              value={phone}
              onChange={setPhone}
              placeholder="Enter phone or WhatsApp number"
            />
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-xl p-6 h-fit">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{selectedSubject}</span>
            </li>
            <li className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{selectedDate || 'Date not selected'}</span>
            </li>
            <li className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{selectedTime || 'Time not selected'}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          disabled={submitting}
          onClick={() => setStep(2)}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          disabled={submitting}
          onClick={handleSubmitBooking}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Confirming...' : 'Confirm Booking'}
          {!submitting && <CheckCircle className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-2">
        Thank you for booking a discovery call, <span className="font-semibold text-gray-900 dark:text-white">{parentName}</span>!
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
        We have logged your request for <span className="font-medium text-gray-700 dark:text-gray-300">{selectedSubject}</span> on <span className="font-medium text-gray-700 dark:text-gray-300">{selectedDate} ({selectedTime})</span>. Our academic counselor will reach out to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
      </p>
      <Link 
        href="/"
        className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors inline-block shadow-sm"
      >
        Return to Home
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0D1117] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">U</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">UnboundYou</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Book a Free Discovery Call</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Connect with our curriculum directors to discuss personalized 1-on-1 programs.</p>
        </div>

        {/* Wizard Container */}
        <div className="bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 sm:p-10">
          {/* Progress Indicator */}
          {step < 4 && (
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
              {['Subject', 'Schedule', 'Details'].map((name, idx) => (
                <div key={name} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    step > idx + 1
                      ? 'bg-blue-600 text-white'
                      : step === idx + 1
                      ? 'border-2 border-blue-600 text-blue-600'
                      : 'border-2 border-gray-300 dark:border-gray-700 text-gray-400'
                  }`}>
                    {step > idx + 1 ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm font-medium ${step === idx + 1 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500'}`}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
}
