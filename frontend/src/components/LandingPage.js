import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import './LandingPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function LandingPage({ onNavigateToLogin, onNavigateToSignup }) {
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showDPDPCompliance, setShowDPDPCompliance] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Static testimonials data (fallback when no reviews from API)
  const staticTestimonials = [
    {
      name: "Rajesh Kumar",
      role: "CA, Kumar & Associates",
      content: "NexInvo has transformed how we manage invoices for our clients. The GST compliance feature is exceptional.",
      rating: 5
    },
    {
      name: "Priya Sharma",
      role: "Freelance Designer",
      content: "Simple, professional invoices in minutes. My clients love the clean format and I love the payment tracking.",
      rating: 5
    },
    {
      name: "Amit Patel",
      role: "CEO, TechStart Solutions",
      content: "Managing multiple organizations from one dashboard is a game-changer. Highly recommended for agencies.",
      rating: 5
    }
  ];

  // Use customerReviews if available, otherwise static testimonials
  const displayTestimonials = customerReviews.length > 0 ? customerReviews : staticTestimonials;

  // Handle navbar scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsNavScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const testimonialsToUse = customerReviews.length > 0 ? customerReviews : staticTestimonials;
    if (testimonialsToUse.length === 0) return;

    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonialsToUse.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [customerReviews, staticTestimonials]);

  // Fetch subscription plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/subscription-plans/`);
        const activePlans = response.data
          .filter(plan => plan.is_active)
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        setSubscriptionPlans(activePlans);
      } catch (error) {
        console.error('Error fetching subscription plans:', error);
        setSubscriptionPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // Fetch customer reviews on mount
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/reviews/public/`);
        if (response.data.reviews && response.data.reviews.length > 0) {
          // Transform API reviews to match testimonials format
          const formattedReviews = response.data.reviews.map(review => ({
            name: review.display_name,
            role: review.designation ? `${review.designation}${review.company_name ? `, ${review.company_name}` : ''}` : (review.company_name || ''),
            content: review.content,
            title: review.title,
            rating: review.rating,
            profile_image: review.profile_image,
            is_featured: review.is_featured
          }));
          setCustomerReviews(formattedReviews);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, []);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const formatPrice = (price) => {
    const numPrice = parseFloat(price);
    if (numPrice === 0) return '0';
    return numPrice.toLocaleString('en-IN');
  };

  const getBillingPeriod = (plan) => {
    if (plan.billing_cycle === 'monthly') return '/month';
    if (plan.billing_cycle === 'yearly') return '/year';
    if (plan.billing_cycle === 'lifetime') return ' one-time';
    return `/${plan.billing_cycle || 'month'}`;
  };

  // Features data with icons
  const features = [
    {
      icon: "📄",
      title: "GST-Compliant Invoices",
      description: "Generate professional Tax and Proforma invoices with automatic CGST, SGST, IGST calculations.",
      color: "blue"
    },
    {
      icon: "💳",
      title: "Smart Payment Tracking",
      description: "Track payments, record receipts, manage TDS deductions, and send automated payment reminders.",
      color: "green"
    },
    {
      icon: "👥",
      title: "Client Management",
      description: "Maintain complete client database with GSTIN, PAN, contact details, and transaction history.",
      color: "purple"
    },
    {
      icon: "📊",
      title: "Comprehensive Reports",
      description: "Revenue analytics, GST summaries, TDS reports, outstanding aging, and Tally export.",
      color: "orange"
    },
    {
      icon: "🔄",
      title: "Scheduled Invoices",
      description: "Set up recurring invoices with flexible frequencies - daily, weekly, monthly, or yearly billing cycles.",
      color: "cyan"
    },
    {
      icon: "🔗",
      title: "Tally Integration",
      description: "Seamlessly sync invoices and receipts with Tally Prime for streamlined accounting workflows.",
      color: "indigo"
    },
    {
      icon: "🎨",
      title: "Invoice Format Editor",
      description: "Customize your invoice templates with logos, colors, and layouts to match your brand identity.",
      color: "pink"
    },
    {
      icon: "🏢",
      title: "Multi-Organization",
      description: "Manage multiple businesses with isolated data, role-based access, and team collaboration.",
      color: "violet"
    },
    {
      icon: "📧",
      title: "Email Integration",
      description: "Send invoices and receipts directly to clients with custom SMTP and branded emails.",
      color: "rose"
    },
    {
      icon: "🔒",
      title: "Bank-Grade Security",
      description: "Enterprise-level security with encrypted data, secure authentication, and regular backups.",
      color: "red"
    },
    {
      icon: "📱",
      title: "Mobile Responsive",
      description: "Access your invoices and reports from any device - desktop, tablet, or mobile.",
      color: "teal"
    }
  ];

  // Stats data - honest metrics for a growing platform
  const stats = [
    { number: "100%", label: "GST Compliant", icon: "✓" },
    { number: "24/7", label: "Cloud Access", icon: "☁️" },
    { number: "Secure", label: "Data Protection", icon: "🔒" },
    { number: "Free", label: "To Get Started", icon: "🚀" }
  ];

  if (showHelpCenter) {
    return <LandingHelpCenter onBack={() => setShowHelpCenter(false)} />;
  }

  if (showDPDPCompliance) {
    return <DPDPCompliancePage onBack={() => setShowDPDPCompliance(false)} />;
  }

  return (
    <div className="landing-page">
      {/* SEO Meta Tags */}
      <Helmet>
        <title>NexInvo - GST Invoice Management Software for Indian Businesses | Free Invoice Generator</title>
        <meta name="description" content="NexInvo is India's leading GST-compliant invoice management software. Create professional invoices, track payments, manage clients, and generate reports. Free to start!" />
        <meta name="keywords" content="invoice software, GST invoice, billing software India, invoice generator, payment tracking, GST billing, tax invoice software, proforma invoice, receipt management, accounting software India" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Chinmay Technosoft Private Limited" />
        <link rel="canonical" href="https://nexinvo.com" />

        {/* Open Graph Tags */}
        <meta property="og:title" content="NexInvo - Smart Invoice Management for Growing Businesses" />
        <meta property="og:description" content="Create GST-compliant invoices, track payments, and manage your business finances with NexInvo. Start free today!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://nexinvo.com" />
        <meta property="og:image" content="https://nexinvo.com/og-image.png" />
        <meta property="og:site_name" content="NexInvo" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NexInvo - GST Invoice Management Software" />
        <meta name="twitter:description" content="India's smartest invoice management solution. Create, send, and track invoices effortlessly." />
        <meta name="twitter:image" content="https://nexinvo.com/twitter-card.png" />

        {/* Schema.org Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "NexInvo",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "INR"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "500"
            },
            "description": "GST-compliant invoice management software for Indian businesses",
            "provider": {
              "@type": "Organization",
              "name": "Chinmay Technosoft Private Limited",
              "url": "https://nexinvo.com"
            }
          })}
        </script>
      </Helmet>

      {/* Navigation */}
      <nav className={`landing-nav ${isNavScrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/assets/NEXINVO_logo.png" alt="NexInvo Logo" style={{ height: '90px', width: 'auto', objectFit: 'contain', cursor: 'pointer', marginRight: '20px' }} />
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <button onClick={() => scrollToSection('features')}>Features</button>
            <button onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button onClick={() => scrollToSection('pricing')}>Pricing</button>
            <button onClick={() => scrollToSection('testimonials')}>Testimonials</button>
            <button onClick={() => scrollToSection('download')}>Download App</button>
            <button onClick={() => setShowHelpCenter(true)}>Help</button>
          </div>

          <div className="nav-actions">
            <button className="btn-login" onClick={onNavigateToLogin}>
              Log In
            </button>
            <button className="btn-signup" onClick={onNavigateToSignup}>
              Start Free
            </button>
          </div>

          <button
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-bg-pattern"></div>
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">🇮🇳</span>
              <span>Made for Indian Businesses</span>
            </div>
            <h1 className="hero-title">
              Smart Invoice Management for
              <span className="gradient-text"> Growing Businesses</span>
            </h1>
            <p className="hero-description">
              Create GST-compliant invoices, track payments, manage clients, and gain insights
              with powerful reports. Everything you need to run your business finances efficiently.
            </p>
            <div className="hero-cta">
              <button className="btn-primary-large" onClick={onNavigateToSignup}>
                <span>Get Started Free</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
              <button className="btn-secondary-large" onClick={() => scrollToSection('features')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10,8 16,12 10,16" fill="currentColor"/>
                </svg>
                <span>See Features</span>
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-avatars">
                <div className="avatar">RK</div>
                <div className="avatar">PS</div>
                <div className="avatar">AM</div>
                <div className="avatar">+</div>
              </div>
              <div className="trust-text">
                <div className="trust-stars">★★★★★</div>
                <span>Trusted by 500+ businesses across India</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-window">
                <div className="window-header">
                  <div className="window-dots">
                    <span className="dot red"></span>
                    <span className="dot yellow"></span>
                    <span className="dot green"></span>
                  </div>
                  <span className="window-title">NexInvo Dashboard</span>
                </div>
                <div className="window-content">
                  <div className="preview-sidebar">
                    <div className="sidebar-item active">📊 Dashboard</div>
                    <div className="sidebar-item">📄 Invoices</div>
                    <div className="sidebar-item">👥 Clients</div>
                    <div className="sidebar-item">💳 Receipts</div>
                  </div>
                  <div className="preview-main">
                    <div className="preview-stats">
                      <div className="stat-card blue">
                        <span className="stat-icon">📄</span>
                        <div className="stat-info">
                          <span className="stat-value">156</span>
                          <span className="stat-label">Invoices</span>
                        </div>
                      </div>
                      <div className="stat-card green">
                        <span className="stat-icon">💰</span>
                        <div className="stat-info">
                          <span className="stat-value">₹2.5L</span>
                          <span className="stat-label">Revenue</span>
                        </div>
                      </div>
                      <div className="stat-card purple">
                        <span className="stat-icon">👥</span>
                        <div className="stat-info">
                          <span className="stat-value">48</span>
                          <span className="stat-label">Clients</span>
                        </div>
                      </div>
                    </div>
                    <div className="preview-chart">
                      <div className="chart-bars">
                        <div className="bar" style={{height: '40%'}}></div>
                        <div className="bar" style={{height: '65%'}}></div>
                        <div className="bar" style={{height: '55%'}}></div>
                        <div className="bar" style={{height: '80%'}}></div>
                        <div className="bar" style={{height: '70%'}}></div>
                        <div className="bar" style={{height: '90%'}}></div>
                        <div className="bar active" style={{height: '85%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-card card-invoice">
                <div className="fc-icon">📄</div>
                <div className="fc-content">
                  <span className="fc-title">Invoice Sent!</span>
                  <span className="fc-sub">INV-2024-0156</span>
                </div>
              </div>
              <div className="floating-card card-payment">
                <div className="fc-icon">✅</div>
                <div className="fc-content">
                  <span className="fc-title">Payment Received</span>
                  <span className="fc-sub">₹45,000</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-container">
          {stats.map((stat, index) => (
            <div className="stat-item" key={index}>
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-number">{stat.number}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Everything You Need to Manage Your Business</h2>
            <p className="section-description">
              Powerful tools designed to save time, reduce errors, and help you get paid faster
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <article className="feature-card" key={index}>
                <div className={`feature-icon ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Simple Process</span>
            <h2 className="section-title">Get Started in Minutes</h2>
            <p className="section-description">
              Three simple steps to transform your invoicing workflow
            </p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <div className="step-icon">✨</div>
                <h3>Create Account</h3>
                <p>Sign up in 30 seconds with just your email. No credit card required to start.</p>
              </div>
            </div>
            <div className="step-connector">
              <svg viewBox="0 0 100 20" fill="none">
                <path d="M0 10h100" stroke="url(#connector-gradient)" strokeWidth="2" strokeDasharray="5,5"/>
                <defs>
                  <linearGradient id="connector-gradient" x1="0" y1="0" x2="100" y2="0">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <div className="step-icon">⚙️</div>
                <h3>Setup Business</h3>
                <p>Add your company details, logo, and configure GST settings in minutes.</p>
              </div>
            </div>
            <div className="step-connector">
              <svg viewBox="0 0 100 20" fill="none">
                <path d="M0 10h100" stroke="url(#connector-gradient2)" strokeWidth="2" strokeDasharray="5,5"/>
                <defs>
                  <linearGradient id="connector-gradient2" x1="0" y1="0" x2="100" y2="0">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <div className="step-icon">🚀</div>
                <h3>Start Invoicing</h3>
                <p>Create your first invoice and send it to clients in under 2 minutes.</p>
              </div>
            </div>
          </div>
          <div className="steps-cta">
            <button className="btn-primary-large" onClick={onNavigateToSignup}>
              Start Your Free Account
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" id="testimonials">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Testimonials</span>
            <h2 className="section-title">Loved by Businesses Across India</h2>
            <p className="section-description">
              See what our customers have to say about NexInvo
            </p>
          </div>
          {loadingReviews ? (
            <div className="testimonials-loading" style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="loading-spinner"></div>
              <p>Loading testimonials...</p>
            </div>
          ) : (
            <div className="testimonials-slider">
              <div className="testimonials-track" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
                {displayTestimonials.map((testimonial, index) => (
                  <div className="testimonial-card" key={index}>
                    {testimonial.is_featured && (
                      <div className="testimonial-featured-badge" style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        ⭐ Featured
                      </div>
                    )}
                    <div className="testimonial-rating">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                    {testimonial.title && (
                      <h4 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '8px',
                        textAlign: 'center'
                      }}>
                        "{testimonial.title}"
                      </h4>
                    )}
                    <blockquote className="testimonial-content">
                      "{testimonial.content}"
                    </blockquote>
                    <div className="testimonial-author">
                      {testimonial.profile_image ? (
                        <img
                          src={testimonial.profile_image}
                          alt={testimonial.name}
                          className="author-avatar"
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div className="author-avatar">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="author-info">
                        <span className="author-name">{testimonial.name}</span>
                        {testimonial.role && <span className="author-role">{testimonial.role}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="testimonials-dots">
                {displayTestimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`dot ${activeTestimonial === index ? 'active' : ''}`}
                    onClick={() => setActiveTestimonial(index)}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" id="pricing">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Pricing</span>
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-description">
              Start free and upgrade as your business grows. No hidden fees.
            </p>
          </div>
          <div className="pricing-grid">
            {loadingPlans ? (
              <div className="pricing-loading">
                <div className="loading-spinner"></div>
                <p>Loading plans...</p>
              </div>
            ) : subscriptionPlans.length > 0 ? (
              subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`pricing-card ${plan.highlight ? 'popular' : ''}`}
                >
                  {plan.highlight && (
                    <div className="popular-badge">Most Popular</div>
                  )}
                  <div className="pricing-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <div className="plan-price">
                      <span className="currency">₹</span>
                      <span className="amount">{formatPrice(plan.price)}</span>
                      <span className="period">{getBillingPeriod(plan)}</span>
                    </div>
                  </div>
                  <ul className="plan-features">
                    <li>
                      <span className="check">✓</span>
                      {plan.max_invoices_per_month === -1 ? 'Unlimited Invoices' : `${plan.max_invoices_per_month} Invoices/month`}
                    </li>
                    <li>
                      <span className="check">✓</span>
                      {plan.max_users === -1 ? 'Unlimited Users' : `${plan.max_users} Users`}
                    </li>
                    <li>
                      <span className="check">✓</span>
                      {plan.max_organizations === -1 ? 'Unlimited Organizations' : `${plan.max_organizations} Organization${plan.max_organizations > 1 ? 's' : ''}`}
                    </li>
                    <li>
                      <span className="check">✓</span>
                      {plan.max_storage_gb === -1 ? 'Unlimited Storage' : `${plan.max_storage_gb} GB Storage`}
                    </li>
                    {plan.trial_days > 0 && (
                      <li>
                        <span className="check">✓</span>
                        {plan.trial_days} Days Free Trial
                      </li>
                    )}
                    {plan.features && plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx}>
                        <span className="check">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`btn-plan ${plan.highlight ? 'primary' : 'secondary'}`}
                    onClick={onNavigateToSignup}
                  >
                    {parseFloat(plan.price) === 0 ? 'Get Started Free' : 'Start Free Trial'}
                  </button>
                </div>
              ))
            ) : (
              <div className="pricing-empty">
                <div className="empty-icon">📋</div>
                <h3>Pricing Plans Coming Soon</h3>
                <p>We're preparing our subscription plans. Sign up now to get notified!</p>
                <button className="btn-primary" onClick={onNavigateToSignup}>
                  Sign Up for Updates
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="faq-preview-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">FAQ</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>Is NexInvo GST compliant?</h4>
              <p>Yes, NexInvo is fully GST compliant. It automatically calculates CGST, SGST, and IGST based on business locations.</p>
            </div>
            <div className="faq-item">
              <h4>Can I try NexInvo for free?</h4>
              <p>Absolutely! Our free plan includes essential features to get you started. No credit card required.</p>
            </div>
            <div className="faq-item">
              <h4>Is my data secure?</h4>
              <p>Yes, we use bank-grade encryption and security practices. Your data is stored securely with regular backups.</p>
            </div>
            <div className="faq-item">
              <h4>Can I export to Tally?</h4>
              <p>Yes, NexInvo provides export functionality for Tally Prime in XML and Excel formats.</p>
            </div>
          </div>
          <div className="faq-cta">
            <button onClick={() => setShowHelpCenter(true)} className="btn-text">
              View All FAQs <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="download-app-section" id="download">
        <div className="section-container">
          <div className="download-content">
            <div className="download-info">
              <span className="section-badge">Mobile App</span>
              <h2 className="section-title">Take NexInvo Everywhere</h2>
              <p className="section-description">
                Manage your invoices on the go with our Android mobile app. Create invoices,
                track payments, and manage clients from your smartphone.
              </p>
              <div className="download-features">
                <div className="download-feature">
                  <span className="df-icon">📱</span>
                  <span>Native Android App</span>
                </div>
                <div className="download-feature">
                  <span className="df-icon">🔄</span>
                  <span>Real-time Sync</span>
                </div>
                <div className="download-feature">
                  <span className="df-icon">📴</span>
                  <span>Works Offline</span>
                </div>
                <div className="download-feature">
                  <span className="df-icon">🔒</span>
                  <span>Secure & Fast</span>
                </div>
              </div>
              <div className="download-buttons">
                <a
                  href="https://expo.dev/accounts/himanshu83/projects/nexinvo/builds/45f3c360-7934-453f-a286-d27f492aab56"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-download-primary"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="download-icon">
                    <path d="M17.523 15.341l-.001-.002c-.215.136-.447.254-.696.35-.677.262-1.484.32-2.281.32h-5.09c-.797 0-1.604-.058-2.281-.32a3.017 3.017 0 01-.696-.35l-.001.002L3 18.819V21c0 1.105.895 2 2 2h14c1.105 0 2-.895 2-2v-2.181l-3.477-3.478zM18 4H6C4.895 4 4 4.895 4 6v10.586l2.293-2.293a1 1 0 011.414 0l.002.001c.131.084.29.166.478.239.481.186 1.131.267 1.813.267h4c.682 0 1.332-.081 1.813-.267.188-.073.347-.155.478-.239l.002-.001a1 1 0 011.414 0L20 16.586V6c0-1.105-.895-2-2-2z"/>
                    <path d="M12 14a1 1 0 01-.707-.293l-3-3a1 1 0 111.414-1.414L11 10.586V7a1 1 0 112 0v3.586l1.293-1.293a1 1 0 111.414 1.414l-3 3A1 1 0 0112 14z"/>
                  </svg>
                  <div className="btn-download-text">
                    <span className="download-label">Download for</span>
                    <span className="download-platform">Android</span>
                  </div>
                </a>
                <div className="coming-soon-badge">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="apple-icon">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <span>iOS Coming Soon</span>
                </div>
              </div>
              <p className="download-note">
                * Requires Android 8.0 or higher. iOS version is under development.
              </p>
            </div>
            <div className="download-visual">
              <div className="phone-mockup">
                <div className="phone-frame">
                  <div className="phone-notch"></div>
                  <div className="phone-screen">
                    <div className="app-preview">
                      <div className="app-header">
                        <span className="app-logo">NexInvo</span>
                        <span className="app-menu">☰</span>
                      </div>
                      <div className="app-stats">
                        <div className="app-stat">
                          <span className="app-stat-value">₹2.5L</span>
                          <span className="app-stat-label">Revenue</span>
                        </div>
                        <div className="app-stat">
                          <span className="app-stat-value">156</span>
                          <span className="app-stat-label">Invoices</span>
                        </div>
                      </div>
                      <div className="app-quick-actions">
                        <div className="app-action">📄 New Invoice</div>
                        <div className="app-action">👥 Add Client</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="phone-glow"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to Streamline Your Invoicing?</h2>
            <p>Join thousands of Indian businesses using NexInvo to manage their finances efficiently.</p>
            <div className="cta-buttons">
              <button className="btn-cta-primary" onClick={onNavigateToSignup}>
                Start Your Free Account
              </button>
              <button className="btn-cta-secondary" onClick={onNavigateToLogin}>
                Login to Dashboard
              </button>
            </div>
          </div>
          <div className="cta-features">
            <div className="cta-feature">
              <span className="cf-icon">✓</span>
              <span>No credit card required</span>
            </div>
            <div className="cta-feature">
              <span className="cf-icon">✓</span>
              <span>Free forever plan available</span>
            </div>
            <div className="cta-feature">
              <span className="cf-icon">✓</span>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <div className="footer-logo">
                <img src="/assets/NEXINVO_logo.png" alt="NexInvo Logo" style={{ height: '70px', width: 'auto', objectFit: 'contain', maxWidth: '280px' }} />
              </div>
              <p className="footer-tagline">
                Modern invoice management for growing Indian businesses. GST-compliant, secure, and easy to use.
              </p>
              <div className="footer-social">
                <a href="#" aria-label="Twitter" className="social-link">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" aria-label="LinkedIn" className="social-link">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <button onClick={() => scrollToSection('features')}>Features</button>
                <button onClick={() => scrollToSection('pricing')}>Pricing</button>
                <button onClick={() => scrollToSection('how-it-works')}>How It Works</button>
                <button onClick={() => setShowHelpCenter(true)}>Help Center</button>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <a href="#about">About Us</a>
                <a href="#contact">Contact</a>
                <a href="#careers">Careers</a>
                <a href="#blog">Blog</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
                <button onClick={() => setShowDPDPCompliance(true)}>DPDP Compliance</button>
              </div>
              <div className="footer-column">
                <h4>Support</h4>
                <a href="mailto:chinmaytechsoft@gmail.com">chinmaytechsoft@gmail.com</a>
                <span className="support-hours">Mon-Fri, 9AM-6PM IST</span>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} Chinmay Technosoft Private Limited. All rights reserved.</p>
            <div className="footer-badges">
              <span className="badge">🇮🇳 Made in India</span>
              <span className="badge">🔒 SSL Secured</span>
              <span className="badge">✓ GST Compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Landing Help Center Component (keeping existing implementation)
function LandingHelpCenter({ onBack }) {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sections = [
    { id: 'quick-start', title: 'Quick Start', icon: '⚡' },
    { id: 'getting-started', title: 'Getting Started', icon: '🚀' },
    { id: 'features-overview', title: 'Features Overview', icon: '✨' },
    { id: 'invoices', title: 'Creating Invoices', icon: '📄' },
    { id: 'payments', title: 'Payment Tracking', icon: '💳' },
    { id: 'clients', title: 'Client Management', icon: '👥' },
    { id: 'reports', title: 'Reports', icon: '📈' },
    { id: 'pricing-plans', title: 'Pricing & Plans', icon: '💰' },
    { id: 'faq', title: 'FAQ', icon: '❓' },
  ];

  const filteredSections = sections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'quick-start':
        return <QuickStartSection />;
      case 'getting-started':
        return <GettingStartedSection />;
      case 'features-overview':
        return <FeaturesOverviewSection />;
      case 'invoices':
        return <InvoicesSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'clients':
        return <ClientsSection />;
      case 'reports':
        return <ReportsSection />;
      case 'pricing-plans':
        return <PricingPlansSection />;
      case 'faq':
        return <FaqSection expandedFaq={expandedFaq} toggleFaq={toggleFaq} />;
      default:
        return <QuickStartSection />;
    }
  };

  return (
    <div className="landing-help-center">
      <Helmet>
        <title>Help Center - NexInvo | GST Invoice Software Guide</title>
        <meta name="description" content="Learn how to use NexInvo - India's leading GST invoice management software. Guides for invoicing, payments, clients, and reports." />
      </Helmet>

      <div className="help-header">
        <div className="help-header-content">
          <div className="help-logo-section">
            <button className="back-btn" onClick={onBack}>
              ← Back to Home
            </button>
            <div className="help-logo-icon">📖</div>
            <div>
              <h1>NexInvo Help Center</h1>
              <p className="help-subtitle">Complete Guide to Invoice Management</p>
            </div>
          </div>
          <div className="help-header-meta">
            <span className="version-badge">Version 1.0</span>
            <p>GST Compliant • India</p>
          </div>
        </div>
      </div>

      <div className="help-container">
        <aside className="help-sidebar">
          <div className="help-search">
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="help-search-input"
            />
            <span className="help-search-icon">🔍</span>
          </div>

          <nav className="help-toc">
            <h3 className="toc-title">Contents</h3>
            <ul className="toc-list">
              {filteredSections.map((section, index) => (
                <li key={section.id}>
                  <button
                    className={`toc-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="toc-number">{index + 1}</span>
                    <span className="toc-icon">{section.icon}</span>
                    <span className="toc-text">{section.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="help-content">
          {renderContent()}
        </main>
      </div>

      <footer className="help-footer">
        <div className="help-footer-content">
          <h3>Need More Help?</h3>
          <p>Email: <a href="mailto:chinmaytechsoft@gmail.com">chinmaytechsoft@gmail.com</a></p>
          <p>Response Time: Within 24-48 hours</p>
        </div>
      </footer>
    </div>
  );
}

// Help Center Section Components
function QuickStartSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">⚡</div>
        <div>
          <h2>Quick Start Guide</h2>
          <p className="section-subtitle">Get up and running with NexInvo in minutes</p>
        </div>
      </div>
      <div className="process-diagram">
        <div className="process-step"><div className="process-icon">✓</div><span className="process-label">Register</span></div>
        <div className="process-connector"></div>
        <div className="process-step"><div className="process-icon">⚙️</div><span className="process-label">Setup</span></div>
        <div className="process-connector"></div>
        <div className="process-step"><div className="process-icon">👥</div><span className="process-label">Add Clients</span></div>
        <div className="process-connector"></div>
        <div className="process-step"><div className="process-icon">📄</div><span className="process-label">Create Invoice</span></div>
        <div className="process-connector"></div>
        <div className="process-step"><div className="process-icon">💰</div><span className="process-label">Get Paid</span></div>
      </div>
      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Pro Tip</h5>
          <p>Complete your company settings before creating your first invoice for GST compliance and professional-looking invoices.</p>
        </div>
      </div>
      <h3>What You Can Do With NexInvo</h3>
      <ul className="feature-list">
        <li>Create professional GST-compliant invoices (Proforma & Tax)</li>
        <li>Manage your client database with complete details</li>
        <li>Track payments and generate receipts automatically</li>
        <li>Generate comprehensive business reports</li>
        <li>Send invoices directly via email</li>
        <li>Export data to Tally Prime</li>
        <li>Manage multiple organizations</li>
      </ul>
    </section>
  );
}

function GettingStartedSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">🚀</div>
        <div>
          <h2>Getting Started</h2>
          <p className="section-subtitle">Create your account and begin invoicing</p>
        </div>
      </div>
      <h3>Registration Steps</h3>
      <ol className="steps">
        <li>Click on <strong>"Sign Up Free"</strong> button</li>
        <li>Enter your email address and verify with OTP</li>
        <li>Fill in your personal details (Name, Mobile, Company)</li>
        <li>Create a strong password</li>
        <li>Accept the Terms of Service and Privacy Policy</li>
        <li>Click <strong>"Create Account"</strong> - You're ready to go!</li>
      </ol>
      <h3>After Registration</h3>
      <ol className="steps">
        <li>Complete your company information in Settings</li>
        <li>Add your company logo</li>
        <li>Configure invoice numbering</li>
        <li>Set up email settings for sending invoices</li>
        <li>Add your first client</li>
        <li>Create your first invoice</li>
      </ol>
      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Free Plan Includes</h5>
          <p>Start with our free plan which includes essential features. Upgrade anytime as your business grows.</p>
        </div>
      </div>
    </section>
  );
}

function FeaturesOverviewSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">✨</div>
        <div>
          <h2>Features Overview</h2>
          <p className="section-subtitle">Discover what NexInvo can do for your business</p>
        </div>
      </div>
      <div className="feature-grid">
        <div className="feature-card"><div className="feature-card-icon blue">📄</div><h5>Invoice Management</h5><p>Create Proforma and Tax Invoices with GST compliance</p></div>
        <div className="feature-card"><div className="feature-card-icon green">💰</div><h5>Payment Tracking</h5><p>Track receipts, TDS deductions, and pending payments</p></div>
        <div className="feature-card"><div className="feature-card-icon purple">👥</div><h5>Client Database</h5><p>Manage client details, GST info, and history</p></div>
        <div className="feature-card"><div className="feature-card-icon orange">📊</div><h5>Business Reports</h5><p>Revenue, GST, TDS, and outstanding reports</p></div>
        <div className="feature-card"><div className="feature-card-icon indigo">🏢</div><h5>Multi-Organization</h5><p>Manage multiple businesses from one account</p></div>
        <div className="feature-card"><div className="feature-card-icon pink">📧</div><h5>Email Integration</h5><p>Send invoices and receipts directly to clients</p></div>
      </div>
    </section>
  );
}

function InvoicesSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📄</div>
        <div>
          <h2>Creating Invoices</h2>
          <p className="section-subtitle">Generate professional GST-compliant invoices</p>
        </div>
      </div>
      <h3>Invoice Types</h3>
      <div className="feature-grid two-col">
        <div className="feature-card"><div className="feature-card-icon orange">📋</div><h5>Proforma Invoice</h5><p>For quotations and estimates before confirming orders. Can be converted to Tax Invoice.</p></div>
        <div className="feature-card"><div className="feature-card-icon blue">📄</div><h5>Tax Invoice</h5><p>Official GST-compliant invoice for payment and accounting purposes.</p></div>
      </div>
      <h3>Creating an Invoice</h3>
      <ol className="steps">
        <li>Navigate to <strong>Invoices</strong> section</li>
        <li>Click <strong>"Create Invoice"</strong></li>
        <li>Select invoice type (Proforma or Tax)</li>
        <li>Choose the client from your database</li>
        <li>Add line items with quantities and rates</li>
        <li>GST is calculated automatically based on settings</li>
        <li>Review and save the invoice</li>
        <li>Download PDF or send via email</li>
      </ol>
      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Auto-Calculations</h5>
          <p>NexInvo automatically calculates subtotals, GST (CGST, SGST, IGST), and grand totals based on your settings and client location.</p>
        </div>
      </div>
    </section>
  );
}

function PaymentsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💳</div>
        <div>
          <h2>Payment Tracking</h2>
          <p className="section-subtitle">Track receipts and manage outstanding payments</p>
        </div>
      </div>
      <h3>Recording a Receipt</h3>
      <ol className="steps">
        <li>Navigate to <strong>Receipts</strong> section</li>
        <li>Click <strong>"Record Receipt"</strong></li>
        <li>Select the unpaid invoice</li>
        <li>Enter receipt amount and payment method</li>
        <li>Add TDS details if applicable</li>
        <li>Save the receipt - it's automatically generated!</li>
      </ol>
      <h3>TDS Deduction</h3>
      <p>When your client deducts TDS (Tax Deducted at Source), you can record it:</p>
      <ul className="feature-list">
        <li>Enter the TDS percentage or amount</li>
        <li>System calculates net amount received</li>
        <li>Both Income Tax TDS and GST TDS supported</li>
        <li>TDS Summary report available for reconciliation</li>
      </ul>
      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Partial Payments</h5>
          <p>You can record multiple partial receipts against a single invoice. The invoice status automatically updates to "Paid" when fully settled.</p>
        </div>
      </div>
    </section>
  );
}

function ClientsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">👥</div>
        <div>
          <h2>Client Management</h2>
          <p className="section-subtitle">Maintain your client database</p>
        </div>
      </div>
      <h3>Adding a New Client</h3>
      <ol className="steps">
        <li>Go to <strong>Clients</strong> section</li>
        <li>Click <strong>"Add Client"</strong></li>
        <li>Enter basic details: Name, Email, Mobile</li>
        <li>Add address: Street, City, State, PIN Code</li>
        <li>Add tax details: GSTIN, PAN</li>
        <li>Save the client</li>
      </ol>
      <h3>Client Information</h3>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Field</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>Client Name</td><td>Full legal name of the client/company</td></tr>
            <tr><td>Client Code</td><td>Unique identifier (auto-generated if blank)</td></tr>
            <tr><td>Email</td><td>For sending invoices and receipts</td></tr>
            <tr><td>GSTIN</td><td>15-digit GST number for B2B invoices</td></tr>
            <tr><td>PAN</td><td>10-character PAN for TDS purposes</td></tr>
            <tr><td>State</td><td>Determines CGST/SGST vs IGST</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">📈</div>
        <div>
          <h2>Reports</h2>
          <p className="section-subtitle">Comprehensive business analytics</p>
        </div>
      </div>
      <h3>Available Reports</h3>
      <div className="feature-grid">
        <div className="feature-card"><div className="feature-card-icon green">💰</div><h5>Revenue Report</h5><p>Total revenue with date-wise breakdown</p></div>
        <div className="feature-card"><div className="feature-card-icon orange">⚠️</div><h5>Outstanding Report</h5><p>Pending payments with aging analysis</p></div>
        <div className="feature-card"><div className="feature-card-icon red">📋</div><h5>GST Summary</h5><p>CGST, SGST, IGST breakdown</p></div>
        <div className="feature-card"><div className="feature-card-icon blue">👤</div><h5>Client-wise Report</h5><p>Revenue grouped by client</p></div>
        <div className="feature-card"><div className="feature-card-icon purple">💳</div><h5>Receipt Report</h5><p>All payment transactions</p></div>
        <div className="feature-card"><div className="feature-card-icon indigo">📊</div><h5>TDS Summary</h5><p>Income Tax and GST TDS deducted</p></div>
      </div>
      <div className="info-box tip">
        <div className="info-box-icon">💡</div>
        <div className="info-box-content">
          <h5>Export Options</h5>
          <p>All reports can be exported to PDF or Excel. You can also export data to Tally Prime for seamless accounting integration.</p>
        </div>
      </div>
    </section>
  );
}

