import LegalLayout from './LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      updated="May 25, 2026"
    >
      <div className="legal-callout">
        <p>
          <strong>This app is a personal project developed by one person.</strong> If you
          have any questions or concerns please email{' '}
          <a href="mailto:adityagyawali535@gmail.com">adityagyawali535@gmail.com</a>.
        </p>
      </div>

      <p>
        This Privacy Policy describes what information Tickr ("the app", "we") collects,
        how it is used, and the limited ways it is shared. Tickr is a personal, non-commercial
        project. By using the app you agree to the practices described below.
      </p>

      <h2>1. Information you give us</h2>
      <p>
        When you create an account you provide a username, an email address, and a password.
        Passwords are hashed before storage — the plain-text value is never saved. If you
        record portfolio lots, the ticker, quantity, price, and purchase date are stored
        against your account so the app can compute your holdings.
      </p>

      <h2>2. Information collected automatically</h2>
      <p>
        Standard web server logs record request metadata (IP address, user agent, path,
        timestamp, status code) for short-term operational use — debugging, abuse prevention,
        and rate limiting. The app does not use third-party analytics, advertising trackers,
        or session-replay tools.
      </p>

      <h2>3. Cookies and local storage</h2>
      <p>
        Tickr stores a JWT session token in your browser's <code>localStorage</code> so you
        stay signed in. Your watchlist and recent-ticker list are also stored locally in
        your browser. Clearing site data signs you out and removes those lists. No tracking
        cookies are set.
      </p>

      <h2>4. Third-party services</h2>
      <p>
        To deliver the product the app sends requests to:
      </p>
      <ul>
        <li><strong>Finnhub</strong> — for company news, quotes, and symbol search.</li>
        <li><strong>Alpha Vantage</strong> — as a fallback source for intraday data.</li>
        <li><strong>Hugging Face</strong> — once, at server startup, to download the
          FinBERT-tone model weights. Headlines are classified on our server; they are not
          sent to Hugging Face at runtime.</li>
        <li><strong>Microsoft Azure</strong> — the platform that hosts the app.</li>
      </ul>
      <p>
        These services have their own privacy practices and are not controlled by this app.
      </p>

      <h2>5. How your data is used</h2>
      <ul>
        <li>To authenticate you and keep you signed in.</li>
        <li>To compute and display your portfolio.</li>
        <li>To operate the service (logs, error tracking, rate limits).</li>
      </ul>
      <p>Your data is not sold, rented, or shared with advertisers.</p>

      <h2>6. Data retention</h2>
      <p>
        Account and portfolio records are kept while your account exists. To delete your
        account and associated data, email{' '}
        <a href="mailto:adityagyawali535@gmail.com">adityagyawali535@gmail.com</a> and the
        records will be removed.
      </p>

      <h2>7. Security</h2>
      <p>
        Reasonable measures are used to protect your data (password hashing, JWT auth,
        HTTPS, rate limiting). No system is perfectly secure — use a unique password and
        understand that you use the app at your own risk (see the Terms).
      </p>

      <h2>8. Children</h2>
      <p>The app is not directed at children under 13 and accounts should not be created on their behalf.</p>

      <h2>9. Changes</h2>
      <p>
        This policy may be updated as the project evolves. Material changes will be noted at
        the top of this page.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions, requests, or concerns about privacy can be sent to{' '}
        <a href="mailto:adityagyawali535@gmail.com">adityagyawali535@gmail.com</a>.
      </p>
    </LegalLayout>
  );
}
