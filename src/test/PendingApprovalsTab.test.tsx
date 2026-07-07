import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

type Response = { data?: unknown; error?: unknown };

let responsesByTable: Map<string, Response[]>;
const rpcMock = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<Response>>();

function buildChain(table: string) {
  const respList = responsesByTable.get(table) ?? [];
  const resp: Response = respList.shift() ?? { data: null, error: null };
  const promise: Promise<Response> = Promise.resolve(resp);
  const handler: ProxyHandler<object> = {
    get(_t, prop: string | symbol) {
      if (prop === 'then') return promise.then.bind(promise);
      if (prop === 'catch') return promise.catch.bind(promise);
      if (prop === 'finally') return promise.finally.bind(promise);
      return () => chain;
    },
  };
  const chain: unknown = new Proxy({}, handler);
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => buildChain(table),
    rpc: (fn: string, args: Record<string, unknown>) => rpcMock(fn, args),
  },
}));

import PendingApprovalsTab from '../components/PendingApprovalsTab';

const profiles = [
  { id: 'u-1', full_name: 'Jane Doe', nickname: 'Janey', referral_code: 'ALPHA', email: 'jane@example.com', frozen: false },
  { id: 'u-2', full_name: 'Bob Smith', nickname: null, referral_code: 'BETA', email: 'bob@example.com', frozen: true },
];

const pendingRows = [
  { id: 'l-1', user_id: 'u-1', delta: 500, reason: 'referral_l1', period_month: '2026-06-01', notes: null, created_at: '2026-06-15T00:00:00Z' },
  { id: 'l-2', user_id: 'u-1', delta: 150, reason: 'referral_l2', period_month: '2026-06-01', notes: null, created_at: '2026-06-16T00:00:00Z' },
  { id: 'l-3', user_id: 'u-2', delta: 300, reason: 'referral_l1', period_month: '2026-06-01', notes: null, created_at: '2026-06-17T00:00:00Z' },
];

function seed(rows: unknown[], profs: unknown[]) {
  responsesByTable.set('points_ledger', [{ data: rows, error: null }]);
  responsesByTable.set('user_profiles', [{ data: profs, error: null }]);
}

beforeEach(() => {
  responsesByTable = new Map();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: 2, error: null });
});

describe('PendingApprovalsTab', () => {
  it('shows a loading state initially', () => {
    seed([], []);
    render(<PendingApprovalsTab />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('renders one row per user with their pending total after load', async () => {
    seed(pendingRows, profiles);
    render(<PendingApprovalsTab />);
    await waitFor(() => expect(screen.queryByText(/Loading/)).not.toBeInTheDocument());
    expect(screen.getByText('Janey')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    // Jane's pending total = 650, Bob's = 300
    expect(screen.getByText('₱650')).toBeInTheDocument();
    expect(screen.getByText('₱300')).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing pending', async () => {
    seed([], profiles);
    render(<PendingApprovalsTab />);
    expect(await screen.findByText(/No pending points/i)).toBeInTheDocument();
  });

  it('flags frozen users', async () => {
    seed(pendingRows, profiles);
    render(<PendingApprovalsTab />);
    await screen.findByText('Bob Smith');
    const bobRow = screen.getByText('Bob Smith').closest('tr') ?? screen.getByText('Bob Smith').closest('[data-testid="pending-user"]');
    expect(bobRow!.textContent).toMatch(/frozen/i);
  });

  it('approving a user calls the RPC with their id and removes them from the queue', async () => {
    const user = userEvent.setup();
    seed(pendingRows, profiles);
    render(<PendingApprovalsTab />);
    await screen.findByText('Janey');

    const janeRow = screen.getByText('Janey').closest('tr') ?? screen.getByText('Janey').closest('[data-testid="pending-user"]');
    const approveBtn = janeRow!.querySelector('button')!;
    await user.click(approveBtn);

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('admin_approve_pending_points', { p_user_id: 'u-1' })
    );
    await waitFor(() => expect(screen.queryByText('Janey')).not.toBeInTheDocument());
    // Bob is untouched
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('surfaces an error and keeps the user when the RPC fails', async () => {
    const user = userEvent.setup();
    rpcMock.mockResolvedValue({ data: null, error: { message: 'not authorized' } });
    seed(pendingRows, profiles);
    render(<PendingApprovalsTab />);
    await screen.findByText('Janey');

    const janeRow = screen.getByText('Janey').closest('tr') ?? screen.getByText('Janey').closest('[data-testid="pending-user"]');
    await user.click(janeRow!.querySelector('button')!);

    expect(await screen.findByText(/not authorized/i)).toBeInTheDocument();
    expect(screen.getByText('Janey')).toBeInTheDocument();
  });
});