function PricingPlansSection() {
  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">💰</div>
        <div>
          <h2>Pricing & Plans</h2>
          <p className="section-subtitle">Choose the plan that fits your needs</p>
        </div>
      </div>
      <h3>Plan Comparison</h3>
      <p>NexInvo offers flexible pricing plans to suit businesses of all sizes:</p>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>Feature</th><th>Free Trial</th><th>Professional</th></tr></thead>
          <tbody>
            <tr><td>Price</td><td>₹0</td><td>₹2,000/month + GST</td></tr>
            <tr><td>Invoices/Month</td><td>50</td><td>5,000</td></tr>
            <tr><td>Users</td><td>1</td><td>3</td></tr>
            <tr><td>Organizations</td><td>1</td><td>10</td></tr>
            <tr><td>Scheduled Invoices</td><td>✓</td><td>✓</td></tr>
            <tr><td>Tally Integration</td><td>✓</td><td>✓</td></tr>
            <tr><td>Invoice Format Editor</td><td>✓</td><td>✓</td></tr>
            <tr><td>Email Support</td><td>✓</td><td>✓</td></tr>
            <tr><td>Dedicated Support</td><td>-</td><td>✓</td></tr>
            <tr><td>API Access</td><td colspan="2" style={{textAlign: 'center', fontStyle: 'italic'}}>Coming Soon</td></tr>
          </tbody>
        </table>
      </div>
      <h3>Upgrading Your Plan</h3>
      <ol className="steps">
        <li>Login to your NexInvo account</li>
        <li>Go to <strong>My Subscription</strong> or <strong>Upgrade Plan</strong></li>
        <li>Compare available plans</li>
        <li>Select the plan you want</li>
        <li>Complete the payment process</li>
        <li>Your new features are available immediately!</li>
      </ol>
      <div className="info-box note">
        <div className="info-box-icon">📝</div>
        <div className="info-box-content">
          <h5>Coupon Codes</h5>
          <p>Have a coupon code? You can apply it during checkout to get discounts on your subscription.</p>
        </div>
      </div>
    </section>
  );
}

