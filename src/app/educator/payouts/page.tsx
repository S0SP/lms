'use client';

import React, { useState, useEffect } from 'react';
import { Book, Users, Wallet, Download, ChevronDown, Loader2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#131b2d',
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: '#727785',
      },
      grid: {
        color: 'rgba(193, 198, 214, 0.3)',
      },
    },
    x: {
      ticks: {
        color: '#727785',
      },
      grid: {
        display: false,
      },
    },
  },
};

interface PayoutRecord {
  id: string;
  month: number;
  year: number;
  totalSessions: number;
  totalAmount: string;
  status: string;
  paidAt?: string | null;
  educatorName: string;
}

export default function EducatorPayouts() {
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts'>('overview');
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [payoutsRes, dashRes] = await Promise.all([
          fetch('/api/v1/payouts'),
          fetch('/api/v1/educator/dashboard'),
        ]);

        if (payoutsRes.ok) {
          const json = await payoutsRes.json();
          setPayouts(json.data || []);
        }

        if (dashRes.ok) {
          const dashJson = await dashRes.json();
          setDashboardData(dashJson.data || null);
        }
      } catch (err) {
        console.error('Failed to load payouts data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);

  const totalPending = payouts
    .filter((p) => p.status === 'generated' || p.status === 'approved')
    .reduce((sum, p) => sum + parseFloat(p.totalAmount || '0'), 0);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Prepare chart dataset from real payouts or fallback
  const chartLabels = payouts.length > 0
    ? payouts.slice(0, 6).map((p) => `${months[p.month - 1]} ${p.year}`)
    : ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

  const chartValues = payouts.length > 0
    ? payouts.slice(0, 6).map((p) => p.totalSessions)
    : [12, 18, 14, 20, 22, 19];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Sessions',
        data: chartValues,
        backgroundColor: 'rgba(47, 128, 249, 0.2)',
        hoverBackgroundColor: '#2F80F9',
        borderColor: '#2F80F9',
        borderWidth: 1,
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
        barPercentage: 0.5,
        categoryPercentage: 0.8,
      },
    ],
  };

  return (
    <div className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto p-4 md:p-8 bg-[#faf8ff] dark:bg-[#080D16]">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* Page Header & Tabs */}
        <div>
          <h1 className="text-[28px] leading-[36px] tracking-[-0.02em] font-bold text-[#131b2d] dark:text-gray-100 mb-6">
            Earnings & Payouts
          </h1>
          <div className="flex items-center gap-6 border-b border-gray-200 dark:border-gray-800 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>Overview</span>
              {activeTab === 'overview' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`pb-2.5 text-sm font-semibold flex items-center gap-2 relative transition-colors cursor-pointer ${
                activeTab === 'payouts'
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>Payout Statements</span>
              {activeTab === 'payouts' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Stat Card 1 */}
              <div className="bg-white dark:bg-[#161B26] rounded-[12px] p-6 border border-[#c1c6d6] dark:border-gray-800 shadow-sm flex flex-col justify-between h-32">
                <div className="flex items-center gap-3 text-[#414754] dark:text-gray-400">
                  <Book className="w-5 h-5" />
                  <span className="text-[14px]">Active Learners</span>
                </div>
                <div className="text-[28px] font-bold text-[#131b2d] dark:text-gray-100">
                  {dashboardData?.activeLearnersCount ?? 0}
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white dark:bg-[#161B26] rounded-[12px] p-6 border border-[#c1c6d6] dark:border-gray-800 shadow-sm flex flex-col justify-between h-32">
                <div className="flex items-center gap-3 text-[#414754] dark:text-gray-400">
                  <Users className="w-5 h-5" />
                  <span className="text-[14px]">In Review / Pending</span>
                </div>
                <div className="text-[28px] font-bold text-amber-600 dark:text-amber-400">
                  ₹{totalPending.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white dark:bg-[#161B26] rounded-[12px] p-6 border border-[#c1c6d6] dark:border-gray-800 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden">
                <div className="flex items-center gap-3 text-[#414754] dark:text-gray-400 z-10">
                  <Wallet className="w-5 h-5" />
                  <span className="text-[14px]">Total Paid (INR)</span>
                </div>
                <div className="text-[28px] font-bold text-[#2F80F9] dark:text-blue-400 z-10">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white dark:bg-[#161B26] rounded-[12px] p-6 border border-[#c1c6d6] dark:border-gray-800 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[18px] font-bold text-[#131b2d] dark:text-gray-100">
                  Teaching Activity
                </h2>
              </div>
              <div className="h-[280px] w-full relative">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white dark:bg-[#161B26] rounded-[12px] border border-[#c1c6d6] dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#c1c6d6] dark:border-gray-800 flex justify-between items-center bg-[#faf8ff] dark:bg-gray-800/30">
                <h2 className="text-[18px] font-bold text-[#131b2d] dark:text-gray-100">
                  Monthly Payout Records
                </h2>
                <button
                  onClick={() => alert('Exporting monthly statement...')}
                  className="text-[#2F80F9] font-semibold text-[12px] flex items-center gap-1 hover:bg-[#2F80F9]/10 px-3 py-2 rounded-[8px] transition-colors"
                >
                  <Download className="w-[18px] h-[18px]" /> Export
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f2f3ff] dark:bg-gray-800/50 border-b border-[#c1c6d6] dark:border-gray-800 text-[12px] uppercase text-[#414754] dark:text-gray-400 font-semibold">
                      <th className="px-6 py-4">Period</th>
                      <th className="px-6 py-4">Sessions Delivered</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c1c6d6] dark:divide-gray-800 bg-white dark:bg-[#161B26] text-sm">
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-gray-400">
                          No payout statements generated yet for this period.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-[#f2f3ff]/50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-6 py-4 font-semibold text-[#131b2d] dark:text-gray-100">
                            {months[row.month - 1]} {row.year}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                            {row.totalSessions} sessions
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                                row.status === 'paid'
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                            ₹{parseFloat(row.totalAmount).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
