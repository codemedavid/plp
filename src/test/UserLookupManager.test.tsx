import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

type Response = { data?: unknown; error?: unknown };

let responsesByTable: Map<string, Response[]>;

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

const fromMock = vi.fn((table: string) => buildChain(table));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

import UserLookupManager from '../components/UserLookupManager';

const baseProfile = {
  id: 'u-1',
  referral_code: 'ALPHA',
  referred_by: null as string | null,
  full_name: 'Jane Doe',
  nickname: 'Janey',
  phone: '09171234567',
  address: '1 Main',
  avatar_url: null,
  email: 'jane@example.com',
  facebook: null,
  frozen: false,
  created_at: '2026-01-01T00:00:00Z',
};

const profile2 = {
  ...baseProfile,
  id: 'u-2',
  referral_code: 'BETA',
  referred_by: 'u-1',
  full_name: 'Bob Smith',
  nickname: null,
  phone: '09180000000',
  email: 'bob@example.com',
};

beforeEach(() => {
  responsesByTable = new Map();
  fromMock.mockClear();
});

function seedLoaded(profiles: unknown[], balances: unknown[], orders: unknown[]) {
  responsesByTable.set('user_profiles', [{ data: profiles, error: null }]);
  responsesByTable.set('user_point_balance', [{ data: balances, error: null }]);
  responsesByTable.set('orders', [{ data: orders, error: null }]);
}

describe('UserLookupManager', () => {
  it('shows loading state initially', () => {
    seedLoaded([], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    expect(screen.getByText(/Loading users/)).toBeInTheDocument();
  });

  it('renders users after load', async () => {
    seedLoaded([baseProfile, profile2], [{ user_id: 'u-1', balance: 500 }], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.queryByText(/Loading users/)).not.toBeInTheDocument());
    expect(screen.getByText('Janey')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });

  it('shows error message when load fails', async () => {
    responsesByTable.set('user_profiles', [{ data: null, error: new Error('oops') }]);
    responsesByTable.set('user_point_balance', [{ data: [], error: null }]);
    responsesByTable.set('orders', [{ data: [], error: null }]);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('oops')).toBeInTheDocument());
  });

  it('shows summary count of filtered users', async () => {
    seedLoaded([baseProfile, profile2], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/2 of 2 users/)).toBeInTheDocument());
  });

  it('filters users by search query (name)', async () => {
    seedLoaded([baseProfile, profile2], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search name/);
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => expect(screen.getByText(/1 of 2 users/)).toBeInTheDocument());
    expect(screen.queryByText('Janey')).not.toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('filters users by referral code', async () => {
    seedLoaded([baseProfile, profile2], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search name/);
    fireEvent.change(input, { target: { value: 'beta' } });
    await waitFor(() => expect(screen.getByText(/1 of 2/)).toBeInTheDocument());
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('shows "No matching users" when nothing matches', async () => {
    seedLoaded([baseProfile], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    const input = screen.getByPlaceholderText(/Search name/);
    fireEvent.change(input, { target: { value: 'zzzz' } });
    expect(await screen.findByText('No matching users')).toBeInTheDocument();
  });

  it('aggregates orders and total spent per user', async () => {
    const orders = [
      { id: 'o1', user_id: 'u-1', total_price: 1500, order_number: 'ORD-1', customer_email: 'jane@example.com', created_at: '2026-04-01T00:00:00Z' },
      { id: 'o2', user_id: 'u-1', total_price: 2500, order_number: 'ORD-2', customer_email: null, created_at: '2026-04-02T00:00:00Z' },
    ];
    seedLoaded([baseProfile], [{ user_id: 'u-1', balance: 300 }], orders);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    // Orders count = 2
    expect(screen.getByText('2')).toBeInTheDocument();
    // Total spent = 4000
    expect(screen.getByText('₱4,000')).toBeInTheDocument();
    // Points balance 300
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('counts referrals per inviter', async () => {
    seedLoaded([baseProfile, profile2], [], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    // Janey has 1 referral (Bob), Bob has 0.
    // Find Janey's row and check the referral count cell.
    const janeyRow = screen.getByText('Janey').closest('tr')!;
    expect(janeyRow.textContent).toContain('1');
  });

  it('opens detail drawer on row click', async () => {
    seedLoaded([baseProfile, profile2], [{ user_id: 'u-1', balance: 500 }], []);
    render(<UserLookupManager onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Janey'));
    expect(await screen.findByText('User details')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('calls onBack when back button clicked', async () => {
    seedLoaded([baseProfile], [], []);
    const onBack = vi.fn();
    render(<UserLookupManager onBack={onBack} />);
    await waitFor(() => expect(screen.getByText('Janey')).toBeInTheDocument());
    const buttons = screen.getAllByRole('button');
    // First button is the back/arrow-left button
    fireEvent.click(buttons[0]);
    expect(onBack).toHaveBeenCalled();
  });
});
