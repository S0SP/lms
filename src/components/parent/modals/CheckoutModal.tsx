'use client';

import React, { useState } from 'react';
import { X, ShoppingCart, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  courseTitle?: string;
  courseId?: string;
  price?: string;
  amount?: number;
  credits?: number;
  purpose?: string;
  learnerId?: string;
}

export default function CheckoutModal({ 
  isOpen, 
  onClose,
  onSuccess,
  courseTitle = "Advanced Calculus & Mechanics",
  courseId,
  price = "₹24,000",
  amount,
  credits,
  purpose = "course_purchase",
  learnerId,
}: CheckoutModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cardName, setCardName] = useState('Parent Scholar');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('•••');

  if (!isOpen) return null;

  // Calculate numeric amount from price string if not explicitly passed
  const numericAmount = amount || (() => {
    const cleaned = price.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 24000;
  })();

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Create order
      const createRes = await fetch('/api/v1/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numericAmount,
          currency: 'INR',
          courseId,
          learnerId,
          purpose,
          credits,
        }),
      });

      const orderData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      const order = orderData.data;

      // 2. Process payment (live Razorpay or simulated fallback)
      if (typeof window !== 'undefined' && (window as any).Razorpay && !order.isSimulated) {
        const options = {
          key: order.keyId,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: 'UnboundYou LMS',
          description: courseTitle,
          order_id: order.orderId,
          handler: async (response: any) => {
            const verifyRes = await fetch('/api/v1/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                courseId,
                learnerId,
                credits,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok) {
              setSuccess(true);
              if (onSuccess) onSuccess();
              setTimeout(() => {
                onClose();
                setSuccess(false);
              }, 1800);
            } else {
              setError(verifyData.error || 'Payment signature verification failed');
            }
          },
          prefill: {
            name: session?.user?.name || cardName,
            email: session?.user?.email || 'parent@unboundyou.com',
          },
          theme: { color: '#2563EB' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        setLoading(false);
        return;
      }

      // Simulated payment confirmation (dev / test environment)
      const verifyRes = await fetch('/api/v1/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          paymentId: `pay_sim_${Date.now()}`,
          courseId,
          learnerId,
          credits,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1800);
    } catch (err: any) {
      console.error('[Checkout] Error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E2535] rounded-xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-500" />
            Secure Checkout
          </h2>
          <button 
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Payment confirmed! Credits / enrollment updated successfully.</span>
            </div>
          )}
          
          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{courseTitle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {credits ? `${credits} Session Credits Pack` : 'Full Course Access'}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{price}</span>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 mt-3 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{price}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</h3>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                Razorpay / Card Secure
              </span>
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cardholder Name</label>
              <input 
                type="text" 
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Card Number</label>
              <input 
                type="text" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4242 •••• •••• 4242"
                className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry Date</label>
                <input 
                  type="text" 
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">CVC</label>
                <input 
                  type="text" 
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  placeholder="123"
                  className="w-full px-3 py-2 bg-white dark:bg-[#161B26] border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-mono text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 shrink-0">
          <button 
            onClick={handlePay}
            disabled={loading || success}
            className="w-full py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing Payment...' : success ? 'Payment Successful' : `Pay ${price}`}
          </button>
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            256-bit encrypted checkout via Razorpay Gateway
          </div>
        </div>

      </div>
    </div>
  );
}
