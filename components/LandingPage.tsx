'use client';

import Link from 'next/link';

const solutionHighlights = [
  { title: 'Predictive quantity intelligence', description: 'Upload plans and BuildMate forecasts materials with adaptive AI tuned to your past projects.' },
  { title: 'Margin guardrails', description: 'Simulate markups, taxes, and contingency in real time so every bid aligns with your profit targets.' },
  { title: 'Connected teams', description: 'Invite estimators, finance, and supers into one shared hub with workflow automation built in.' },
];

const proofMetrics = [
  { label: 'Projects scoped', value: '4,800+', detail: 'delivered through BuildMate in 2024' },
  { label: 'Average ROI', value: '5.4x', detail: 'based on customer-reported time and margin gains' },
  { label: 'Accuracy lift', value: '92%', detail: 'of users report fewer change orders post-award' },
];

const testimonials = [
  { name: 'Lena Hart', role: 'Director of Preconstruction, HartBuild', quote: 'BuildMate replaced three disconnected tools and cut our bid preparation time nearly in half. The accuracy of the AI takeoff engine still surprises our field supervisors.' },
  { name: 'Marcus Ruiz', role: 'Owner, Summit Renovations', quote: 'Our team finally trusts the numbers before we walk into a client meeting. The cloud save and project history features are indispensable.' },
  { name: 'Priya Natarajan', role: 'VP Estimating, Skyline Civil', quote: 'The predictive pricing alerts have saved us from underbidding on specialty trades. BuildMate keeps everyone aligned before we submit.' },
];

const faqs = [
  { question: 'Can I import my existing estimate templates?', answer: 'Yes. Upload templates or CSV exports and map them once\u2014BuildMate remembers your structure for future bids.' },
  { question: 'Does BuildMate handle multi-project workspaces?', answer: 'Every subscription includes unlimited projects. Tag, filter, and report across portfolios without extra fees.' },
  { question: 'How secure is my data?', answer: 'We rely on Firebase Auth, Firestore, and encrypted storage. Role-based access ensures only the right teammates see sensitive numbers.' },
  { question: 'Do you support custom integrations?', answer: 'Scale plan subscribers receive API access and tailored automations to connect ERPs, CRMs, and scheduling tools.' },
];

const plans = [
  { tier: 'Starter', price: 9.99, headline: 'Built for solo estimators modernizing their toolkit.', perks: ['Single seat', 'Up to 10 estimates per month', 'Smart catalog recommendations', 'Email support'] },
  { tier: 'Growth', price: 29.99, headline: 'Ideal for contractors managing repeatable pipelines.', perks: ['Up to 5 seats', 'Unlimited estimates & projects', 'Pipeline analytics & CRM sync', 'Priority chat support'], highlighted: true },
  { tier: 'Scale', price: 99.99, headline: 'Enterprise intelligence with dedicated success.', perks: ['Unlimited seats', 'Predictive cost forecasting', 'API & custom integrations', 'Dedicated success manager'] },
];

