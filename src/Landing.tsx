import { useState } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPlus,
  Eye,
  Layers3,
  Menu,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import "./Landing.css";

type DentalChartingLandingPageProps = {
  onGetStarted?: () => void;
  onLogin?: () => void;
};

const features = [
  {
    icon: Activity,
    title: "Clinical Chart",
    description:
      "Review the patient's dentition across existing and planning views, including crown surfaces and root profiles.",
  },
  {
    icon: ClipboardPlus,
    title: "Record Treatment",
    description:
      "Select a tooth, choose the chart type, switch between crown and root views, and record treatment.",
  },
  {
    icon: Layers3,
    title: "Existing & Planning",
    description:
      "Keep existing clinical conditions separate from planned treatment for a clearer patient overview.",
  },
  {
    icon: UsersRound,
    title: "Patient Records",
    description:
      "Review recent chart visits, appointments, dentists, entry counts, statuses, and last updates.",
  },
];

const faqs = [
  {
    question: "Can I view both crown and root profiles?",
    answer:
      "Yes. The clinical chart supports both crown surfaces and root profiles so the team can review recorded findings in one visual workspace.",
  },
  {
    question: "Can existing treatment be separated from planning?",
    answer:
      "Yes. Existing clinical conditions and planned treatment are kept separate so the dentist can distinguish current findings from future care.",
  },
  {
    question: "Can I record treatment against a specific tooth?",
    answer:
      "Yes. Select a tooth, choose the chart type, switch to the relevant view, and record the surface or treatment entry.",
  },
  {
    question: "Can I search previous patient chart visits?",
    answer:
      "Yes. Patient Records provides a searchable list of recent chart visits and important visit information.",
  },
];

const patients = [
  {
    name: "Alicia Tan",
    date: "28 Sep 2026",
    dentist: "Dr. Lim",
    entries: "12 entries",
    status: "Updated",
  },
  {
    name: "Daniel Wong",
    date: "27 Sep 2026",
    dentist: "Dr. Kumar",
    entries: "8 entries",
    status: "Planning",
  },
  {
    name: "Mei Ling",
    date: "26 Sep 2026",
    dentist: "Dr. Tan",
    entries: "5 entries",
    status: "Updated",
  },
];

