"use client";

import Link from "next/link";
import { useState } from "react";

export function LandingPage() {
  // Estado para a seção "Qual plano é pra mim?"
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);

  const getPlanResult = () => {
    if (!q1 || !q2) return null;

    if (q1 === "1") {
      return {
        plan: "Essencial ou Profissional",
        desc: "Se você tem até 30 pratos no cardápio, o <strong>Essencial</strong> (R$ 49/mês) resolve. Se já tem mais pratos ou quer várias pessoas da equipe acessando, vá de <strong>Profissional</strong> (R$ 99/mês).",
        emoji: "🍽️",
      };
    } else if (q1 === "2-3" && q2 === "same") {
      return {
        plan: "Profissional",
        desc: "Uma única assinatura de <strong>R$ 99/mês</strong> atende todas as suas unidades. Como o cardápio e os fornecedores são iguais, a ficha técnica é centralizada e vale pra todas as lojas.",
        emoji: "🎯",
      };
    } else if (q1 === "2-3" && q2 === "different") {
      return {
        plan: "Rede",
        desc: "Como cada unidade tem particularidade própria, o <strong>Rede</strong> é o ideal. Base de R$ 1.000/mês + R$ 49,90 por unidade adicional. Inclui onboarding, treinamento e gerente de conta.",
        emoji: "🏪",
      };
    } else if (q1 === "4+") {
      return {
        plan: "Rede",
        desc: "Com 4+ unidades, o <strong>Rede</strong> é a escolha certa. Consolidação de resultados, comparativo de CMV entre lojas, onboarding assistido e WhatsApp direto com gerente de conta.",
        emoji: "🏢",
      };
    } else {
      return {
        plan: "Essencial ou Profissional",
        desc: "Com só 1 operação, o plano <strong>Profissional</strong> cobre tudo que você precisa. Se cardápio for enxuto (até 30 pratos), o <strong>Essencial</strong> também resolve.",
        emoji: "🍽️",
      };
    }
  };

  const result = getPlanResult();

  return (
    <div className="font-body text-ink-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-ink-200 py-2.5">
        <div className="container-page flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center">
            <img src="/logo.jpg" alt="Logo" className="h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex gap-8 items-center">
            <a href="#features" className="text-sm font-medium text-ink-700 hover:text-orange-600 transition-colors">Funcionalidades</a>
            <a href="#how" className="text-sm font-medium text-ink-700 hover:text-orange-600 transition-colors">Como funciona</a>
            <a href="#plans" className="text-sm font-medium text-ink-700 hover:text-orange-600 transition-colors">Planos</a>
            <a href="#faq" className="text-sm font-medium text-ink-700 hover:text-orange-600 transition-colors">Perguntas</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-blue-800">Entrar</Link>
            <Link href="/registro" className="btn-primary py-2.5 px-4 text-xs">Teste grátis</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-20 pb-28 relative">
        <div className="container-page grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-orange-50 border border-orange-100 rounded-full text-xs font-semibold text-orange-800 tracking-wider mb-6">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse"></span>
              PRECIFICAÇÃO INTELIGENTE PARA GASTRONOMIA
            </div>
            <h1 className="font-display font-bold text-[clamp(42px,5.5vw,68px)] leading-[1.02] tracking-tight text-blue-900 mb-5">
              Descubra quanto <span className="italic text-orange-600 relative whitespace-nowrap after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-2 after:bg-[url('data:image/svg+xml,%3Csvg_xmlns=\'http://www.w3.org/2000/svg\'_viewBox=\'0_0_200_8\'_preserveAspectRatio=\'none\'%3E%3Cpath_d=\'M2,6_Q50,1_100,4_T198,5\'_stroke=\'%23FF6B00\'_stroke-width=\'2.5\'_fill=\'none\'_stroke-linecap=\'round\'_opacity=\'0.4\'/%3E%3C/svg%3E')] after:bg-center after:bg-cover after:bg-no-repeat">realmente</span> custa cada prato do seu cardápio.
            </h1>
            <p className="text-[19px] leading-relaxed text-ink-600 max-w-[540px] mb-8">
              Ficha técnica, controle de CMV e precificação com margem garantida. Pare de precificar no &quot;achismo&quot; e comece a lucrar em cada venda.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link href="/registro" className="btn-primary text-base px-7 py-4">Comece grátis por 14 dias →</Link>
              <a href="#how" className="btn-ghost text-base px-7 py-4">Ver como funciona</a>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-ink-500">
              <div className="flex">
                <div className="w-7 h-7 rounded-full border-2 border-paper flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-blue-700 to-blue-500">MC</div>
                <div className="w-7 h-7 rounded-full border-2 border-paper -ml-2 flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-orange-600 to-orange-300">JL</div>
                <div className="w-7 h-7 rounded-full border-2 border-paper -ml-2 flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-blue-800 to-orange-700">AR</div>
                <div className="w-7 h-7 rounded-full border-2 border-paper -ml-2 flex items-center justify-center text-[11px] font-bold text-white bg-gradient-to-br from-[#6B9B7B] to-orange-500">+</div>
              </div>
              <span>Usado por chefs, bares e confeitarias no Brasil inteiro.</span>
            </div>
          </div>

          <div className="relative md:order-last order-first">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-ink-200 relative -rotate-[0.5deg] transition-transform duration-400 hover:rotate-0 hover:scale-[1.02]">
              <div className="bg-blue-900 px-3.5 py-2.5 flex gap-1.5 items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
                <div className="ml-3 bg-white/10 px-3 py-1 rounded font-mono text-[11px] text-white/70">custodereceita.com.br/dashboard</div>
              </div>
              <div className="p-5 bg-paper">
                <div className="flex justify-between items-start mb-4.5">
                  <div>
                    <h4 className="font-display font-semibold text-lg text-blue-900 mb-0.5">Visão geral</h4>
                    <p className="text-[11px] text-ink-500">Outubro · 128 pratos cadastrados</p>
                  </div>
                  <span className="bg-success-bg text-success text-[10px] px-2.5 py-1 rounded-full font-semibold">AO VIVO</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mb-4.5">
                  <div className="bg-white border border-ink-200 rounded-md p-3">
                    <div className="text-[10px] text-ink-500 font-semibold tracking-wider uppercase mb-1">CMV médio</div>
                    <div className="font-mono font-semibold text-[17px] text-blue-900">31,2%</div>
                    <div className="text-[10px] font-semibold text-success mt-0.5">↓ 2,4 pp vs mês anterior</div>
                  </div>
                  <div className="bg-white border border-ink-200 rounded-md p-3">
                    <div className="text-[10px] text-ink-500 font-semibold tracking-wider uppercase mb-1">Margem</div>
                    <div className="font-mono font-semibold text-[17px] text-blue-900">42,8%</div>
                    <div className="text-[10px] font-semibold text-success mt-0.5">↑ R$ 2.340</div>
                  </div>
                  <div className="bg-white border border-ink-200 rounded-md p-3">
                    <div className="text-[10px] text-ink-500 font-semibold tracking-wider uppercase mb-1">Ticket</div>
                    <div className="font-mono font-semibold text-[17px] text-blue-900">R$ 58</div>
                    <div className="text-[10px] font-semibold text-success mt-0.5">↑ 8,1%</div>
                  </div>
                </div>
                <div className="bg-white border border-ink-200 rounded-md p-3.5">
                  <div className="flex justify-between mb-3 text-[12px] text-ink-700 font-semibold">
                    <span>Custo por prato · top 5</span>
                    <span className="text-ink-400 font-normal text-[11px]">últimos 30 dias</span>
                  </div>
                  <svg viewBox="0 0 320 100" width="100%" height="90">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF6B00"/>
                        <stop offset="100%" stopColor="#FF8533"/>
                      </linearGradient>
                    </defs>
                    <rect x="10" y="45" width="40" height="45" rx="3" fill="url(#barGrad)"/>
                    <rect x="70" y="30" width="40" height="60" rx="3" fill="url(#barGrad)"/>
                    <rect x="130" y="20" width="40" height="70" rx="3" fill="url(#barGrad)"/>
                    <rect x="190" y="55" width="40" height="35" rx="3" fill="#004A99"/>
                    <rect x="250" y="38" width="40" height="52" rx="3" fill="#004A99"/>
                    <text x="30" y="98" textAnchor="middle" fontFamily="Manrope" fontSize="8" fill="#A39F96">Risoto</text>
                    <text x="90" y="98" textAnchor="middle" fontFamily="Manrope" fontSize="8" fill="#A39F96">Picanha</text>
                    <text x="150" y="98" textAnchor="middle" fontFamily="Manrope" fontSize="8" fill="#A39F96">Linguine</text>
                    <text x="210" y="98" textAnchor="middle" fontFamily="Manrope" fontSize="8" fill="#A39F96">Salada</text>
                    <text x="270" y="98" textAnchor="middle" fontFamily="Manrope" fontSize="8" fill="#A39F96">Bruschetta</text>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-7 -left-9 bg-white px-4 py-3.5 rounded-2xl shadow-lg border border-ink-200 flex items-center gap-3 -rotate-3 transition-transform duration-300 hover:rotate-0">
              <div className="w-10 h-10 bg-success-bg rounded-full flex items-center justify-center text-xl">💰</div>
              <div className="leading-tight">
                <div className="text-[10px] text-ink-500 font-semibold uppercase tracking-widest">LUCRO ESTE MÊS</div>
                <div className="font-mono text-base font-semibold text-success">+R$ 14.290</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="py-10 border-y border-dashed border-ink-300">
        <div className="container-page">
          <div className="text-center text-[11px] font-semibold text-ink-500 tracking-[0.15em] uppercase mb-5">Para todo tipo de operação gastronômica</div>
          <div className="flex justify-center items-center gap-14 flex-wrap opacity-60">
            <span className="font-display font-bold text-lg text-ink-600 tracking-tight italic">Osteria</span>
            <span className="font-mono text-sm tracking-widest uppercase text-ink-600 font-bold">BURGER CO.</span>
            <span className="font-display font-bold text-lg text-ink-600 tracking-tight">Doce Alinhado</span>
            <span className="font-display font-bold text-lg text-ink-600 tracking-tight italic">Trattoria</span>
            <span className="font-mono text-sm tracking-widest uppercase text-ink-600 font-bold">DARK KITCHEN</span>
            <span className="font-display font-bold text-lg text-ink-600 tracking-tight">Boteco Real</span>
          </div>
        </div>
      </div>

      {/* PROBLEM */}
      <section id="problema" className="py-24 bg-ink-100 relative">
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-16">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">O problema</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">A conta fecha, mas <em className="italic text-orange-600">o lucro não aparece.</em></h2>
            <p className="text-lg text-ink-500 leading-relaxed max-w-[620px] mx-auto">Restaurante lotado não significa restaurante lucrativo. A maioria dos negócios gastronômicos fecha por uma razão silenciosa: precificação errada e CMV fora de controle.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              { stat: "70%", title: "fecham em 5 anos", desc: "A maior parte dos restaurantes brasileiros encerra as atividades antes do quinto ano por falta de gestão financeira adequada." },
              { stat: "38%", title: "de CMV médio", desc: "Muito acima dos 30% ideais. Cada ponto percentual a mais de CMV reduz diretamente a margem líquida do negócio." },
              { stat: "R$ 0", title: "de ficha técnica", desc: "8 em cada 10 pequenos restaurantes não têm ficha técnica atualizada. Precificam no olho, no feeling, e torram margem sem saber." },
              { stat: "+20%", title: "de insumos em 12 meses", desc: "Preços de insumos sobem toda semana. Quem não atualiza o custo dos pratos está vendendo mais barato do que deveria." }
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-7 border-l-[3px] border-error">
                <div className="font-display font-black text-[40px] leading-none text-error mb-2.5 tracking-tight">{item.stat}</div>
                <h4 className="font-body font-bold text-base text-ink-800 mb-2">{item.title}</h4>
                <p className="text-sm text-ink-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24">
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-16">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">A SOLUÇÃO</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">Tudo que você precisa para <em className="italic text-orange-600">precificar com confiança.</em></h2>
            <p className="text-lg text-ink-500 leading-relaxed max-w-[620px] mx-auto">Um sistema pensado para a realidade de quem gerencia restaurantes, bares, cafeterias e cozinhas no Brasil.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {[
              // { title: "Ficha técnica digital", desc: "Cadastre seus insumos uma vez e monte fichas de qualquer prato em minutos. Rendimento, perdas, tempo de preparo — tudo registrado.", icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/> },
              { title: "CMV em tempo real", desc: "Veja seu custo de mercadoria vendida atualizado automaticamente. Prato a prato, categoria a categoria, cardápio inteiro.", icon: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></> },
              { title: "Termômetro de preço", desc: "Defina sua margem-alvo e o sistema indica se o preço de venda está certo, alto ou baixo. Decisão na mesa, na hora.", icon: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></> },
              { title: "Categorias e grupos", desc: "Organize pratos por categoria, consulte CMV por grupo, identifique quais famílias de produtos dão mais lucro.", icon: <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></> },
              { title: "Importação de planilhas", desc: "Tem uma planilha de ingredientes? Importe em 1 clique. Não começa do zero — aproveita o que você já tem.", icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></> },
              { title: "Atualização automática", desc: "Subiu o preço do tomate? Atualize o insumo uma vez e todos os pratos que o usam recalculam o custo na hora.", icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></> }
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-ink-200 transition-all duration-250 hover:-translate-y-1 hover:border-orange-100 hover:shadow-lg group">
                <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center mb-5 ${i % 2 === 0 ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                </div>
                <h3 className="font-display font-semibold text-xl text-ink-900 mb-2.5 tracking-tight">{f.title}</h3>
                <p className="text-ink-500 text-[14.5px] leading-[1.55]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-blue-900 text-white relative overflow-hidden">
        <div className="absolute -right-[200px] -top-[200px] w-[600px] h-[600px] bg-[radial-gradient(circle,var(--color-orange-600)_0%,transparent_60%)] opacity-15 pointer-events-none"></div>
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-16 relative z-10">
            <div className="inline-block font-mono text-xs font-semibold text-orange-500 tracking-[0.15em] uppercase mb-3">Como funciona</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-white mb-4">Do caos à <em className="italic text-orange-600">clareza</em> em três passos.</h2>
            <p className="text-lg text-white/70 leading-relaxed max-w-[620px] mx-auto">Você começa hoje. Em menos de uma semana, tem todo o cardápio sob controle.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 mt-12 relative z-10">
            {[
              { n: "01", title: "Cadastre seus insumos", desc: "Adicione ingredientes com preço atual, unidade de medida e fornecedor. Importe de planilha ou cadastre um a um. Ilimitado em qualquer plano." },
              { n: "02", title: "Monte as fichas técnicas", desc: "Crie a ficha de cada prato com ingredientes, rendimento e fator de correção. O custo aparece automaticamente na tela." },
              { n: "03", title: "Precifique com lucro", desc: "Use o termômetro de preço, defina sua margem-alvo e descubra exatamente quanto cada prato contribui para o lucro do negócio." }
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <div className="font-display font-black text-[88px] leading-none text-orange-600 mb-4 tracking-tight">{step.n}</div>
                <h3 className="font-display font-semibold text-2xl text-white mb-2.5 tracking-tight">{step.title}</h3>
                <p className="text-white/65 text-[15px] leading-[1.55]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-24 bg-paper">
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-12">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">Dentro do produto</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">Dados que você <em className="italic text-orange-600">entende</em> na hora.</h2>
            <p className="text-lg text-ink-500 leading-relaxed max-w-[620px] mx-auto">Interface pensada para chef, gerente e proprietário. Sem jargão técnico, sem planilha confusa.</p>
          </div>
          
          <div className="mt-12 bg-white border border-ink-200 rounded-[24px] overflow-hidden shadow-xl">
            <div className="bg-blue-900 px-5 py-3 flex items-center gap-2.5">
              <div className="w-[11px] h-[11px] rounded-full bg-[#FF5F56]"></div>
              <div className="w-[11px] h-[11px] rounded-full bg-[#FFBD2E]"></div>
              <div className="w-[11px] h-[11px] rounded-full bg-[#27C93F]"></div>
              <div className="ml-4 bg-white/10 px-3.5 py-1.5 rounded font-mono text-xs text-white/70">app.custodereceita.com.br/cardapio</div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[500px]">
              <aside className="hidden md:block bg-ink-50 border-r border-ink-200 px-3.5 py-5">
                <div className="flex gap-2 items-center px-2 pb-5 border-b border-ink-200 mb-4">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white text-xs">🍽</div>
                  <span className="font-body font-bold text-[13px] text-blue-900 leading-[1.1]">Custo de<br/><span className="text-orange-600">RECEITA</span></span>
                </div>
                
                <div className="text-[10px] font-semibold text-ink-400 tracking-widest uppercase px-3 pt-3 pb-1.5">Principal</div>
                <div className="flex flex-col gap-0.5">
                  <div className="px-3 py-2.5 rounded-md text-[13px] text-ink-600 font-medium flex items-center gap-2.5 cursor-pointer hover:bg-white hover:text-ink-900">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Dashboard
                  </div>
                  <div className="px-3 py-2.5 rounded-md text-[13px] font-medium flex items-center gap-2.5 cursor-pointer bg-blue-700 text-white">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg> Cardápio
                  </div>
                  <div className="px-3 py-2.5 rounded-md text-[13px] text-ink-600 font-medium flex items-center gap-2.5 cursor-pointer hover:bg-white hover:text-ink-900">
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Ingredientes
                  </div>
                </div>
              </aside>
              
              <main className="p-6 md:p-7 bg-paper">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-display font-semibold text-[22px] text-blue-900 tracking-tight">Cardápio completo</h3>
                    <p className="text-xs text-ink-500 mt-0.5">128 pratos · 7 categorias · atualizado hoje</p>
                  </div>
                  <button className="btn-primary py-2 px-3 text-xs">+ Novo prato</button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-white border border-ink-200 rounded-[10px] p-3.5">
                    <div className="text-[10px] font-semibold text-ink-500 tracking-wider uppercase mb-1.5">CMV Médio</div>
                    <div className="font-mono font-semibold text-xl text-blue-900 leading-none">31,2%</div>
                    <div className="text-[11px] font-semibold text-success mt-1">↓ 2,4pp</div>
                  </div>
                  <div className="bg-white border border-ink-200 rounded-[10px] p-3.5">
                    <div className="text-[10px] font-semibold text-ink-500 tracking-wider uppercase mb-1.5">Margem</div>
                    <div className="font-mono font-semibold text-xl text-blue-900 leading-none">42,8%</div>
                    <div className="text-[11px] font-semibold text-success mt-1">↑ R$ 2.340</div>
                  </div>
                  <div className="bg-white border border-ink-200 rounded-[10px] p-3.5">
                    <div className="text-[10px] font-semibold text-ink-500 tracking-wider uppercase mb-1.5">Ticket Médio</div>
                    <div className="font-mono font-semibold text-xl text-blue-900 leading-none">R$ 58,40</div>
                    <div className="text-[11px] font-semibold text-success mt-1">↑ 8,1%</div>
                  </div>
                  <div className="bg-white border border-ink-200 rounded-[10px] p-3.5">
                    <div className="text-[10px] font-semibold text-ink-500 tracking-wider uppercase mb-1.5">Em atenção</div>
                    <div className="font-mono font-semibold text-xl text-error leading-none">7</div>
                    <div className="text-[11px] font-semibold text-ink-500 mt-1">margem baixa</div>
                  </div>
                </div>
                
                <div className="bg-white border border-ink-200 rounded-[10px] overflow-hidden">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-3 text-[10px] font-bold text-ink-500 tracking-wider uppercase border-b border-ink-200 bg-ink-50">
                    <div>Prato</div>
                    <div>Custo</div>
                    <div className="hidden md:block">CMV</div>
                    <div className="hidden md:block">Venda</div>
                    <div>Margem</div>
                  </div>
                  
                  {[
                    { name: "Risoto de Funghi", cost: "R$ 18,40", cmv: "28,6%", sell: "R$ 64,30", marg: 71, status: "ok" },
                    { name: "Fettuccine Alfredo", cost: "R$ 12,80", cmv: "26,1%", sell: "R$ 49,00", marg: 74, status: "ok" },
                    { name: "Picanha na Chapa", cost: "R$ 42,60", cmv: "44,8%", sell: "R$ 95,00", marg: 55, status: "low" },
                    { name: "Bruschetta Pomodoro", cost: "R$ 6,20", cmv: "22,1%", sell: "R$ 28,00", marg: 78, status: "ok" },
                    { name: "Tiramisù", cost: "R$ 9,40", cmv: "34,8%", sell: "R$ 27,00", marg: 65, status: "med" }
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] px-4 py-3 items-center text-[13px] border-b border-ink-200 last:border-b-0">
                      <div className="font-semibold text-ink-800">{row.name}</div>
                      <div className="font-mono font-medium text-ink-700">{row.cost}</div>
                      <div className="hidden md:block font-mono font-medium text-ink-700">{row.cmv}</div>
                      <div className="hidden md:block font-mono font-medium text-ink-700">{row.sell}</div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.status === 'ok' ? 'bg-success' : row.status === 'low' ? 'bg-error' : 'bg-orange-500'}`} style={{ width: `${row.marg}%` }}></div>
                        </div>
                        <span className="font-mono text-[11px] font-semibold min-w-[30px]">{row.marg}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24">
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-12">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">Quem usa recomenda</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">Histórias de <em className="italic text-orange-600">margem recuperada.</em></h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[
              { quote: "Em dois meses descobri que 4 pratos do meu cardápio davam prejuízo. Reprecificando, aumentei minha margem em 9 pontos. O sistema literalmente se pagou na primeira semana.", avatar: "MC", bg: "from-[#004A99] to-[#1966B8]", name: "Marina Camargo", role: "Chef proprietária · Osteria Verrazzano, SP" },
              { quote: "Tenho 3 hamburguerias. Antes do Custo de Receita, cada unidade tinha um preço diferente e eu não sabia qual era lucrativa. Hoje bato meta todo mês e sei exatamente o porquê.", avatar: "JL", bg: "from-[#FF6B00] to-[#FFAB66]", name: "Juliano Lemos", role: "Sócio · Burger Co., Curitiba" },
              { quote: "Sou confeiteira, trabalho sozinha e não entendo de planilha. É a primeira ferramenta de gestão que realmente entendi e uso todos os dias. Parei de vender bolo no prejuízo.", avatar: "AR", bg: "from-[#B34A00] to-[#FF8533]", name: "Ana Ribeiro", role: "Confeiteira · Doce Alinhado, BH" }
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-ink-200 relative">
                <div className="font-display font-black text-[60px] leading-[0.6] text-orange-300 mb-2.5">&quot;</div>
                <div className="font-display font-medium text-[17px] leading-[1.4] text-ink-800 mb-6 tracking-tight">{t.quote}</div>
                <div className="flex items-center gap-3 pt-5 border-t border-ink-200 mt-auto">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 bg-gradient-to-br ${t.bg}`}>{t.avatar}</div>
                  <div>
                    <div className="text-sm font-bold text-ink-900">{t.name}</div>
                    <div className="text-xs text-ink-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLAN SELECTOR */}
      <section id="plans" className="py-20 bg-paper">
        <div className="container-page">
          <div className="text-center mb-5">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">Qual plano é pra mim?</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">Escolha o tamanho da <em className="italic text-orange-600">sua cozinha.</em></h2>
            <p className="text-lg text-ink-500 leading-relaxed max-w-[620px] mx-auto">Responda 2 perguntas rápidas e te mostramos o plano ideal pro seu negócio.</p>
          </div>

          <div className="max-w-[880px] mx-auto mt-10 bg-white rounded-2xl p-6 md:p-10 border-2 border-blue-100 shadow-md">
            <h3 className="font-display font-semibold text-2xl text-blue-900 text-center mb-1.5 tracking-tight">Encontre seu plano em 15 segundos</h3>
            <p className="text-center text-ink-500 text-sm mb-8">Clique nas opções que se aplicam à sua operação</p>

            <div className="mb-6 pb-6 border-b border-dashed border-ink-200">
              <div className="text-[13px] font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white inline-flex items-center justify-center text-[11px]">1</span>
                Quantas unidades / operações você tem?
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: "1", label: "1 operação" },
                  { val: "2-3", label: "2 a 3 unidades" },
                  { val: "4+", label: "4 unidades ou mais" }
                ].map((opt) => (
                  <button 
                    key={opt.val}
                    onClick={() => setQ1(opt.val)}
                    className={`px-4 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all select-none ${q1 === opt.val ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-ink-300 text-ink-700 hover:border-blue-700 hover:text-blue-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-[13px] font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white inline-flex items-center justify-center text-[11px]">2</span>
                As unidades têm <strong className="text-orange-700 ml-1"> mesmo cardápio e mesmos preços de compra?</strong>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: "single", label: "É só 1 operação" },
                  { val: "same", label: "Sim, são iguais" },
                  { val: "different", label: "Não, há diferenças" }
                ].map((opt) => (
                  <button 
                    key={opt.val}
                    onClick={() => setQ2(opt.val)}
                    className={`px-4 py-2.5 rounded-full border-[1.5px] text-[13px] font-medium transition-all select-none ${q2 === opt.val ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-ink-300 text-ink-700 hover:border-blue-700 hover:text-blue-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {result && (
              <div className="mt-8 p-6 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col md:flex-row items-center md:items-start gap-5">
                <div className="text-4xl shrink-0">{result.emoji}</div>
                <div className="text-center md:text-left">
                  <div className="text-[11px] font-bold tracking-widest text-orange-700 uppercase mb-1">PLANO IDEAL PRA VOCÊ</div>
                  <div className="font-display font-bold text-[22px] text-blue-900 mb-1">{result.plan}</div>
                  <div className="text-sm text-ink-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: result.desc }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-10 bg-ink-100">
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch mt-12">
            
            {/* PLANO ESSENCIAL */}
            <div className="bg-white rounded-2xl p-7 md:p-9 border border-ink-200 flex flex-col relative">
              <div className="font-display font-semibold text-2xl mb-1.5 tracking-tight">Essencial</div>
              <div className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-3">Para quem está começando</div>
              <div className="text-sm opacity-75 mb-5 leading-relaxed italic border-l-2 border-current pl-3">MEI, lanchonete, delivery pequeno, confeitaria, restaurante com cardápio enxuto.</div>
              <div className="font-display font-bold text-[52px] leading-none tracking-tight mb-1">
                <span className="text-[22px] align-top mr-0.5 opacity-60 font-medium">R$</span>49<span className="text-sm font-normal opacity-60 tracking-normal"> /mês</span>
              </div>
              <div className="text-xs opacity-60 mb-6">cobrança mensal · cancele quando quiser</div>
              <ul className="list-none m-0 p-0 mb-7 flex-1 flex flex-col gap-2">
                {[
                  <>Até <strong>30 fichas técnicas</strong></>,
                  "1 usuário",
                  <>Ingredientes <strong>ilimitados</strong></>,
                  "Importar lista de ingredientes",
                  "Cálculo de custo por receita",
                  "Termômetro de preço de venda",
                  "Cálculo de CMV",
                  "Suporte por e-mail + base de ajuda"
                ].map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2.5 leading-relaxed">
                    <svg className="w-4 h-4 text-success shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="font-display italic text-sm leading-relaxed text-orange-700 p-4 bg-orange-50 rounded-md mb-5">&quot;Comece a precificar corretamente e pare de vender sem saber seu lucro.&quot;</div>
              <Link href="/registro" className="btn-ghost w-full py-3.5 text-base text-center">Começar grátis</Link>
            </div>

            {/* PLANO PROFISSIONAL */}
            <div className="bg-blue-900 text-white rounded-2xl p-7 md:p-9 border border-blue-900 flex flex-col relative md:scale-[1.02] shadow-xl">
              <div className="absolute -top-3 right-7 bg-orange-600 text-white px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider">MAIS VENDIDO</div>
              <div className="font-display font-semibold text-2xl mb-1.5 tracking-tight">Profissional</div>
              <div className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-3">Para controle real de margem</div>
              <div className="text-sm opacity-75 mb-5 leading-relaxed italic border-l-2 border-current pl-3">Restaurante operando com volume, hamburgueria, pizzaria, dark kitchen.</div>
              <div className="font-display font-bold text-[52px] leading-none tracking-tight mb-1">
                <span className="text-[22px] align-top mr-0.5 opacity-60 font-medium">R$</span>99<span className="text-sm font-normal opacity-60 tracking-normal"> /mês</span>
              </div>
              <div className="text-xs opacity-60 mb-6">cobrança mensal · cancele quando quiser</div>
              <ul className="list-none m-0 p-0 mb-7 flex-1 flex flex-col gap-2">
                {[
                  <><strong>Fichas técnicas ilimitadas</strong></>,
                  <>Até <strong>5 usuários</strong> (Editor e Visualizador)</>,
                  "Ingredientes ilimitados",
                  "Importar lista de ingredientes",
                  "Cálculo de custo por receita",
                  "Termômetro de preço de venda",
                  "Cálculo de CMV",
                  <><strong>Categorias e grupos</strong> de produtos</>,
                  "Suporte por e-mail + base de ajuda"
                ].map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2.5 leading-relaxed">
                    <svg className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="font-display italic text-sm leading-relaxed text-orange-300 p-4 bg-orange-500/15 rounded-md mb-5">&quot;Tenha controle real do custo, CMV e margem para tomar decisões com segurança.&quot;</div>
              <Link href="/registro" className="btn-primary w-full py-3.5 text-base text-center">Começar grátis →</Link>
            </div>

            {/* PLANO REDE */}
            <div className="bg-white rounded-2xl p-7 md:p-9 border border-ink-200 flex flex-col relative">
              <div className="font-display font-semibold text-2xl mb-1.5 tracking-tight">Rede</div>
              <div className="text-xs font-semibold tracking-wider uppercase opacity-60 mb-3">Para operações complexas</div>
              <div className="text-sm opacity-75 mb-5 leading-relaxed italic border-l-2 border-current pl-3">Redes, franquias, consultorias gastronômicas, grupos com várias marcas.</div>
              <div className="font-display font-bold text-[38px] leading-none tracking-tight mb-1">
                <span className="text-[22px] align-top mr-0.5 opacity-60 font-medium">R$</span>1.000<span className="text-sm font-normal opacity-60 tracking-normal"> /mês</span>
              </div>
              <div className="text-xs opacity-60 mb-6"><span className="font-semibold text-blue-700 opacity-100">+ R$ 49,90</span> por unidade adicional</div>
              <ul className="list-none m-0 p-0 mb-7 flex-1 flex flex-col gap-2">
                {[
                  <><strong>Tudo do Profissional</strong> em cada unidade</>,
                  "Usuários ilimitados com gestão de rede",
                  "Centro de custo por unidade",
                  "Preços de compra diferentes por loja",
                  "Consolidação de resultados da rede",
                  "Comparativo de CMV entre unidades",
                  <><strong>Onboarding assistido</strong> da matriz</>,
                  <><strong>Treinamento</strong> para a equipe</>,
                  <><strong>Gerente de conta</strong> (1h/mês)</>,
                  <>Suporte prioritário via <strong>WhatsApp</strong></>
                ].map((item, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2.5 leading-relaxed">
                    <svg className="w-4 h-4 text-success shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="font-display italic text-sm leading-relaxed text-orange-700 p-4 bg-orange-50 rounded-md mb-5">&quot;Padronização, escala e inteligência financeira para operações complexas.&quot;</div>
              <Link href="/registro" className="btn-ghost w-full py-3.5 text-base text-center">Falar com vendas</Link>
            </div>

          </div>

          <div className="max-w-[720px] mx-auto mt-10 bg-blue-50 border border-blue-100 rounded-xl p-5 md:p-6 text-sm text-blue-900 leading-relaxed">
            <strong><span className="text-lg mr-2">💡</span>Tem 2 ou 3 unidades com o mesmo cardápio e mesmos fornecedores?</strong><br />
            Uma única assinatura do <strong>Profissional</strong> já atende. A ficha técnica é centralizada e todas as unidades acessam o mesmo cardápio. O plano <strong>Rede</strong> é indicado quando cada unidade tem seus próprios preços de compra, cardápio próprio ou centro de custo independente (comum em franquias).
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="container-page">
          <div className="text-center max-w-[720px] mx-auto mb-12">
            <div className="inline-block font-mono text-xs font-semibold text-orange-700 tracking-[0.15em] uppercase mb-3">Perguntas frequentes</div>
            <h2 className="font-display font-bold text-[clamp(32px,4vw,48px)] leading-tight tracking-tight text-blue-900 mb-4">Ainda tem dúvida?</h2>
          </div>
          
          <div className="max-w-[720px] mx-auto flex flex-col gap-2.5">
            {[
              { q: "Preciso ter conhecimento de planilha ou finanças para usar?", a: "Não. O Custo de Receita foi desenhado para quem entende de cozinha, não de Excel. Você cadastra os insumos, monta a ficha do prato como se fosse uma receita, e o sistema faz toda a matemática automaticamente. Se você consegue usar WhatsApp, consegue usar o Custo de Receita." },
              { q: "Tenho 2 unidades. Preciso do plano Rede?", a: "Depende. Se as unidades têm <strong>o mesmo cardápio e os mesmos preços de compra</strong>, uma única assinatura do plano <strong>Profissional</strong> atende perfeitamente — a ficha técnica é centralizada e vale pra todas as unidades. Agora, se cada unidade tem <strong>preços de compra diferentes</strong> (porque compra de fornecedores locais), <strong>variações no cardápio</strong> ou precisa de <strong>centros de custo separados</strong>, aí o plano <strong>Rede</strong> é o indicado. Esse é o cenário típico de franquias." },
              { q: "Como funciona o suporte em cada plano?", a: "<strong>Essencial e Profissional:</strong> central de ajuda completa com vídeos, tutoriais e chat inteligente para responder na hora. Atendimento humano por e-mail em até 48h em dias úteis.<br><br><strong>Rede:</strong> suporte prioritário via WhatsApp, gerente de conta dedicado com 1h/mês de acompanhamento estratégico e onboarding assistido nos primeiros 60 dias (incluindo importação inicial e treinamento da equipe)." },
              { q: "Funciona para confeitaria, food truck ou dark kitchen?", a: "Sim. A plataforma funciona para qualquer operação gastronômica: restaurantes, bares, confeitarias, padarias, food trucks, dark kitchens, marmitarias e cafeterias. Se você produz algo com ingredientes e vende, o sistema serve." },
              { q: "Consigo importar meus insumos de uma planilha que já tenho?", a: "Sim. Você pode importar insumos via planilha Excel ou CSV em qualquer plano. No plano Rede, nossa equipe faz a importação inicial completa da matriz como parte do onboarding assistido." },
              { q: "E se eu cancelar? Perco meus dados?", a: "Você pode cancelar a qualquer momento, direto pelo sistema, sem multa. Seus dados ficam disponíveis para download em planilha por 30 dias após o cancelamento. Depois desse prazo, são removidos dos nossos servidores conforme a LGPD." },
              { q: "O teste grátis exige cartão de crédito?", a: "Não. Você usa 14 dias completos com acesso a todas as funcionalidades do plano Profissional, sem informar dados de pagamento. Ao final do período, você escolhe se assina ou não." }
            ].map((faq, idx) => (
              <details key={idx} className="bg-white border border-ink-200 rounded-[10px] overflow-hidden group">
                <summary className="px-6 py-5 cursor-pointer font-semibold text-base text-ink-800 list-none flex justify-between items-center gap-4 [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <span className="text-2xl font-light text-orange-600 transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-5 text-ink-600 text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: faq.a }}></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-800 to-blue-900 text-white relative overflow-hidden">
        <div className="absolute -left-[100px] -bottom-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,var(--color-orange-600)_0%,transparent_60%)] opacity-20 pointer-events-none"></div>
        <div className="container-page text-center max-w-[720px] mx-auto relative z-10">
          <h2 className="font-display font-bold text-[clamp(36px,5vw,56px)] leading-[1.05] tracking-tight mb-5">Seus pratos merecem o <em className="italic text-orange-500">preço certo.</em></h2>
          <p className="text-lg text-white/75 max-w-[560px] mx-auto mb-8">14 dias grátis. Sem cartão. Sem enrolação. Em menos de uma semana, você sabe exatamente quanto cada prato do seu cardápio está te dando — ou te tirando.</p>
          <Link href="/registro" className="btn-primary px-8 py-4 text-base">Comece grátis agora →</Link>
          <p className="mt-5 text-[13px] text-white/50">Não precisa instalar nada. Funciona no celular, tablet e computador.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-ink-100 pt-16 pb-8 border-t border-ink-200">
        <div className="container-page">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-white text-xs">🍽</div>
                <span className="font-display font-bold text-lg text-blue-900 leading-none">Custo de Receita</span>
              </div>
              <p className="text-sm text-ink-500 leading-relaxed max-w-[320px]">Precificação inteligente para gastronomia. Feito no Brasil, para quem cozinha no Brasil.</p>
            </div>
            <div>
              <h4 className="font-body text-xs font-bold tracking-widest uppercase text-ink-700 mb-4">Produto</h4>
              <ul className="list-none p-0 flex flex-col gap-2.5">
                <li><a href="#features" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Funcionalidades</a></li>
                <li><a href="#how" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Como funciona</a></li>
                <li><a href="#plans" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Planos</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Novidades</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-xs font-bold tracking-widest uppercase text-ink-700 mb-4">Empresa</h4>
              <ul className="list-none p-0 flex flex-col gap-2.5">
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Sobre</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Contato</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Parcerias</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-body text-xs font-bold tracking-widest uppercase text-ink-700 mb-4">Legal</h4>
              <ul className="list-none p-0 flex flex-col gap-2.5">
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Termos de uso</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Privacidade (LGPD)</a></li>
                <li><a href="#" className="text-sm text-ink-500 hover:text-orange-600 transition-colors">Segurança</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-ink-200 flex flex-col md:flex-row justify-between items-center gap-3 text-[13px] text-ink-500">
            <span>© {new Date().getFullYear()} Custo de Receita. Todos os direitos reservados.</span>
            <span>custodereceita.com.br · Brasil</span>
          </div>
        </div>
      </footer>
    </div>
  );
}