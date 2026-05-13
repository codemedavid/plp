import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-light px-4">
      <div className="text-center max-w-md">
        <p className="text-[11px] font-semibold tracking-[0.32em] uppercase text-gold-600 mb-4">404</p>
        <h1 className="font-heading text-4xl md:text-5xl font-normal text-navy-900 mb-4 tracking-tight">
          Page not found
        </h1>
        <p className="text-charcoal-500 leading-relaxed mb-8">
          We couldn't find the page you were looking for. It may have moved or no longer exists.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy-900 hover:bg-gold-600 text-white text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors rounded"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
