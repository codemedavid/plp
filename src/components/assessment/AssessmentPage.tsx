import Seo from '../seo/Seo';
import Header from '../Header';
import Footer from '../Footer';
import { useCart } from '../../hooks/useCart';
import { useMenu } from '../../hooks/useMenu';
import { useAssessment } from '../../hooks/useAssessment';
import AssessmentHome from './AssessmentHome';
import AssessmentWizard from './AssessmentWizard';
import AssessmentResults from './AssessmentResults';
import AssessmentNotSuitable from './AssessmentNotSuitable';

export function AssessmentPage() {
  const { cartItems } = useCart();
  const { menuItems } = useMenu();
  const a = useAssessment();

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-cream-light">
      <Seo
        title="Peptide Assessment — Find Your Protocol | Peptide Lifestyle Program"
        description="Take our 3-minute peptide assessment. Answer screening and lifestyle questions to receive a ranked, safety-checked protocol matched to your goals."
        path="/assessment"
      />
      <Header
        cartItemsCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => {}}
        onMenuClick={goHome}
      />

      {a.view === 'home' && <AssessmentHome questionCount={a.total} onStart={a.start} />}

      {a.view === 'quiz' && a.current && (
        <AssessmentWizard
          question={a.current}
          stepNum={a.step + 1}
          stepTotal={a.total}
          progressPct={a.progressPct}
          answers={a.answers}
          isAnswered={a.isCurrentAnswered}
          isFirst={a.step === 0}
          isLast={a.step + 1 >= a.total}
          onSelect={(value) => a.select(a.current!.id, value, false)}
          onToggle={(value) => a.pick(a.current!.id, value, true)}
          onAdvance={a.advance}
          onBack={a.back}
          onExit={a.goHome}
        />
      )}

      {a.view === 'results' && a.result && (
        <AssessmentResults
          result={a.result}
          products={menuItems}
          onRestart={a.restart}
          onHome={a.goHome}
        />
      )}

      {a.view === 'dq' && a.result && (
        <AssessmentNotSuitable
          reasons={a.result.dqReasons}
          onHome={a.goHome}
          onRestart={a.restart}
        />
      )}

      <Footer />
    </div>
  );
}

export default AssessmentPage;
