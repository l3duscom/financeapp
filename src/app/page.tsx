import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wallet,
  ArrowRight,
  BarChart3,
  Target,
  Calculator,
  Bell,
  CreditCard,
  PieChart,
  Shield,
  Zap,
  Star,
  Check,
} from 'lucide-react';
import styles from './landing.module.css';

export const metadata: Metadata = {
  title: 'FinanceApp - Controle suas finanças de verdade',
  description:
    'O gerenciador financeiro pessoal mais completo do Brasil. Controle gastos, crie metas, simule investimentos e receba alertas automáticos.',
};

const features = [
  {
    icon: BarChart3,
    title: 'Dashboard Inteligente',
    desc: 'Visualize receitas, despesas e saldo em tempo real com gráficos interativos.',
    color: '#6366f1',
  },
  {
    icon: PieChart,
    title: 'Orçamento por Categoria',
    desc: 'Defina limites de gastos e receba alertas quando estiver próximo do estouro.',
    color: '#8b5cf6',
  },
  {
    icon: Target,
    title: 'Metas Financeiras',
    desc: 'Crie metas com prazo, acompanhe o progresso e saiba quanto precisa poupar por mês.',
    color: '#10b981',
  },
  {
    icon: Calculator,
    title: 'Simulador de Investimentos',
    desc: 'Simule juros compostos e projete o crescimento do seu patrimônio ao longo dos anos.',
    color: '#3b82f6',
  },
  {
    icon: CreditCard,
    title: 'Upload de Faturas',
    desc: 'Envie faturas de cartão de crédito em PDF ou imagem para organizar seus gastos.',
    color: '#f59e0b',
  },
  {
    icon: Bell,
    title: 'Alertas Automáticos',
    desc: 'Receba notificações inteligentes sobre estouros, metas e padrões de gastos.',
    color: '#ef4444',
  },
];

const plans = [
  {
    name: 'Mensal',
    price: 'R$ 19,90',
    period: '/mês',
    features: [
      'Transações ilimitadas',
      'Orçamento por categoria',
      'Metas financeiras',
      'Simulador de investimentos',
      'Upload de faturas',
      'Relatórios completos',
    ],
    highlight: false,
  },
  {
    name: 'Anual',
    price: 'R$ 149,90',
    period: '/ano',
    badge: 'Economize 37%',
    features: [
      'Tudo do plano mensal',
      'Transações ilimitadas',
      'Orçamento por categoria',
      'Metas financeiras',
      'Simulador de investimentos',
      'Upload de faturas',
      'Relatórios completos',
      'Suporte prioritário',
    ],
    highlight: true,
  },
];

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <Wallet size={24} />
            <span>Finance<span className={styles.logoAccent}>App</span></span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Recursos</a>
            <a href="#pricing">Planos</a>
            <Link href="/login" className={styles.navCta}>
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Zap size={14} />
            Planejador financeiro completo
          </div>
          <h1 className={styles.heroTitle}>
            Controle suas finanças
            <span className={styles.heroGradient}> de verdade</span>
          </h1>
          <p className={styles.heroDesc}>
            O gerenciador financeiro pessoal mais completo. Organize gastos, crie metas,
            simule investimentos e receba alertas automáticos — tudo em um único app.
          </p>
          <div className={styles.heroCtas}>
            <a href="#pricing" className={styles.ctaPrimary}>
              Começar agora
              <ArrowRight size={18} />
            </a>
            <a href="#features" className={styles.ctaSecondary}>
              Ver recursos
            </a>
          </div>
          <div className={styles.heroTrust}>
            <div className={styles.trustStars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
              ))}
            </div>
            <span>Usado por milhares de brasileiros</span>
          </div>
        </div>
        <div className={styles.heroGlow} />
      </section>

      {/* Features */}
      <section className={styles.features} id="features">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Tudo que você precisa</h2>
          <p className={styles.sectionDesc}>
            Ferramentas poderosas para tomar o controle da sua vida financeira.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className={styles.featureCard}>
                <div className={styles.featureIcon} style={{ backgroundColor: `${f.color}15`, color: f.color }}>
                  <Icon size={22} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Benefits */}
      <section className={styles.benefits}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Por que escolher o FinanceApp?</h2>
        </div>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitItem}>
            <Shield size={24} color="#6366f1" />
            <h3>100% Seguro</h3>
            <p>Seus dados são protegidos com criptografia de ponta a ponta via Firebase.</p>
          </div>
          <div className={styles.benefitItem}>
            <Zap size={24} color="#f59e0b" />
            <h3>Rápido e Intuitivo</h3>
            <p>Interface premium pensada para mobile. Adicione transações em segundos.</p>
          </div>
          <div className={styles.benefitItem}>
            <BarChart3 size={24} color="#10b981" />
            <h3>Insights Reais</h3>
            <p>Gráficos e relatórios que mostram para onde vai seu dinheiro de verdade.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Planos simples e acessíveis</h2>
          <p className={styles.sectionDesc}>
            Invista menos do que um café por dia para controlar suas finanças.
          </p>
        </div>
        <div className={styles.pricingGrid}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.pricingCard} ${plan.highlight ? styles.pricingHighlight : ''}`}
            >
              {plan.badge && (
                <div className={styles.pricingBadge}>{plan.badge}</div>
              )}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceValue}>{plan.price}</span>
                <span className={styles.pricePeriod}>{plan.period}</span>
              </div>
              <ul className={styles.planFeatures}>
                {plan.features.map((feat) => (
                  <li key={feat}>
                    <Check size={16} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={plan.highlight ? styles.planCtaPrimary : styles.planCtaSecondary}
              >
                Assinar agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <h2>Pronto para organizar suas finanças?</h2>
        <p>Comece agora e tenha controle total do seu dinheiro.</p>
        <Link href="/login" className={styles.ctaPrimary}>
          Começar agora
          <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Wallet size={20} />
            <span>Finance<span className={styles.logoAccent}>App</span></span>
          </div>
          <p className={styles.footerText}>
            © 2026 FinanceApp. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
