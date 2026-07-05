import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssessmentHome from '../components/assessment/AssessmentHome';
import AssessmentWizard from '../components/assessment/AssessmentWizard';
import AssessmentResults from '../components/assessment/AssessmentResults';
import AssessmentNotSuitable from '../components/assessment/AssessmentNotSuitable';
import { computeAssessment, QUESTIONS } from '../lib/assessment';
import type { Product } from '../types';

describe('AssessmentHome', () => {
  it('renders the headline and starts the quiz on click', () => {
    const onStart = vi.fn();
    render(<AssessmentHome questionCount={12} onStart={onStart} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/which peptide protocol/i);
    expect(screen.getByText(/12 questions/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /begin assessment/i }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('AssessmentWizard', () => {
  const ageQ = QUESTIONS.find((q) => q.id === 'age')!;

  it('renders options and routes single-select clicks through onSelect', () => {
    const onSelect = vi.fn();
    render(
      <AssessmentWizard
        question={ageQ}
        stepNum={1}
        stepTotal={12}
        progressPct={0}
        answers={{}}
        isAnswered={false}
        isFirst
        isLast={false}
        onSelect={onSelect}
        onToggle={vi.fn()}
        onAdvance={vi.fn()}
        onBack={vi.fn()}
        onExit={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(ageQ.title);
    fireEvent.click(screen.getByRole('button', { name: /18–29/i }));
    expect(onSelect).toHaveBeenCalledWith('a18');
  });

  it('disables Continue until the current question is answered', () => {
    render(
      <AssessmentWizard
        question={ageQ}
        stepNum={1}
        stepTotal={12}
        progressPct={0}
        answers={{}}
        isAnswered={false}
        isFirst
        isLast={false}
        onSelect={vi.fn()}
        onToggle={vi.fn()}
        onAdvance={vi.fn()}
        onBack={vi.fn()}
        onExit={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
  });
});

describe('AssessmentResults', () => {
  const result = computeAssessment({
    age: 'a30', pregnant: 'no', thyroid: 'no', pancreatitis: 'no', primary: 'skin', budget: 'o10',
  });

  it('lists ranked recommendations with match scores', () => {
    render(<AssessmentResults result={result} products={[]} onRestart={vi.fn()} onHome={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/personalized protocol/i);
    expect(screen.getByText(`${result.recs[0].match}`)).toBeInTheDocument();
    // Without a live catalog match, View Product falls back to the catalog anchor.
    const viewLinks = screen.getAllByRole('link', { name: /view product/i });
    expect(viewLinks[0]).toHaveAttribute('href', '/#all-products');
  });

  it('links to the product page when the recommendation matches a live product', () => {
    const liveProduct = { id: 'p1', name: 'PLP-Glow' } as Product;
    render(
      <AssessmentResults result={result} products={[liveProduct]} onRestart={vi.fn()} onHome={vi.fn()} />
    );
    const glowLink = screen.getAllByRole('link', { name: /view product/i })[0];
    expect(glowLink).toHaveAttribute('href', '/products/plp-glow');
  });
});

describe('AssessmentNotSuitable', () => {
  it('shows screening reasons and offers a way home', () => {
    const onHome = vi.fn();
    render(
      <AssessmentNotSuitable reasons={['Peptide protocols are only available to adults 18 and older.']} onHome={onHome} onRestart={vi.fn()} />
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/aren.t suitable/i);
    expect(screen.getByText(/adults 18 and older/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /return home/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
