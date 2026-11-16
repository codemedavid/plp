// Branded full-page loader. Styles (`.plp-loader*`) live in index.html so the
// identical splash renders before JS loads; React then swaps in this component
// for route/chunk loading with no visual jump. Keep both markups in sync.
const LOGO_SRC = '/logo-plp-loader.png';
const LOGO_WIDTH = 480;
const LOGO_HEIGHT = 193;

function LoadingSpinner() {
    return (
        <div className="plp-loader" role="status" aria-live="polite">
            <img
                className="plp-loader__logo"
                src={LOGO_SRC}
                alt="Peptide Lifestyle Program"
                width={LOGO_WIDTH}
                height={LOGO_HEIGHT}
                decoding="async"
            />
            <div className="plp-loader__bar" aria-hidden="true" />
            <span className="plp-loader__label">Loading…</span>
        </div>
    );
}

export default LoadingSpinner;
