import { useState, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useIsAdmin } from '../../hooks/useIsAdmin';
import AuthModal from '../AuthModal';
import LoadingSpinner from '../LoadingSpinner';

type Props = {
    children: ReactNode;
};

/**
 * Renders the admin UI only for a signed-in Supabase user whose
 * user_profiles.role is 'admin'. There is no shared password: the database
 * enforces admin-only writes with is_admin() RLS policies, and this gate just
 * keeps non-admins from loading the screens.
 */
export default function AdminGate({ children }: Props) {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: roleLoading } = useIsAdmin();
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    if (authLoading || roleLoading) return <LoadingSpinner />;
    if (user && isAdmin) return <>{children}</>;

    const message = user
        ? "This account doesn't have admin access. Sign in with an admin account to continue."
        : 'Sign in with your admin account to continue.';

    return (
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <section
                aria-labelledby="admin-gate-heading"
                className="bg-white rounded-xl shadow-lg p-6 md:p-8 w-full max-w-md border border-gray-200 text-center"
            >
                <h1 id="admin-gate-heading" className="text-2xl font-bold text-gray-900 mb-2">
                    Admin Access
                </h1>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex flex-col gap-3">
                    {!user && (
                        <button
                            type="button"
                            onClick={() => setIsAuthOpen(true)}
                            className="w-full bg-gray-900 hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 text-white py-3 rounded-lg font-semibold transition-colors"
                        >
                            Sign in
                        </button>
                    )}
                    <a href="/" className="text-sm text-gray-500 hover:text-gray-900 underline-offset-2 hover:underline">
                        Back to the store
                    </a>
                </div>
            </section>
            <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        </main>
    );
}
