import responsiveSources from "./responsive-image-sources.json";

export const image = (name: string) =>
  `/assets/framerusercontent.com/images/${name}`;

export const logoMarks = [
  "HNITySCsALpfjqvC2qqxgh4.svg",
  "eB4qXqarj9TerjRVA9nZYvwIIzA.svg",
  "m7lwKDtPyMDOaEcrbrulPXOAyk.svg",
  "tHl7iA6m1wE1eZ4MQ5hmF7Q8iAQ.svg",
  "Vn5F6IlsE8FfO3pgiCnJG9Q6Sj0.svg",
].map(image);

export const checkBenefits = [
  "Setup in Seconds",
  "No Credit Card",
  "Cancel anytime",
];

export const financeFeatures = [
  {
    eyebrow: "Real-Time Financial Overview",
    title: "Stay in Control with Live Financial Visibility",
    description:
      "Monitor your cash flow, spending, and income as it happens—with real-time dashboards that update instantly across your accounts.",
    image: image(responsiveSources.features[0]),
    points: [
      ["Live Dashboard Sync", "See up-to-the-minute financial activity across all linked accounts in one unified view."],
      ["Real-Time Cash Flow Tracking", "Instantly track inflows and outflows so you always know your burn rate and runway."],
      ["Multi-Account Visibility", "View balances and transactions from all your bank accounts, wallets, and platforms—no toggling needed."],
      ["Smart Categorization", "Automatically group transactions by type, project, or team for clearer insights."],
      ["Custom Alerts & Thresholds", "Get notified when spending spikes, income hits, or balances dip—no surprises."],
      ["Performance Snapshots", "See daily, weekly, and monthly financial health at a glance with clean visual summaries."],
    ],
  },
  {
    eyebrow: "Automated Billing & Payments",
    title: "Simplify Cash Flow with Smart Billing Automation",
    description:
      "Automate invoices, track payment status, and get paid faster—without the manual work.",
    image: image(responsiveSources.features[1]),
    points: [
      ["Recurring Invoices", "Set it once and let it run—automatically send invoices on a weekly, monthly, or custom schedule."],
      ["Auto-Payment Reminders", "Send friendly reminders to clients before and after due dates to ensure faster payments."],
      ["One-Click Payment Links", "Attach secure payment links to every invoice so clients can pay instantly via card or bank transfer."],
      ["Real-Time Payment Tracking", "Track when invoices are sent, viewed, and paid—all from a centralized dashboard."],
      ["Custom Branding", "Personalize invoices with your logo, colors, and tone to keep things consistent and professional."],
      ["Payment Status Notifications", "Stay in the loop with alerts for overdue, pending, or completed payments—automatically."],
    ],
  },
  {
    eyebrow: "Insightful Analytics",
    title: "Turn Data Into Decisions, Instantly",
    description:
      "Unlock powerful, easy-to-read financial insights to help you plan smarter, spend better, and grow faster.",
    image: image(responsiveSources.features[2]),
    points: [
      ["Real-Time Reports", "Access automatically updated reports that reflect your current financial health—no manual updates needed."],
      ["Cash Flow Forecasting", "Predict future income and expenses based on trends, payment history, and your business patterns."],
      ["Visual Dashboards", "See key metrics like revenue, expenses, profit, and burn rate in beautifully designed charts and graphs."],
      ["Custom Report Builder", "Generate tailored reports by project, team, or date range—perfect for internal reviews or investors."],
      ["Goal-Based Insights", "Track progress toward financial goals and receive data-driven tips to optimize performance."],
      ["Export & Share", "Download or share reports in one click—ready for teams, clients, or accounting partners."],
    ],
  },
  {
    eyebrow: "Budget Planning",
    title: "Plan with Precision, Spend with Confidence",
    description:
      "Create, monitor, and adjust budgets easily—so you stay on track and in control, no matter how fast you grow.",
    image: image(responsiveSources.features[3]),
    points: [
      ["Smart Budget Templates", "Start quickly with pre-built templates tailored for projects, departments, or recurring expenses."],
      ["Flexible Budget Categories", "Customize categories to match your unique financial structure—track what matters most to you."],
      ["Real-Time Budget Tracking", "See actual spend vs. planned budget in real time, with clear visuals and automatic updates."],
      ["Overspend Alerts", "Get instant alerts when you approach or exceed your budget—so there are no surprises at month-end."],
      ["Collaborative Planning", "Assign budgets to teams or individuals and track accountability across your organization."],
      ["Historical Budget Insights", "Analyze past budgets to improve forecasting and make more informed future decisions."],
    ],
  },
  {
    eyebrow: "Seamless Integrations",
    title: "Connect Your Financial Ecosystem in One Click",
    description:
      "Easily sync with your favorite tools—so your data flows smoothly and your workflow stays connected.",
    image: image(responsiveSources.features[4]),
    points: [
      ["One-Click Integrations", "Quickly connect with banks, accounting tools, payment platforms, and CRMs—no coding needed."],
      ["Real-Time Syncing", "Data updates automatically across all connected platforms to keep everything accurate and current."],
      ["Popular Tools Supported", "Integrate with tools like Stripe, QuickBooks, Xero, PayPal, Wise, and more."],
      ["API Access for Custom Needs", "Use our robust API to build custom workflows or connect internal systems seamlessly."],
      ["Unified Dashboard View", "See all your financial data—across all integrations—in one clean, central dashboard."],
      ["Secure & Compliant", "Every integration is backed by enterprise-grade encryption and strict security protocols."],
    ],
  },
] as const;

