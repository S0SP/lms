'use client';

import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';

interface BookConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookConsultationModal({ isOpen, onClose }: BookConsultationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E2535] rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Book a Trial / Consultation
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Child</label>
            <CustomSelect
              value="aarav"
              onChange={() => {}}
              options={[
                { value: 'aarav', label: 'Aarav M.' },
                { value: 'isha', label: 'Isha M.' },
              ]}
              placeholder="Select child"
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject / Educator</label>
            <CustomSelect
              value="igcse-maths"
              onChange={() => {}}
              options={[
                { value: 'igcse-maths', label: 'IGCSE Maths - Dr. Jenkins' },
                { value: 'alevel-physics', label: 'A-Level Physics - Prof. Alan' },
                { value: 'ib-chemistry', label: 'IB Chemistry - Dr. Carter' },
              ]}
              placeholder="Select subject / educator"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Time</label>
              <CustomSelect
                value="09:00"
                onChange={() => {}}
                options={[
                  { value: '09:00', label: '09:00 AM' },
                  { value: '10:00', label: '10:00 AM' },
                  { value: '11:30', label: '11:30 AM' },
                  { value: '14:00', label: '02:00 PM' },
                ]}
                placeholder="Select time"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes (Optional)</label>
            <textarea 
              rows={3}
              placeholder="Any specific topics you'd like to discuss?"
              className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm">
            Book Consultation
          </button>
        </div>

      </div>
    </div>
  );
}
