import './_group.css';

const businessEmail = 'zmksmsresurs@gmail.com';

export function CurrentHeaderContact() {
  return (
    <div className="contact-preview-shell">
      <div className="header-contact" data-testid="header-contact">
        <a className="header-phone" href="tel:+79069624358" data-testid="link-header-phone">
          <span className="header-phone-number">8 906 962 43 58</span>
          <span className="header-phone-hours">с 8 до 20 часов</span>
        </a>
        <a className="header-email" href={`mailto:${businessEmail}`} data-testid="link-header-email">
          {businessEmail}
        </a>
      </div>
    </div>
  );
}