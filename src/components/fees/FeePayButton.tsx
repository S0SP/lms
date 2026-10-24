'use client';

import React, { useState } from 'react';
import { CreditCard, PlusCircle } from 'lucide-react';
import CheckoutModal from '@/components/parent/modals/CheckoutModal';
import { useRouter } from 'next/navigation';

interface FeePayButtonProps {
  buttonText?: string;
  courseTitle?: string;
  courseId?: string;
  learnerId?: string;
  price?: string;
  amount?: number;
  credits?: number;
  purpose?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export default function FeePayButton({
  buttonText = 'Purchase Credits',
  courseTitle = 'Session Credits Top-up',
  courseId,
  learnerId,
  price = '₹5,000',
  amount = 5000,
  credits = 5,
  purpose = 'credit_topup',
  variant = 'primary',
  className = '',
}: FeePayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const baseStyles = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer';
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs',
    secondary: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200',
    outline: 'border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30',
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      >
        <PlusCircle className="w-3.5 h-3.5" />
        {buttonText}
      </button>

      <CheckoutModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        courseTitle={courseTitle}
        courseId={courseId}
        learnerId={learnerId}
        price={price}
        amount={amount}
        credits={credits}
        purpose={purpose}
      />
    </>
  );
}
