import { ArrowUpRight, Facebook, Instagram, Youtube } from 'lucide-react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Brand from './Brand';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { notify } = useStore();

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // No email provider/API is connected in this frontend. Do not imply a subscription was stored.
    notify('Newsletter preview only', 'Signup is not connected yet. Connect an email provider before collecting subscriptions.', 'info');
    event.currentTarget.reset();
  };

  return (
    <footer className="site-footer stage-b-footer" id="footer-contact">
      <div className="footer-top">
        <div className="footer-brand-block">
          <Brand />
          <p>Outerwear for the in-between moments.<br />Designed to be worn, lived in and kept.</p>
          <div className="social-row" aria-label="Social links">
            {/* TODO: Replace these placeholder destinations with the brand's verified profiles. */}
            <a href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram (profile URL to be configured)"><Instagram size={17} /></a>
            <a href="https://facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook (profile URL to be configured)"><Facebook size={17} /></a>
            <a href="https://youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube (profile URL to be configured)"><Youtube size={17} /></a>
          </div>
          <small className="footer-todo-note">TODO: Add the official Instagram, Facebook and YouTube profile URLs.</small>
        </div>

        <div className="footer-col">
          <span>EXPLORE</span>
          <Link to="/shop">All jackets</Link>
          <Link to="/lookbook">Lookbook</Link>
          <Link to="/about">Our story</Link>
          <Link to="/journal">Journal</Link>
        </div>

        <div className="footer-col">
          <span>CLIENT CARE</span>
          <Link to="/contact">Contact</Link>
          <Link to="/size-guide">Size guide</Link>
          <Link to="/order-support">Order support</Link>
          <Link to="/policies">Shipping &amp; returns</Link>
        </div>

        <div className="footer-newsletter">
          <span>THE LAYER LETTER</span>
          <h3>A little more<br /><em>considered.</em></h3>
          <form onSubmit={handleNewsletterSubmit}>
            <label className="sr-only" htmlFor="stage-b-newsletter-email">Email address</label>
            <input id="stage-b-newsletter-email" type="email" required placeholder="Your email address" autoComplete="email" />
            <button type="submit" aria-label="Preview newsletter signup"><ArrowUpRight /></button>
          </form>
          <small>TODO: Connect an email provider before accepting newsletter signups. This preview does not store addresses.</small>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} AMAANTRADERS. ALL LAYERS RESERVED.</span>
        <span>MADE FOR THE EVERYDAY, AND BEYOND.</span>
        <Link to="/admin">Studio access <ArrowUpRight size={12} /></Link>
      </div>
    </footer>
  );
}