export function LandingPage() {
  return (
    <div className="landing landing--hyper">
      <div className="landing__background" aria-hidden="true" />

      <header className="landing-hero">
        <div className="landing-hero__brand">
          <div className="brand-mark" aria-hidden="true"><span>BM</span></div>
          <div>
            <span className="brand-name">BuildMate AI</span>
            <p className="brand-tagline">Estimate smarter. Win more work.</p>
          </div>
        </div>
        <nav className="landing-hero__nav" aria-label="Primary navigation">
          <Link href="/login">Log in</Link>
          <Link className="landing-hero__nav-button" href="/login">Access workspace</Link>
          <Link className="landing-hero__nav-button landing-hero__nav-button--primary" href="/register">Start free trial</Link>
        </nav>
      </header>

      <section className="landing-hero__content">
        <div className="landing-hero__copy">
          <h1>AI estimating designed for 2025 construction leaders</h1>
          <p>BuildMate fuses machine intelligence, market pricing, and connected workflows so you deliver confident bids in record time.</p>
          <div className="landing-hero__actions">
            <Link className="button button--glow" href="/register">Try BuildMate free</Link>
            <p className="landing-hero__disclaimer">{'14-day trial \u00b7 No credit card \u00b7 Cancel anytime'}</p>
          </div>
        </div>
        <div className="landing-hero__visual" role="list">
          <article className="landing-hero__card" role="listitem">
            <span className="landing-kicker">Problem</span>
            <h2>Manual estimating leaves money on the table</h2>
            <p>Spreadsheets, siloed data, and rushed revisions generate expensive callbacks. BuildMate stops the leakage before bid day.</p>
          </article>
          <article className="landing-hero__card" role="listitem">
            <span className="landing-kicker landing-kicker--accent">Vision</span>
            <h2>Forecast every bid with predictive clarity</h2>
            <p>Automate tedious takeoffs, compare supplier quotes instantly, and align your entire pre-con team around a single source of truth.</p>
          </article>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="solution-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">Solution</span>
          <h2 id="solution-heading">BuildMate gives estimators a cockpit for intelligent decision-making</h2>
          <p>Plug in your scope and deliver proposals backed by live benchmarks, risk alerts, and automated workflows.</p>
        </div>
        <div className="landing-grid landing-grid--solutions">
          {solutionHighlights.map((item) => (
            <article key={item.title} className="landing-card"><h3>{item.title}</h3><p>{item.description}</p></article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--glass" aria-labelledby="proof-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">Proof</span>
          <h2 id="proof-heading">Verified impact across commercial and residential portfolios</h2>
          <p>Contractors rely on BuildMate to streamline bids and keep stakeholders aligned from day one.</p>
        </div>
        <div className="landing-metrics">
          {proofMetrics.map((metric) => (
            <div key={metric.label} className="landing-metric"><strong>{metric.value}</strong><span>{metric.label}</span><p>{metric.detail}</p></div>
          ))}
        </div>
      </section>

      <section className="landing-section" aria-labelledby="testimonial-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">Testimonials</span>
          <h2 id="testimonial-heading">Leaders who trust BuildMate with their margins</h2>
        </div>
        <div className="landing-grid landing-grid--testimonials">
          {testimonials.map((t) => (
            <article key={t.name} className="landing-testimonial">
              <p>{'"' + t.quote + '"'}</p>
              <footer><strong>{t.name}</strong><span>{t.role}</span></footer>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--glass" aria-labelledby="about-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">About</span>
          <h2 id="about-heading">Built by estimators, for the crews that depend on them</h2>
          <p>We pair decades of construction expertise with AI research to give every contractor a strategic advantage in pre-construction.</p>
        </div>
        <div className="landing-about">
          <div><h3>Our promise</h3><ul><li>Accurate proposals produced in minutes, not days</li><li>Transparent pricing data you can explain to clients</li><li>Workflows your office and field teams will actually adopt</li></ul></div>
          <div><h3>Where we focus</h3><ul><li>Commercial build-outs and tenant improvements</li><li>Residential remodels and additions</li><li>Civil and site development bids</li></ul></div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="plans-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">Plans</span>
          <h2 id="plans-heading">Subscriptions engineered for momentum</h2>
          <p>Monthly billing with instant activation. Upgrade whenever your team expands.</p>
        </div>
        <div className="landing-grid landing-grid--plans">
          {plans.map((plan) => (
            <article key={plan.tier} className={plan.highlighted ? 'landing-plan landing-plan--highlighted' : 'landing-plan'}>
              <header><h3>{plan.tier}</h3><p className="landing-plan__headline">{plan.headline}</p><p className="landing-plan__price"><span>{'$' + plan.price.toFixed(2)}</span><small>/month</small></p></header>
              <ul>{plan.perks.map((perk) => (<li key={perk}>{perk}</li>))}</ul>
              <Link className="landing-plan__cta" href="/register">{'Start ' + plan.tier.toLowerCase() + ' plan'}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--glass" aria-labelledby="faq-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">FAQ</span>
          <h2 id="faq-heading">Answers for busy estimators</h2>
        </div>
        <div className="landing-faq">
          {faqs.map((faq) => (<article key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>))}
        </div>
      </section>

      <section className="landing-section landing-cta" aria-labelledby="cta-heading">
        <div className="landing-section__header">
          <span className="landing-kicker landing-kicker--line">Get started</span>
          <h2 id="cta-heading">Ready to protect every margin point?</h2>
          <p>Join thousands of estimators who rely on BuildMate to submit confident, profitable bids.</p>
        </div>
        <div className="landing-cta__actions">
          <Link className="button button--glow" href="/register">Create your account</Link>
          <Link className="landing-cta__secondary" href="/login">Already onboard? Log in</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <div className="brand-mark" aria-hidden="true"><span>BM</span></div>
          <p>{'BuildMate AI \u00a9 ' + new Date().getFullYear() + ' \u00b7 Built for construction professionals.'}</p>
        </div>
        <div className="landing-footer__links">
          <Link href="/register">Sign up</Link>
          <Link href="/login">Sign in</Link>
          <a href="mailto:support@buildmate.ai">support@buildmate.ai</a>
        </div>
      </footer>
    </div>
  );
}
