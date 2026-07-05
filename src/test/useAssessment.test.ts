import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssessment } from '../hooks/useAssessment';

type Hook = ReturnType<typeof useAssessment>;

// Drive the wizard to completion, choosing `valueFor(qid)` when provided and
// falling back to the first option otherwise.
function runToEnd(
  result: { current: Hook },
  valueFor: (qid: string) => string | undefined = () => undefined
) {
  let guard = 0;
  while (result.current.view === 'quiz' && guard++ < 50) {
    const q = result.current.current!;
    const val = valueFor(q.id) ?? q.opts[0].v;
    act(() => result.current.pick(q.id, val, !!q.multi));
    act(() => result.current.advance());
  }
}

describe('useAssessment', () => {
  it('starts on the home view with no answers', () => {
    const { result } = renderHook(() => useAssessment());
    expect(result.current.view).toBe('home');
    expect(result.current.step).toBe(0);
    expect(result.current.answers).toEqual({});
  });

  it('start() enters the quiz at the first question', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    expect(result.current.view).toBe('quiz');
    expect(result.current.step).toBe(0);
    expect(result.current.current?.id).toBe('age');
  });

  it('records a single-select answer without advancing', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    act(() => result.current.pick('age', 'a30', false));
    expect(result.current.answers.age).toBe('a30');
    expect(result.current.step).toBe(0);
    expect(result.current.isCurrentAnswered).toBe(true);
  });

  it('toggles multi-select values and clears "none" when another is picked', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    act(() => result.current.pick('conditions', 'none', true));
    expect(result.current.answers.conditions).toEqual(['none']);
    act(() => result.current.pick('conditions', 't2d', true));
    expect(result.current.answers.conditions).toEqual(['t2d']);
    act(() => result.current.pick('conditions', 't2d', true));
    expect(result.current.answers.conditions).toEqual([]);
  });

  it('back() steps back but never below the first question', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    act(() => result.current.pick('age', 'a30', false));
    act(() => result.current.advance());
    expect(result.current.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.step).toBe(0);
    act(() => result.current.back());
    expect(result.current.step).toBe(0);
  });

  it('routes to results with recommendations for a suitable adult', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    runToEnd(result, (qid) =>
      ({ age: 'a30', pregnant: 'no', thyroid: 'no', pancreatitis: 'no', primary: 'skin' } as Record<string, string>)[qid]
    );
    expect(result.current.view).toBe('results');
    expect(result.current.result?.recs.length).toBeGreaterThan(0);
  });

  it('routes to the disqualification view when screening fails', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    runToEnd(result, (qid) => ({ age: 'u18', primary: 'weight' } as Record<string, string>)[qid]);
    expect(result.current.view).toBe('dq');
    expect(result.current.result?.dq).toBe(true);
  });

  it('select() auto-advances a single-select answer to the next question', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    act(() => result.current.select('age', 'a30', false));
    expect(result.current.answers.age).toBe('a30');
    expect(result.current.step).toBe(1);
    expect(result.current.current?.id).toBe('pregnant');
  });

  it('select() does not auto-advance a multi-select answer', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    // Jump to the multi-select "conditions" question by answering prior singles.
    act(() => result.current.select('age', 'a30', false));
    act(() => result.current.select('pregnant', 'no', false));
    act(() => result.current.select('thyroid', 'no', false));
    act(() => result.current.select('pancreatitis', 'no', false));
    expect(result.current.current?.id).toBe('conditions');
    act(() => result.current.select('conditions', 't2d', true));
    expect(result.current.answers.conditions).toEqual(['t2d']);
    expect(result.current.current?.id).toBe('conditions');
  });

  it('select() on the final single-select question completes the assessment', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    // Non-weight goal keeps the question set free of the conditional weight steps.
    const path: Record<string, string> = {
      age: 'a30', pregnant: 'no', thyroid: 'no', pancreatitis: 'no', primary: 'skin',
    };
    let guard = 0;
    while (result.current.view === 'quiz' && guard++ < 50) {
      const q = result.current.current!;
      const val = path[q.id] ?? q.opts[0].v;
      if (q.multi) {
        act(() => result.current.pick(q.id, val, true));
        act(() => result.current.advance());
      } else {
        act(() => result.current.select(q.id, val, false));
      }
    }
    expect(result.current.view).toBe('results');
    expect(result.current.result?.recs.length).toBeGreaterThan(0);
  });

  it('goHome() resets the wizard back to the start', () => {
    const { result } = renderHook(() => useAssessment());
    act(() => result.current.start());
    act(() => result.current.pick('age', 'a30', false));
    act(() => result.current.goHome());
    expect(result.current.view).toBe('home');
    expect(result.current.answers).toEqual({});
    expect(result.current.step).toBe(0);
  });
});
