import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BrandMark } from '../../components/ui/BrandMark';
import Button from '../../components/ui/Button';
import './legal.css';

export default function LegalLayout({ eyebrow, title, updated, children }) {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <Link to="/" className="legal-nav-brand">
          <BrandMark size={26} />
          Tickr
        </Link>
        <div className="legal-nav-spacer" />
        <Button as={Link} to="/" variant="ghost" size="sm" leading={<ArrowLeft size={14} />}>
          Home
        </Button>
      </nav>

      <main className="legal-container">
        {eyebrow && <div className="legal-eyebrow">{eyebrow}</div>}
        <h1 className="legal-title">{title}</h1>
        {updated && <div className="legal-updated">Last updated: {updated}</div>}
        {children}
      </main>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Tickr</span>
        <div className="legal-footer-spacer" />
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/">Home</Link>
      </footer>
    </div>
  );
}
