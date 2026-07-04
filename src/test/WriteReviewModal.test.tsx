import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock the data layer: keep the real REVIEW_REWARD_POINTS constant, stub the
// network calls so we can assert on the reward flow.
const submitCustomerReview = vi.fn();
const awardReviewPoints = vi.fn();

vi.mock('../hooks/useReviews', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../hooks/useReviews')>();
    return {
        ...actual,
        submitCustomerReview: (...args: unknown[]) => submitCustomerReview(...args),
        awardReviewPoints: (...args: unknown[]) => awardReviewPoints(...args),
    };
});

import WriteReviewModal from '../components/WriteReviewModal';
import { REVIEW_REWARD_POINTS } from '../hooks/useReviews';

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    productId: 'prod-1',
    productName: 'PLP Slim 2.0',
    orderId: 'order-1',
    defaultName: 'Jane',
};

function fillAndSubmit() {
    fireEvent.change(screen.getByPlaceholderText(/like or dislike/i), {
        target: { value: 'Great product, worked well.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit review/i }));
}

describe('WriteReviewModal points reward', () => {
    beforeEach(() => {
        submitCustomerReview.mockReset().mockResolvedValue({ id: 'rev-1' });
        awardReviewPoints.mockReset().mockResolvedValue(REVIEW_REWARD_POINTS);
    });

    it('shows the points incentive banner', () => {
        render(<WriteReviewModal {...baseProps} userId="user-1" />);
        expect(
            screen.getByText(new RegExp(`Earn ${REVIEW_REWARD_POINTS} points`, 'i')),
        ).toBeInTheDocument();
    });

    it('awards points and confirms them for a signed-in customer', async () => {
        render(<WriteReviewModal {...baseProps} userId="user-1" />);
        fillAndSubmit();

        await waitFor(() =>
            expect(awardReviewPoints).toHaveBeenCalledWith('order-1', 'prod-1'),
        );
        expect(
            await screen.findByText(new RegExp(`earned ${REVIEW_REWARD_POINTS} points`, 'i')),
        ).toBeInTheDocument();
    });

    it('does not award points for a guest and nudges them to sign in', async () => {
        render(<WriteReviewModal {...baseProps} userId={null} />);
        fillAndSubmit();

        await waitFor(() => expect(submitCustomerReview).toHaveBeenCalled());
        expect(awardReviewPoints).not.toHaveBeenCalled();
        expect(
            await screen.findByText(/sign in next time to earn/i),
        ).toBeInTheDocument();
    });
});
