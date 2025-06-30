'use client';

import { useEffect, useState } from 'react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import ChatWidget from '@/components/RealtimeChatSystem';


export default function TestCollaboratorsPage() {
  const { user, loading, tokenStatus, feedback } = useAuthGuard();

  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

 


  return (
    <div className="p-6 max-w-xl mx-auto">
        <div>
        <ChatWidget />
            </div>
     hello word
    </div>
  );
}
