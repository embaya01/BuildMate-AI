'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  console.log('[v0] Home page render - loading:', loading, 'user:', !!user);

  useEffect(() => {
    console.log('[v0] Home useEffect - loading:', loading, 'user:', !!user);
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    console.log('[v0] Home: showing loading spinner');
    return (
      <div className="fullscreen-state">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (user) {
    console.log('[v0] Home: user logged in, returning null while redirecting');
    return null;
  }

  console.log('[v0] Home: rendering LandingPage');
  return <LandingPage />;
}
