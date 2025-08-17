// components/ClientAuthWrapper.tsx - Handle auth on client side
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

  useEffect(() => {
    // Add a small delay to ensure session is properly loaded
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status === "loading" || isChecking) {
      return; // Still loading
    }

    console.log("🔍 ClientAuthWrapper check:", {
      requireAuth,
      requireAdmin,
      status,
      hasSession: !!session,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    });

    if (requireAuth && status === "unauthenticated") {
      console.log("❌ Auth required but user not authenticated");
      const currentPath = window.location.pathname;
      router.replace(`${redirectTo}?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (requireAdmin && (!session || session.user?.role !== 'ADMIN')) {
      console.log("❌ Admin required but user not admin");
      router.replace("/auth/signin");
      return;
    }

    if (requireAuth && !session?.user?.email) {
      console.log("❌ Session exists but missing user email");
      router.replace(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    console.log("✅ Auth check passed");
  }, [status, session, requireAuth, requireAdmin, isChecking, router, redirectTo]);

  // Show loading while checking
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

  // Show loading if redirecting
  if (requireAuth && status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Show loading if admin required but not admin
  if (requireAdmin && (!session || session.user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show content if auth check passes
  return <>{children}</>;
}