function FaqSection({ expandedFaq, toggleFaq }) {
  const faqs = [
    { question: "Is NexInvo GST compliant?", answer: "Yes, NexInvo is fully GST compliant. It automatically calculates CGST, SGST, and IGST based on your business and client locations." },
    { question: "Can I try NexInvo for free?", answer: "Yes! We offer a free plan with essential features. You can create up to 10 invoices per month, manage clients, and generate basic reports." },
    { question: "How do I send invoices to my clients?", answer: "You can download invoices as PDF and share manually, or configure email settings to send invoices directly from NexInvo." },
    { question: "Can I track TDS deductions?", answer: "Yes, NexInvo supports both Income Tax TDS and GST TDS tracking. When recording receipts, you can enter TDS details and the system calculates net amounts automatically." },
    { question: "Can multiple users access the same account?", answer: "Yes, depending on your plan. Professional plan allows up to 5 users, and Enterprise offers unlimited users with role-based access control." },
    { question: "Can I manage multiple businesses?", answer: "Yes, NexInvo supports multi-organization management. You can create and switch between different organizations from a single account." },
    { question: "Is my data secure?", answer: "Yes, we use industry-standard encryption and security practices. Your data is stored securely and backed up regularly." },
    { question: "Can I export data to Tally?", answer: "Yes, NexInvo provides export functionality for Tally Prime. You can export invoices and receipts in XML or Excel format." }
  ];

  return (
    <section className="help-section">
      <div className="section-header">
        <div className="section-icon">❓</div>
        <div>
          <h2>Frequently Asked Questions</h2>
          <p className="section-subtitle">Quick answers to common questions</p>
        </div>
      </div>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div key={index} className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}>
            <button className="faq-question" onClick={() => toggleFaq(index)}>
              <span className="faq-q-icon">Q</span>
              <span className="faq-q-text">{faq.question}</span>
              <span className="faq-toggle">{expandedFaq === index ? '−' : '+'}</span>
            </button>
            {expandedFaq === index && (
              <div className="faq-answer">
                <span className="faq-a-icon">A</span>
                <span>{faq.answer}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// DPDP Compliance Page Component
function DPDPCompliancePage({ onBack }) {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="landing-help-center dpdp-compliance-page">
      <Helmet>
        <title>DPDP Compliance - NexInvo | Digital Personal Data Protection Act 2023</title>
        <meta name="description" content="Learn about NexInvo's compliance with India's Digital Personal Data Protection Act (DPDP) 2023. Our commitment to protecting your personal data." />
      </Helmet>

      <div className="help-header">
        <div className="help-header-content">
          <div className="help-logo-section">
            <button className="back-btn" onClick={onBack}>
              ← Back to Home
            </button>
            <div className="help-logo-icon">🔒</div>
            <div>
              <h1>DPDP Compliance</h1>
              <p className="help-subtitle">Digital Personal Data Protection Act, 2023</p>
            </div>
          </div>
          <div className="help-header-meta">
            <span className="version-badge">Last Updated: December 2024</span>
            <p>NexInvo by Chinmay Technosoft</p>
          </div>
        </div>
      </div>

      <div className="help-container">
        <aside className="help-sidebar">
          <nav className="help-toc">
            <h3 className="toc-title">Contents</h3>
            <ul className="toc-list">
              <li><a href="#overview" className="toc-item"><span className="toc-number">1</span><span className="toc-text">Overview</span></a></li>
              <li><a href="#data-collected" className="toc-item"><span className="toc-number">2</span><span className="toc-text">Data We Collect</span></a></li>
              <li><a href="#purpose" className="toc-item"><span className="toc-number">3</span><span className="toc-text">Purpose of Processing</span></a></li>
              <li><a href="#consent" className="toc-item"><span className="toc-number">4</span><span className="toc-text">Consent Management</span></a></li>
              <li><a href="#rights" className="toc-item"><span className="toc-number">5</span><span className="toc-text">Your Rights</span></a></li>
              <li><a href="#security" className="toc-item"><span className="toc-number">6</span><span className="toc-text">Data Security</span></a></li>
              <li><a href="#retention" className="toc-item"><span className="toc-number">7</span><span className="toc-text">Data Retention</span></a></li>
              <li><a href="#grievance" className="toc-item"><span className="toc-number">8</span><span className="toc-text">Grievance Redressal</span></a></li>
              <li><a href="#contact" className="toc-item"><span className="toc-number">9</span><span className="toc-text">Contact Us</span></a></li>
            </ul>
          </nav>
        </aside>

        <main className="help-content">
          {/* Overview Section */}
          <section className="help-section" id="overview">
            <div className="section-header">
              <div className="section-icon">📋</div>
              <div>
                <h2>Overview</h2>
                <p className="section-subtitle">Our Commitment to Data Protection</p>
              </div>
            </div>
            <p>
              NexInvo, operated by <strong>Chinmay Technosoft Private Limited</strong>, is committed to protecting the privacy and personal data of our users in compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India.
            </p>
            <p>
              This document outlines how we collect, process, store, and protect your personal data when you use our GST-compliant invoice management platform.
            </p>
            <div className="info-box note">
              <div className="info-box-icon">📜</div>
              <div className="info-box-content">
                <h5>DPDP Act 2023</h5>
                <p>The Digital Personal Data Protection Act, 2023 establishes a comprehensive framework for processing digital personal data in India, balancing individual rights with legitimate business needs.</p>
              </div>
            </div>
          </section>

          {/* Data Collected Section */}
          <section className="help-section" id="data-collected">
            <div className="section-header">
              <div className="section-icon">📊</div>
              <div>
                <h2>Data We Collect</h2>
                <p className="section-subtitle">Personal data processed through NexInvo</p>
              </div>
            </div>

            <h3>User Account Data</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Data Type</th><th>Purpose</th><th>Retention</th></tr>
                </thead>
                <tbody>
                  <tr><td>Full Name</td><td>Account identification & invoices</td><td>Account lifetime</td></tr>
                  <tr><td>Email Address</td><td>Authentication, notifications, invoice delivery</td><td>Account lifetime</td></tr>
                  <tr><td>Mobile Number</td><td>OTP verification, account recovery</td><td>Account lifetime</td></tr>
                  <tr><td>Password (encrypted)</td><td>Secure authentication</td><td>Account lifetime</td></tr>
                </tbody>
              </table>
            </div>

            <h3>Organization/Business Data</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Data Type</th><th>Purpose</th><th>Retention</th></tr>
                </thead>
                <tbody>
                  <tr><td>Company Name</td><td>Invoice generation</td><td>Account lifetime</td></tr>
                  <tr><td>GSTIN</td><td>GST compliance on invoices</td><td>Account lifetime</td></tr>
                  <tr><td>PAN</td><td>Tax compliance, TDS tracking</td><td>Account lifetime</td></tr>
                  <tr><td>Business Address</td><td>Invoice headers, GST calculations</td><td>Account lifetime</td></tr>
                  <tr><td>Bank Details</td><td>Payment information on invoices</td><td>Account lifetime</td></tr>
                  <tr><td>Company Logo</td><td>Invoice branding</td><td>Account lifetime</td></tr>
                </tbody>
              </table>
            </div>

            <h3>Client Data (Stored by Users)</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Data Type</th><th>Purpose</th><th>Retention</th></tr>
                </thead>
                <tbody>
                  <tr><td>Client Name & Contact</td><td>Invoice generation</td><td>User-controlled</td></tr>
                  <tr><td>Client GSTIN/PAN</td><td>Tax compliance</td><td>User-controlled</td></tr>
                  <tr><td>Client Address</td><td>Invoice delivery, GST calculations</td><td>User-controlled</td></tr>
                  <tr><td>Email Address</td><td>Invoice delivery</td><td>User-controlled</td></tr>
                </tbody>
              </table>
            </div>

            <div className="info-box tip">
              <div className="info-box-icon">💡</div>
              <div className="info-box-content">
                <h5>Data Minimization</h5>
                <p>We only collect data that is necessary for providing our invoice management services. We do not collect unnecessary personal information.</p>
              </div>
            </div>
          </section>

          {/* Purpose Section */}
          <section className="help-section" id="purpose">
            <div className="section-header">
              <div className="section-icon">🎯</div>
              <div>
                <h2>Purpose of Processing</h2>
                <p className="section-subtitle">Why we process your personal data</p>
              </div>
            </div>

            <p>We process your personal data for the following lawful purposes:</p>

            <ul className="feature-list">
              <li><strong>Service Delivery:</strong> To provide invoice management, receipt generation, and reporting services</li>
              <li><strong>GST Compliance:</strong> To generate GST-compliant Tax Invoices and Proforma Invoices</li>
              <li><strong>Payment Tracking:</strong> To record receipts, track payments, and manage TDS deductions</li>
              <li><strong>Email Communications:</strong> To send invoices and receipts to your clients on your behalf</li>
              <li><strong>Account Security:</strong> To authenticate users and protect against unauthorized access</li>
              <li><strong>Reports & Analytics:</strong> To generate business reports (revenue, GST summary, outstanding amounts)</li>
              <li><strong>Service Improvement:</strong> To improve our platform based on usage patterns</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws including GST Act and IT Act</li>
            </ul>
          </section>

          {/* Consent Section */}
          <section className="help-section" id="consent">
            <div className="section-header">
              <div className="section-icon">✅</div>
              <div>
                <h2>Consent Management</h2>
                <p className="section-subtitle">How we obtain and manage your consent</p>
              </div>
            </div>

            <h3>Obtaining Consent</h3>
            <p>We obtain your consent in the following ways:</p>
            <ol className="steps">
              <li><strong>Registration:</strong> By creating an account, you consent to our data processing for service delivery</li>
              <li><strong>Terms Acceptance:</strong> You explicitly accept our Terms of Service and Privacy Policy</li>
              <li><strong>Email Verification:</strong> OTP verification confirms your email ownership</li>
              <li><strong>Feature-Specific:</strong> Additional consent for optional features like email sending</li>
            </ol>

            <h3>Withdrawing Consent</h3>
            <p>You can withdraw your consent at any time by:</p>
            <ul className="feature-list">
              <li>Deleting your account through the Settings page</li>
              <li>Contacting our support team to request data deletion</li>
              <li>Disabling specific features in your account settings</li>
            </ul>

            <div className="info-box warning">
              <div className="info-box-icon">⚠️</div>
              <div className="info-box-content">
                <h5>Impact of Withdrawal</h5>
                <p>Withdrawing consent may affect your ability to use certain features. Some data may be retained for legal compliance (e.g., tax records as per GST regulations).</p>
              </div>
            </div>
          </section>

          {/* Rights Section */}
          <section className="help-section" id="rights">
            <div className="section-header">
              <div className="section-icon">⚖️</div>
              <div>
                <h2>Your Rights Under DPDP Act</h2>
                <p className="section-subtitle">Data Principal Rights</p>
              </div>
            </div>

            <p>As a Data Principal under the DPDP Act, 2023, you have the following rights:</p>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-card-icon blue">📄</div>
                <h5>Right to Access</h5>
                <p>Request a summary of your personal data and processing activities</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon green">✏️</div>
                <h5>Right to Correction</h5>
                <p>Request correction of inaccurate or incomplete personal data</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon red">🗑️</div>
                <h5>Right to Erasure</h5>
                <p>Request deletion of your personal data (subject to legal requirements)</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon purple">📤</div>
                <h5>Right to Portability</h5>
                <p>Export your data in machine-readable formats (Excel, PDF)</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon orange">🔔</div>
                <h5>Right to Information</h5>
                <p>Know what data is collected and how it is processed</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon indigo">⚖️</div>
                <h5>Right to Grievance</h5>
                <p>Lodge complaints regarding data processing activities</p>
              </div>
            </div>

            <h3>How to Exercise Your Rights</h3>
            <ol className="steps">
              <li>Log in to your NexInvo account</li>
              <li>Navigate to <strong>Settings</strong> section</li>
              <li>Use available options to view, edit, export, or delete your data</li>
              <li>For additional requests, contact our Data Protection Officer</li>
            </ol>
          </section>

          {/* Security Section */}
          <section className="help-section" id="security">
            <div className="section-header">
              <div className="section-icon">🛡️</div>
              <div>
                <h2>Data Security Measures</h2>
                <p className="section-subtitle">How we protect your data</p>
              </div>
            </div>

            <p>We implement robust security measures to protect your personal data:</p>

            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-card-icon blue">🔐</div>
                <h5>Encryption</h5>
                <p>All data is encrypted in transit (HTTPS/TLS) and sensitive data at rest</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon green">🔑</div>
                <h5>Secure Authentication</h5>
                <p>JWT tokens, password hashing (bcrypt), and OTP verification</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon purple">🏢</div>
                <h5>Multi-Tenant Isolation</h5>
                <p>Organization data is completely isolated from other users</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon orange">👥</div>
                <h5>Role-Based Access</h5>
                <p>Granular permissions (Owner, Admin, User, Viewer)</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon red">📝</div>
                <h5>Audit Logging</h5>
                <p>All data access and modifications are logged</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon indigo">💾</div>
                <h5>Regular Backups</h5>
                <p>Automated backups to prevent data loss</p>
              </div>
            </div>

            <div className="info-box tip">
              <div className="info-box-icon">🔒</div>
              <div className="info-box-content">
                <h5>IT Act Compliance</h5>
                <p>NexInvo complies with the Information Technology Act, 2000 (as amended in 2008) and follows reasonable security practices as per IS/ISO/IEC 27001 standards.</p>
              </div>
            </div>
          </section>

          {/* Retention Section */}
          <section className="help-section" id="retention">
            <div className="section-header">
              <div className="section-icon">📅</div>
              <div>
                <h2>Data Retention Policy</h2>
                <p className="section-subtitle">How long we keep your data</p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Data Category</th><th>Retention Period</th><th>Reason</th></tr>
                </thead>
                <tbody>
                  <tr><td>Account Information</td><td>Until account deletion</td><td>Service provision</td></tr>
                  <tr><td>Invoices & Receipts</td><td>8 years after creation</td><td>GST compliance (6 years + 2 buffer)</td></tr>
                  <tr><td>Payment Records</td><td>8 years after transaction</td><td>Tax compliance</td></tr>
                  <tr><td>Audit Logs</td><td>3 years</td><td>Security & compliance</td></tr>
                  <tr><td>Email Logs</td><td>1 year</td><td>Delivery confirmation</td></tr>
                  <tr><td>Session Data</td><td>24 hours after logout</td><td>Security</td></tr>
                </tbody>
              </table>
            </div>

            <h3>Post-Deletion Retention</h3>
            <p>After account deletion, we may retain:</p>
            <ul className="feature-list">
              <li>Invoice and receipt data for GST compliance (as required by law)</li>
              <li>Anonymized data for analytics (no personal identifiers)</li>
              <li>Backup data for up to 30 days (automatically purged)</li>
            </ul>
          </section>

          {/* Grievance Section */}
          <section className="help-section" id="grievance">
            <div className="section-header">
              <div className="section-icon">📢</div>
              <div>
                <h2>Grievance Redressal</h2>
                <p className="section-subtitle">How to raise concerns about your data</p>
              </div>
            </div>

            <p>If you have any concerns about how your personal data is being processed, you can raise a grievance through the following channels:</p>

            <h3>Step 1: Contact Support</h3>
            <p>For general queries or concerns, contact our support team:</p>
            <ul className="feature-list">
              <li>Email: <a href="mailto:chinmaytechsoft@gmail.com">chinmaytechsoft@gmail.com</a></li>
              <li>Response Time: Within 48 hours</li>
            </ul>

            <h3>Step 2: Data Protection Officer</h3>
            <p>For formal grievances related to personal data processing:</p>
            <div className="info-box note">
              <div className="info-box-icon">👤</div>
              <div className="info-box-content">
                <h5>Data Protection Officer</h5>
                <p><strong>Chinmay Technosoft Private Limited</strong><br/>
                Email: chinmaytechsoft@gmail.com<br/>
                Response Time: Within 7 working days</p>
              </div>
            </div>

            <h3>Step 3: Data Protection Board</h3>
            <p>If your grievance is not resolved satisfactorily, you may approach the Data Protection Board of India as established under the DPDP Act, 2023.</p>
          </section>

          {/* Contact Section */}
          <section className="help-section" id="contact">
            <div className="section-header">
              <div className="section-icon">📞</div>
              <div>
                <h2>Contact Us</h2>
                <p className="section-subtitle">Get in touch for data protection queries</p>
              </div>
            </div>

            <div className="info-box tip">
              <div className="info-box-icon">🏢</div>
              <div className="info-box-content">
                <h5>Chinmay Technosoft Private Limited</h5>
                <p>
                  <strong>Email:</strong> chinmaytechsoft@gmail.com<br/>
                  <strong>Website:</strong> https://nexinvo.com<br/>
                  <strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM IST
                </p>
              </div>
            </div>

            <p style={{marginTop: '24px', fontSize: '14px', color: '#64748b'}}>
              This DPDP Compliance document is subject to updates. We recommend checking this page periodically for any changes. Continued use of NexInvo after updates constitutes acceptance of the revised terms.
            </p>
          </section>
        </main>
      </div>

      <footer className="help-footer">
        <div className="help-footer-content">
          <h3>Committed to Your Privacy</h3>
          <p>NexInvo respects your data rights under the DPDP Act, 2023</p>
          <p>Email: <a href="mailto:chinmaytechsoft@gmail.com">chinmaytechsoft@gmail.com</a></p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
