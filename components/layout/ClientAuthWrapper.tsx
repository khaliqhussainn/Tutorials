// components/ClientAuthWrapper.tsx - FIXED VERSION
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ClientAuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ClientAuthWrapper({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  redirectTo = "/auth/signin"
}: ClientAuthWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Small delay to ensure session is properly loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't do anything while still loading or checking
    if (status === "loading" || isChecking || hasRedirected) {
      return;
    }

    console.log("🔍 ClientAuthWrapper check:", {
      requireAuth,
      requireAdmin,
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role,
      pathname: window.location.pathname
    });

    // Check if authentication is required but user is not authenticated
    if (requireAuth && status === "unauthenticated") {
      console.log("❌ Auth required but user not authenticated");
      setHasRedirected(true);
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Check if admin is required but user is not admin
    if (requireAdmin && session && session.user?.role !== 'ADMIN') {
      console.log("❌ Admin required but user not admin:", session.user?.role);
      setHasRedirected(true);
      router.replace("/auth/signin?error=insufficient_permissions");
      return;
    }

    // Check if auth is required but session is missing user data
    if (requireAuth && status === "authenticated" && (!session?.user?.id || !session?.user?.email)) {
      console.log("❌ Session missing user data");
      setHasRedirected(true);
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}&error=session_invalid`);
      return;
    }

    console.log("✅ Auth check passed");
  }, [status, session, requireAuth, requireAdmin, isChecking, hasRedirected, router, redirectTo]);

  // Show loading while checking auth
  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading if redirecting due to auth failure
  if (hasRedirected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Check final auth state before rendering children
  if (requireAuth && status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Check admin permissions
  if (requireAdmin && (!session || session.user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}