import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// TODO: Replace with the public WhatsApp number, country code included, digits only.
// Example format: 919876543210 (do not include +, spaces, or dashes).
const WHATSAPP_NUMBER = '91XXXXXXXXXX';
const whatsappReady = /^\d{10,15}$/.test(WHATSAPP_NUMBER) && !WHATSAPP_NUMBER.includes('X');

export default function WhatsAppFloat() {
  if (!whatsappReady) {
    return (
      <Link className="whatsapp-float is-placeholder" to="/contact" aria-label="WhatsApp contact setup pending; open contact page">
        <MessageCircle size={20} aria-hidden="true" />
        <span>WhatsApp</span>
        <small>SETUP NEEDED</small>
      </Link>
    );
  }

  return (
    <a className="whatsapp-float" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="Chat with AmaanTrader on WhatsApp">
      <MessageCircle size={20} aria-hidden="true" />
      <span>WhatsApp</span>
    </a>
  );
}
