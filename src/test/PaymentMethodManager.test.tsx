import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PaymentMethod } from '../hooks/usePaymentMethods';

const addPaymentMethod = vi.fn().mockResolvedValue({});
const updatePaymentMethod = vi.fn().mockResolvedValue({});
const deletePaymentMethod = vi.fn().mockResolvedValue(undefined);
const refetchAll = vi.fn().mockResolvedValue(undefined);

const methods: PaymentMethod[] = [
    {
        id: 'maya-id',
        name: 'Maya',
        account_number: '0917',
        account_name: 'PLP',
        qr_code_url: 'https://img/maya.png',
        active: true,
        sort_order: 1,
        surcharge_pct: 0,
        created_at: '',
        updated_at: '',
    },
    {
        id: 'qrph-id',
        name: 'QRPh',
        account_number: 'QRPh',
        account_name: 'PLP',
        qr_code_url: '/payments/qrph-paymongo.jpg',
        active: false,
        sort_order: 2,
        surcharge_pct: 3,
        created_at: '',
        updated_at: '',
    },
];

vi.mock('../hooks/usePaymentMethods', () => ({
    usePaymentMethods: () => ({
        paymentMethods: methods,
        addPaymentMethod,
        updatePaymentMethod,
        deletePaymentMethod,
        refetchAll,
    }),
}));

vi.mock('../components/ImageUpload', () => ({
    default: () => <div data-testid="image-upload" />,
}));

import PaymentMethodManager from '../components/PaymentMethodManager';

const renderManager = () => render(<PaymentMethodManager onBack={vi.fn()} />);

const openEditFor = async (name: string) => {
    const user = userEvent.setup();
    renderManager();
    const row = screen.getByRole('heading', { name }).closest('div[class*="border-2"]') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: 'Edit' }));
    return user;
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
});

describe('PaymentMethodManager payment fee', () => {
    it('shows each method\'s current fee in the list', () => {
        renderManager();
        expect(screen.getByText('Fee: 3%')).toBeInTheDocument();
        expect(screen.getByText('No fee')).toBeInTheDocument();
    });

    it('pre-fills the fee input when editing', async () => {
        await openEditFor('QRPh');
        const input = screen.getByLabelText(/payment fee \(%\)/i) as HTMLInputElement;
        expect(input.value).toBe('3');
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '10');
        expect(input).toHaveAttribute('step', '0.5');
        expect(screen.getByText(/0 = no fee/i)).toBeInTheDocument();
    });

    it('saves a changed fee as a number', async () => {
        const user = await openEditFor('QRPh');
        const input = screen.getByLabelText(/payment fee \(%\)/i);
        await user.clear(input);
        await user.type(input, '2.5');
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(updatePaymentMethod).toHaveBeenCalledTimes(1);
        const [id, payload] = updatePaymentMethod.mock.calls[0];
        expect(id).toBe('qrph-id');
        expect(payload.surcharge_pct).toBe(2.5);
    });

    it('turns the fee off with 0', async () => {
        const user = await openEditFor('QRPh');
        const input = screen.getByLabelText(/payment fee \(%\)/i);
        await user.clear(input);
        await user.type(input, '0');
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(updatePaymentMethod.mock.calls[0][1].surcharge_pct).toBe(0);
    });

    it('blocks saving an out-of-range fee and explains why', async () => {
        const user = await openEditFor('QRPh');
        const input = screen.getByLabelText(/payment fee \(%\)/i);
        await user.clear(input);
        await user.type(input, '12');
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(updatePaymentMethod).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(/between 0 and 10/i);
    });

    it('blocks a fee that is not a 0.5 step', async () => {
        const user = await openEditFor('QRPh');
        const input = screen.getByLabelText(/payment fee \(%\)/i);
        await user.clear(input);
        await user.type(input, '2.25');
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(updatePaymentMethod).not.toHaveBeenCalled();
    });

    it('defaults a new method to no fee', async () => {
        const user = userEvent.setup();
        renderManager();
        await user.click(screen.getByRole('button', { name: /add payment method/i }));
        await user.type(screen.getByPlaceholderText(/gcash, maya/i), 'GCash');
        await user.type(screen.getByPlaceholderText(/09XX/i), '0917');
        await user.type(screen.getByPlaceholderText('SLIMMETRY'), 'PLP');
        await user.click(screen.getByRole('button', { name: /save/i }));

        expect(addPaymentMethod).toHaveBeenCalledTimes(1);
        expect(addPaymentMethod.mock.calls[0][0].surcharge_pct).toBe(0);
    });
});
