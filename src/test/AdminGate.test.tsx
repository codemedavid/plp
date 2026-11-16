import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const authState = { user: null as { id: string } | null, loading: false };
const adminState = { isAdmin: false, loading: false };

vi.mock('../hooks/useAuth', () => ({ useAuth: () => authState }));
vi.mock('../hooks/useIsAdmin', () => ({ useIsAdmin: () => adminState }));
vi.mock('../components/AuthModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="Sign in" /> : null),
}));

import AdminGate from '../components/admin/AdminGate';

const renderGate = () =>
    render(
        <AdminGate>
            <p>Secret admin dashboard</p>
        </AdminGate>,
    );

beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    adminState.isAdmin = false;
    adminState.loading = false;
});

describe('AdminGate', () => {
    it('keeps the dashboard hidden while the role check is running', () => {
        adminState.loading = true;
        renderGate();
        expect(screen.queryByText('Secret admin dashboard')).not.toBeInTheDocument();
    });

    it('asks a signed-out visitor to sign in with their account, not a shared password', async () => {
        const user = userEvent.setup();
        renderGate();
        expect(screen.queryByText('Secret admin dashboard')).not.toBeInTheDocument();
        expect(screen.queryByPlaceholderText(/admin password/i)).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /sign in/i }));
        expect(screen.getByRole('dialog', { name: /sign in/i })).toBeInTheDocument();
    });

    it('blocks a signed-in customer without the admin role', () => {
        authState.user = { id: 'customer-1' };
        renderGate();
        expect(screen.getByText(/doesn.t have admin access/i)).toBeInTheDocument();
        expect(screen.queryByText('Secret admin dashboard')).not.toBeInTheDocument();
    });

    it('renders the dashboard for a signed-in admin', () => {
        authState.user = { id: 'admin-1' };
        adminState.isAdmin = true;
        renderGate();
        expect(screen.getByText('Secret admin dashboard')).toBeInTheDocument();
    });
});

describe('AdminDashboard has no client-side shared password', () => {
    const source = readFileSync(resolve(__dirname, '../components/AdminDashboard.tsx'), 'utf8');

    it('does not compare against a hard-coded password', () => {
        expect(source).not.toMatch(/password\s*===\s*['"`]/);
    });

    it('does not trust a localStorage flag for admin access', () => {
        expect(source).not.toContain('peptide_admin_auth');
    });

    it('is wrapped in the role-based AdminGate', () => {
        expect(source).toContain('<AdminGate>');
    });
});