export const workflowSteps = [
  {
    number: "01",
    title: "Create Your Account",
    description: "Sign up in minutes with a simple, guided setup—no complicated forms or extra steps.",
    panel: "signup",
  },
  {
    number: "02",
    title: "Connect Your Financial Tools",
    description: "Securely link your bank accounts, payment platforms, and favorite apps for automatic syncing.",
    panel: "card",
  },
  {
    number: "03",
    title: "Track & Manage Effortlessly",
    description: "Monitor transactions, invoices, budgets, and expenses from one simple, real-time dashboard.",
    panel: "dashboard",
  },
  {
    number: "04",
    title: "Get Smart Financial Insights",
    description: "Access real-time reports and personalized analytics to make smarter, faster business decisions.",
    panel: "insights",
  },
] as const;

export const testimonials = [
  {
    quote: '"This platform has completely changed how we handle our finances. It’s fast, intuitive, and saves us hours every week."',
    name: "Alex T.",
    role: "Operations Manager",
    avatar: image("4bOcANXkLvuv2IZNjOZruPTFVTA.jpg"),
  },
  {
    quote: '"I love how everything is automated. From invoicing to reporting, it just works—flawlessly. It feels like having a finance team in my pocket."',
    name: "Nadine L.",
    role: "Founder & CEO",
    avatar: image("nH8UngonHGpnGKkd9wKaWu20qk8.jpg"),
  },
  {
    quote: '"Everything is in one place. The clean dashboard and smart reports help me explain numbers to the team with zero confusion."',
    name: "Sinta R.",
    role: "Finance Lead",
    avatar: image("DxZcVuSqP6CUtNP0xHCsgSd8SQ.jpg"),
  },
  {
    quote: '"I’ve tried a lot of tools, but this one finally gives me clarity. The real-time insights are a game changer for planning and growth."',
    name: "Marco D.",
    role: "Freelance Consultant",
    avatar: image("VKW7AWRna4bKkm72oWIthi8UmI0.jpg"),
  },
] as const;

export const pricingFaqs = [
  ["Do I need to enter a credit card to start the free trial?", "Nope! You can explore all features on our Growth plan for 7 days without entering payment details."],
  ["Can I cancel my subscription anytime?", "Yes. You can cancel or change your subscription from your account settings at any time."],
  ["Is my financial data secure?", "Yes. Artho uses encryption, secure infrastructure, and strict access controls to protect your data."],
  ["What happens when my trial ends?", "You can choose a paid plan to keep your workspace active. We never charge you without confirmation."],
  ["Can I switch plans later?", "Yes. You can upgrade or downgrade as your team and workflow change."],
  ["Do you offer support if I get stuck?", "Yes. Every plan includes support, with priority assistance on the Growth and Business plans."],
] as const;

export const faqGroups = [
  {
    title: "Getting Started",
    description: "Everything you need to set up your account and start managing your finances with ease. From connecting your bank to customizing your dashboard, we’ll guide you step-by-step.",
    questions: [
      "How do I create an account?",
      "What should I do first after signing up?",
      "How do I connect my bank or payment tools?",
      "Can I import financial data from other tools?",
      "How do I invite team members?",
      "Is there a tutorial or onboarding guide?",
    ],
  },
  {
    title: "Billing & Subscriptions",
    description: "Everything you need to manage your plan, payments, invoices, and subscription settings. Whether you're upgrading, canceling, or just curious about how billing works, you'll find answers here.",
    questions: [
      "How does the free trial work?",
      "How do I upgrade or downgrade my plan?",
      "What happens when my free trial ends?",
      "Can I cancel my subscription at any time?",
      "How do I access my invoices or receipts?",
      "Is my payment information secure?",
    ],
  },
  {
    title: "Features & Tools",
    description: "Learn how to get the most out of your dashboard, reports, budgeting tools, and automation features. This section will guide you through everything from setting up smart workflows to understanding real-time insights.",
    questions: [
      "What is the real-time dashboard and how does it work?",
      "How do I create and manage a budget?",
      "Can I automate invoices and payments?",
      "What types of financial reports are available?",
      "Is there a way to set financial goals?",
      "How can I collaborate with my team?",
    ],
  },
  {
    title: "Integrations",
    description: "Connect your favorite tools and platforms in just a few clicks. From payment processors to accounting software, our integrations help keep your workflow smooth, synced, and effortless.",
    questions: [
      "What tools can I integrate with the platform?",
      "How do I set up an integration?",
      "How often is data synced with my connected tools?",
      "Can I disconnect or change an integration later?",
      "Do you support custom integrations?",
      "Are integrations secure?",
    ],
  },
  {
    title: "Security & Privacy",
    description: "Short Description: We take your security seriously. From data encryption to privacy controls, this section explains how we protect your financial information and keep your account safe.",
    questions: [
      "How is my financial data protected?",
      "Are you compliant with global data protection laws?",
      "Do you store my bank login credentials?",
      "Is two-factor authentication available?",
      "Who has access to my financial data?",
      "What should I do if I suspect suspicious activity?",
    ],
  },
] as const;
