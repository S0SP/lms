'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';
import { CustomSelect, SelectOption } from '@/components/ui/CustomSelect';

const FILTER_OPTIONS: SelectOption<string>[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Needs resolution' },
  { value: 'resolved', label: 'Resolved' },
];

export function ConflictFilter({ currentState }: { currentState: string }) {
  const router = useRouter();

  const activeValue = currentState === 'open' ? 'open' : currentState === 'resolved' ? 'resolved' : 'all';

  const handleChange = (val: string) => {
    if (val === 'all' || !val) {
      router.push('/educator/conflicts');
    } else {
      router.push(`/educator/conflicts?state=${val}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-[#64748B] dark:text-gray-400 shrink-0" />
      <div className="w-48">
        <CustomSelect
          value={activeValue}
          onChange={handleChange}
          options={FILTER_OPTIONS}
          size="sm"
        />
      </div>
    </div>
  );
}
