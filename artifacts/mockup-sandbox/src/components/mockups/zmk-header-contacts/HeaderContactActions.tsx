import './_group.css';
import { useState } from 'react';
import { ChevronDown, Copy, Mail, Phone, Send } from 'lucide-react';

const businessEmail = 'zmksmsresurs@gmail.com';

export function HeaderContactActions() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [copyNotice, setCopyNotice] = useState('');

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(businessEmail);
      setCopyNotice('Адрес почты скопирован');
      setMenuOpen(false);
    } catch {
      setCopyNotice('Не удалось скопировать адрес');
    }
  };

  return (
    <div className="contact-preview-shell">
      <div className="header-contact" data-testid="header-contact">
        <a className="header-phone" href="tel:+79069624358" data-testid="link-header-phone">
          <span className="header-phone-main">
            <Phone className="header-phone-icon" size={14} aria-hidden="true" />
            <span className="header-phone-number">8 906 962 43 58</span>
          </span>
          <span className="header-phone-hours">с 8 до 20 часов</span>
        </a>

        <div className="header-email-actions">
          <button
            className="header-email-trigger"
            type="button"
            aria-label="Действия с электронной почтой"
            aria-expanded={menuOpen}
            aria-controls="preview-header-email-menu"
            onClick={() => setMenuOpen((open) => !open)}
            data-testid="button-header-email-actions"
          >
            <Mail size={12} aria-hidden="true" />
            <span>{businessEmail}</span>
            <ChevronDown className="header-email-chevron" size={12} aria-hidden="true" />
          </button>
          <div
            id="preview-header-email-menu"
            className="header-email-menu"
            hidden={!menuOpen}
            aria-label="Действия с электронной почтой"
          >
            <button type="button" onClick={copyEmail} data-testid="button-copy-header-email">
              <Copy size={14} aria-hidden="true" />
              <span>Скопировать адрес</span>
            </button>
            <a href={`mailto:${businessEmail}`} data-testid="link-compose-header-email">
              <Send size={14} aria-hidden="true" />
              <span>Написать письмо</span>
            </a>
          </div>
          {copyNotice && (
            <span className="header-email-status" role="status" aria-live="polite" data-testid="status-header-email-copy">
              {copyNotice}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}