export function DentalChartingLandingPage({
  onGetStarted,
  onLogin,
}: DentalChartingLandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
      return;
    }

    window.location.assign("https://app.snabbb.com/login");
  };

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }

    window.location.assign("https://app.snabbb.com/signup");
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <main className="dental-landing">
      <nav className="dental-nav">
        <a className="dental-brand" href="#top" onClick={closeMenu}>
          {/* <span className="dental-brand-mark">
            <Activity size={20} />
          </span>

          <span>
            Dental <strong>Charting</strong>
          </span> */}
          <img
            className="dental-brand-logo"
            src="/assets/images/snabbb-teal.png"
            alt="Snabbb"
          />

          <span className="dental-brand-divider" aria-hidden="true" />

          <span className="dental-brand-product">
            Dental <strong>Charting</strong>
          </span>
        </a>

        <div className={`dental-nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#features" onClick={closeMenu}>
            Features
          </a>

          <a href="#workflow" onClick={closeMenu}>
            How It Works
          </a>

          <a href="#faq" onClick={closeMenu}>
            FAQ
          </a>

          <div className="mobile-nav-actions">
            <button
              className="mobile-nav-login"
              onClick={() => {
                closeMenu();
                handleLogin();
              }}
            >
              Log In
            </button>

            <button
              className="mobile-nav-signup"
              onClick={() => {
                closeMenu();
                handleGetStarted();
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        <div className="dental-nav-actions">
          <button className="dental-login" onClick={handleLogin}>
            Log In
          </button>

          <button className="dental-nav-cta" onClick={handleGetStarted}>
            Sign Up
            <ArrowRight size={17} />
          </button>
        </div>

        <button
          className="dental-menu-button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </nav>

      <section className="dental-hero" id="top">
        <div className="dental-hero-copy">
          <div className="dental-eyebrow">
            <span className="dental-live-dot" />
            Built for modern dental teams
          </div>

          <h1>
            Make every clinical finding <em>easier to see.</em>
          </h1>

          <p>
            Review dentition, record treatment, separate existing conditions
            from planning, and manage patient chart visits from one clear
            clinical workspace.
          </p>

          <div className="dental-hero-actions">
            <button
              className="dental-primary-button"
              onClick={handleGetStarted}
            >
              Sign Up
              <ArrowRight size={18} />
            </button>

            <a className="dental-secondary-button" href="#features">
              Explore Features
            </a>
          </div>

          <div className="dental-trust-row">
            <span>
              <CheckCircle2 size={16} />
              Crown and root views
            </span>

            <span>
              <CheckCircle2 size={16} />
              Existing and planning charts
            </span>

            <span>
              <CheckCircle2 size={16} />
              Faster patient review
            </span>
          </div>
        </div>

        <div className="dental-hero-preview">
          <img
            className="dental-chart-preview-image"
            src="/assets/images/landing_image.png"
            alt="Dental chart planning and treatment interface"
          />
        </div>
      </section>

      <section className="dental-stat-strip">
        <div>
          <strong>4</strong>
          <span>core charting tools</span>
        </div>

        <div>
          <strong>2</strong>
          <span>clinical chart views</span>
        </div>

        <div>
          <strong>1</strong>
          <span>visual workspace</span>
        </div>

        <div>
          <strong>0</strong>
          <span>guesswork required</span>
        </div>
      </section>

      <section id="features" className="dental-section dental-features">
        <div className="dental-section-heading">
          <div className="dental-section-label">
            Everything in one place
          </div>

          <h2>Clinical charting that feels clear.</h2>

          <p>
            Dental Charting helps your team understand findings, treatment, and
            patient history without unnecessary complexity.
          </p>
        </div>

        <div className="dental-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article className="dental-feature-card" key={feature.title}>
                <div className="dental-feature-icon">
                  <Icon size={22} />
                </div>

                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="dental-section dental-workflow">
        <div className="dental-workflow-visual">
          <div className="dental-workflow-panel">
            <div className="dental-workflow-header">
              <div>
                <small>Current visit</small>
                <h3>Clinical recording</h3>
              </div>

              <CheckCircle2 size={22} color="#0b9f91" />
            </div>

            <div className="dental-progress-label">
              <span>Visit completion</span>
              <strong>86%</strong>
            </div>

            <div className="dental-progress-track">
              <span />
            </div>

            <div className="dental-workflow-list">
              <div>
                <Search size={16} />
                <span>
                  <strong>Select a tooth</strong>
                  <small>Tooth 16 selected</small>
                </span>
                <CheckCircle2 size={16} />
              </div>

              <div>
                <Layers3 size={16} />
                <span>
                  <strong>Choose chart type</strong>
                  <small>Existing condition</small>
                </span>
                <CheckCircle2 size={16} />
              </div>

              <div>
                <ClipboardPlus size={16} />
                <span>
                  <strong>Record treatment</strong>
                  <small>Crown surface saved</small>
                </span>
                <CheckCircle2 size={16} />
              </div>
            </div>
          </div>
        </div>

        <div className="dental-workflow-copy">
          <div className="dental-section-label">
            A faster clinical workflow
          </div>

          <h2>From observation to treatment planning, smoothly.</h2>

          <p>
            Record the right detail at the right time while keeping the chart
            easy for the whole clinic team to understand.
          </p>

          <div className="dental-workflow-steps">
            <div>
              <span>01</span>
              <p>
                <strong>Choose the tooth</strong>
                Select the relevant tooth directly from the odontogram.
              </p>
            </div>

            <div>
              <span>02</span>
              <p>
                <strong>Select the chart view</strong>
                Switch between existing conditions and planned treatment.
              </p>
            </div>

            <div>
              <span>03</span>
              <p>
                <strong>Record the detail</strong>
                Capture the surface, root profile, or treatment entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="dental-section dental-faq">
        <div className="dental-section-heading">
          <div className="dental-section-label">Questions</div>
          <h2>Good to know.</h2>
          <p>Some quick answers about Dental Charting.</p>
        </div>

        <div className="dental-faq-list">
          {faqs.map((faq, index) => (
            <div
              className={`dental-faq-item ${
                openFaq === index ? "open" : ""
              }`}
              key={faq.question}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenFaq(openFaq === index ? null : index)
                }
                aria-expanded={openFaq === index}
              >
                <span>{faq.question}</span>
                <ChevronDown size={19} />
              </button>

              {openFaq === index && (
                <div className="dental-faq-answer">
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="dental-final-cta">
        <div>
          <div className="dental-section-label">Ready when you are</div>

          <h2>Bring clarity to your dental charting workflow.</h2>

          <p>
            Review dentition, record treatment, and keep patient visits
            organised in one workspace.
          </p>
        </div>

        <button
          className="dental-primary-button light-button"
          onClick={handleGetStarted}
        >
          Sign Up
          <ArrowRight size={18} />
        </button>
      </section>

      <footer className="dental-footer">
        <a className="dental-brand" href="#top">
          <span className="dental-brand-mark">
            <Activity size={19} />
          </span>

          <span>
            Dental <strong>Charting</strong>
          </span>
        </a>

        <p>Clearer clinical charting for modern dental teams.</p>

        <div className="dental-footer-links">
          <a href="#features">Features</a>
          <a href="#workflow">How It Works</a>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
