import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CoaButton } from '../components/ui/CoaButton';
import type { CoaLink } from '../types';

const PURITY = 'https://verify.janoshik.com/tests/113255-Tirzepatide_30mg_M6J942Z5BHLG';
const HEAVY = 'https://verify.janoshik.com/tests/113135-Tirzepatide_30mg_BES6MLPYQCK4';

const twoLinks: CoaLink[] = [
  { label: 'Purity Test', url: PURITY },
  { label: 'Heavy Metal Testing', url: HEAVY },
];

describe('CoaButton', () => {
  it('renders a disabled control when there are no links', () => {
    render(<CoaButton links={[]} variant="pdp" />);

    expect(screen.getByRole('button', { name: /coa/i })).toBeDisabled();
  });

  it('renders a direct external link when there is exactly one link', () => {
    render(<CoaButton links={[{ label: 'Certificate of Analysis', url: PURITY }]} />);

    const link = screen.getByRole('link', { name: /coa/i });
    expect(link).toHaveAttribute('href', PURITY);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('reveals a menu of labeled links when there are multiple', async () => {
    const user = userEvent.setup();
    render(<CoaButton links={twoLinks} />);

    // The individual documents are hidden until the button is opened.
    expect(screen.queryByRole('menuitem', { name: /purity test/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /coa/i }));

    const purity = screen.getByRole('menuitem', { name: /purity test/i });
    const heavy = screen.getByRole('menuitem', { name: /heavy metal testing/i });
    expect(purity).toHaveAttribute('href', PURITY);
    expect(heavy).toHaveAttribute('href', HEAVY);
    expect(purity).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
