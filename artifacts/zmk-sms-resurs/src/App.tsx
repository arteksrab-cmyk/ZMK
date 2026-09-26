import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Phone,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { submitLead } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const assetBase = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

const maxChatUrl = 'https://max.ru/u/f9LHodD0cOJM26lxBMGSe45saJQzi-nl4ZzRngYsHcqlAkDF9b2WQF5WQHQ';
const maxMessage = 'Здравствуйте!\nРассчитайте проект пожалуйста.\nПрикладываю файл и карточку организации.';
const maxChatLink = `${maxChatUrl}?text=${encodeURIComponent(maxMessage)}`;

type LeadForm = {
  name: string;
  company: string;
  phone: string;
  email: string;
  details: string;
};

const businessEmail = 'zmksmsresurs@gmail.com';

const initialForm: LeadForm = {
  name: '',
  company: '',
  phone: '',
  email: '',
  details: '',
};

const services = [
  {
    index: '01 / РЕЗКА',
    title: 'Газовая резка',
    description: 'Раскрой листового проката по картам заготовок для крупногабаритных и серийных деталей.',
  },
  {
    index: '02 / ПОДГОТОВКА',
    title: 'Дробемётная обработка',
    description: 'Подготовка поверхности перед окраской и огнезащитой с контролем результата.',
  },
  {
    index: '03 / ТОЧНОСТЬ',
    title: 'Плазменная резка',
    description: 'Быстрый раскрой конструкционной стали с чистой геометрией сложных контуров.',
  },
  {
    index: '04 / ПРОКАТ',
    title: 'Ленточнопильная резка',
    description: 'Точный размерный рез сортового и трубного проката без лишнего припуска.',
  },
  {
    index: '05 / УЗЛЫ',
    title: 'Сверление',
    description: 'Отверстия и монтажные узлы по рабочей документации и требованиям проекта.',
  },
];

const glazingServices = [
  {
    index: '01 / ОКНА',
    title: 'Окна',
    description: 'Рекомендуем партнёров по подбору и поставке оконных решений для дома, офиса и коммерческих помещений.',
  },
  {
    index: '02 / ДВЕРИ',
    title: 'Двери',
    description: 'Можем рекомендовать партнёров по изготовлению и поставке дверей и входных групп под задачу объекта.',
  },
  {
    index: '03 / ПЕРЕГОРОДКИ',
    title: 'Перегородки',
    description: 'Партнёры помогут подобрать и поставить офисные и душевые перегородки для зонирования помещений.',
  },
  {
    index: '04 / СТЕКЛО',
    title: 'Стеклопакеты',
    description: 'По проекту рекомендуем партнёров по стеклопакетам, регулировке и ремонту окон.',
  },
];

const structures = [
  {
    label: 'Промышленные здания',
    title: 'Каркас, который держит темп производства.',
    description:
      'Колонны, фермы, связи и вторичный металл для цехов, складов и производственных комплексов. От комплектации металла до маркировки отправочных элементов.',
    tags: ['По рабочим чертежам (КМ/КМД)', 'Монтажная готовность', 'Отгрузка партиями'],
  },
  {
    label: 'Коммерческие объекты',
    title: 'Инженерная ясность для заметной архитектуры.',
    description:
      'Металлокаркас для торговых и общественных пространств, где важны сроки, аккуратная геометрия и понятная исполнительная документация.',
    tags: ['Нестандартные узлы', 'Стыковка со смежниками', 'Поставка в графике'],
  },
  {
    label: 'Спецконструкции',
    title: 'Когда типовых решений недостаточно.',
    description:
      'Площадки, эстакады, технологические рамы и элементы инфраструктуры под реальные условия объекта и региональные требования.',
    tags: ['Индивидуальный расчёт', 'Тяжёлый прокат', 'Технадзор'],
  },
];

const cases = [
  { number: '01', type: 'Коммерческий объект', title: 'Премиальный автосалон', className: 'tall' },
  { number: '02', type: 'Инфраструктура', title: 'Модульные очистные сооружения', className: '' },
  { number: '03', type: 'Социальный объект', title: 'Модульная школа', className: '' },
  { number: '04', type: 'Промышленность', title: 'Золотодобывающее предприятие', className: 'wide' },
];

function useRevealOnScroll() {
  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = () => setMobileOpen(false);

  return (
    <header className="site-header" data-testid="site-header">
      <div className="header-inner">
        <a href="#top" className="brand-lockup" onClick={closeMenu} data-testid="link-brand">
          <img src={`${assetBase}brand/sms-resurs-logo.svg`} alt="ЗМК СМС-РЕСУРС" />
          <span className="brand-caption">Стальные решения г. Новосибирск</span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          <a href="#services" data-testid="link-services">Возможности</a>
          <a href="#glazing" data-testid="link-glazing">Остекление</a>
          <a href="#panels" data-testid="link-panels">Панели</a>
          <a href="#structures" data-testid="link-structures">Конструкции</a>
          <a href="#workflow" data-testid="link-workflow">Процесс</a>
          <a href="#contacts" data-testid="link-contacts">Контакты</a>
        </nav>
        <div className="header-contact" data-testid="header-contact">
          <a className="header-phone" href="tel:+79069624358" data-testid="link-header-phone">
            <span className="header-phone-number">8 906 962 43 58</span>
            <span className="header-phone-hours">с 8 до 20 часов</span>
          </a>
          <a className="header-email" href={`mailto:${businessEmail}`} data-testid="link-header-email">
            {businessEmail}
          </a>
        </div>
        <button
          className="menu-toggle"
          type="button"
          aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          data-testid="button-mobile-menu"
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>
      {mobileOpen && (
        <nav className="mobile-nav" aria-label="Мобильная навигация" data-testid="mobile-navigation">
          <a href="#services" onClick={closeMenu} data-testid="mobile-link-services">Возможности</a>
          <a href="#glazing" onClick={closeMenu} data-testid="mobile-link-glazing">Остекление</a>
          <a href="#panels" onClick={closeMenu} data-testid="mobile-link-panels">Сэндвич-панели</a>
          <a href="#structures" onClick={closeMenu} data-testid="mobile-link-structures">Конструкции</a>
          <a href="#workflow" onClick={closeMenu} data-testid="mobile-link-workflow">Процесс</a>
          <a href="#contacts" onClick={closeMenu} data-testid="mobile-link-contacts">Запросить расчёт</a>
          <div className="mobile-contact">
            <a className="mobile-contact-phone" href="tel:+79069624358">8 906 962 43 58</a>
            <span className="mobile-contact-hours">с 8 до 20 часов</span>
            <a className="mobile-contact-email" href={`mailto:${businessEmail}`}>{businessEmail}</a>
          </div>
        </nav>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top" data-testid="section-hero">
      <div className="hero-content">
        <div className="hero-copy reveal">
          <span className="eyebrow">ЗМК · Новосибирск · Работа по проекту</span>
          <h1 className="display">Собираем<br /><em>опору</em><br />для бизнеса.</h1>
          <p className="hero-lede">
            Производим и поставляем металлоконструкции для промышленных,
            коммерческих и инфраструктурных объектов — от первого чертежа до
            отгрузки с комплектом документов.
          </p>
          <div className="hero-actions">
            <a href="#contacts" className="button-primary" data-testid="button-hero-calculate">
              Рассчитать проект <ArrowUpRight size={16} />
            </a>
            <a href="#workflow" className="button-ghost" data-testid="button-hero-process">
              Как это работает <ArrowDownRight size={16} />
            </a>
          </div>
          <div className="hero-note">
            <ShieldCheck size={15} /> Работаем по проектной документации и заданию заказчика
          </div>
        </div>
        <div className="hero-visual reveal delay-2" aria-label="Схематичный образ стальной конструкции">
          <div className="hero-plate" />
          <div className="hero-visual-mark">
            <img src={`${assetBase}brand/sms-resurs-mark.svg`} alt="" />
          </div>
          <div className="visual-tag">
            <strong>ПО ПРОЕКТУ</strong>
            изготовление по рабочей<br />документации (КМ/КМД)
          </div>
        </div>
      </div>
      <div className="scroll-marker">листайте ниже</div>
    </section>
  );
}

function Stats() {
  return (
    <div className="stats-strip reveal" data-testid="stats-strip">
      <div className="stat-cell">
        <span className="stat-value">01</span>
        <span className="stat-label">производственная площадка в Новосибирске</span>
      </div>
      <div className="stat-cell">
        <span className="stat-value">5×</span>
        <span className="stat-label">ключевых операций обработки металла</span>
      </div>
      <div className="stat-cell">
        <span className="stat-value">ПРОЕКТ</span>
        <span className="stat-label">рабочие чертежи (КМ/КМД) и документация заказчика</span>
      </div>
      <div className="stat-cell">
        <span className="stat-value">ЗАДАЧА</span>
        <span className="stat-label">состав работ под требования проекта</span>
      </div>
    </div>
  );
}

function Services() {
  return (
    <section className="section services-section" id="services" data-testid="section-services">
      <div className="section-inner">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">01 / Производство</span>
            <h2 className="display">Точная работа<br />с металлом.</h2>
          </div>
          <p>
            Держим в одном контуре основные операции подготовки и обработки
            проката. Так проще отвечать за геометрию, поверхность и готовность
            деталей к следующему этапу.
          </p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => {
            return (
              <article
                className={`service-card reveal ${service.index === '01 / РЕЗКА' ? 'featured' : ''} delay-${Math.min(index, 3)}`}
                key={service.index}
                data-testid={`card-service-${index + 1}`}
              >
                <span className="service-index">{service.index}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            );
          })}
        </div>
        <div className="services-footnote">Состав операции определяем по задаче, материалу и требованиям проекта.</div>
      </div>
    </section>
  );
}

function Glazing() {
  return (
    <section className="section glazing-section" id="glazing" data-testid="section-glazing">
      <div className="section-inner">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">02 / Партнёрские решения</span>
            <h2 className="display">Окна, двери<br />и перегородки.</h2>
          </div>
          <p>
            ЗМК СМС-РЕСУРС не изготавливает окна и стеклянные изделия
            самостоятельно. Под задачу проекта можем рекомендовать наших
            партнёров по изготовлению и поставке окон, дверей, стеклопакетов и
            перегородок, а также помочь с подбором решения по рабочей
            документации.
          </p>
        </div>
        <div className="glazing-grid">
          {glazingServices.map((service, index) => {
            return (
              <article className={`glazing-card reveal delay-${Math.min(index, 3)}`} key={service.index} data-testid={`card-glazing-${index + 1}`}>
                <span className="service-index">{service.index}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            );
          })}
        </div>
        <div className="glazing-note reveal">
          <span>Рекомендация партнёров · решение под проект</span>
          <span>Работаем по всей России</span>
        </div>
      </div>
    </section>
  );
}

function SandwichPanels() {
  const specifications = [
    { value: 'Любая', label: 'толщина панели' },
    { value: 'Любое', label: 'наполнение под задачу' },
    { value: 'РФ', label: 'поставка по всей стране' },
  ];

  return (
    <section className="section panels-section" id="panels" data-testid="section-panels">
      <div className="section-inner panels-layout">
        <div className="panels-copy reveal">
          <span className="eyebrow">03 / Сэндвич-панели</span>
          <h2 className="display">Панели<br />под ваш проект.</h2>
          <p>
            ЗМК СМС-РЕСУРС выступает дилером сэндвич-панелей и организует
            поставку под задачу проекта. Предложим панели любой толщины и с
            любым наполнением, а при объёмах от 500 м² подготовим выгодное
            предложение по стоимости.
          </p>
          <a href="#contacts" className="button-primary panels-button" data-testid="button-panels-calculate">
            Обсудить объём <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="panels-offer reveal delay-1">
          <div className="panels-offer-top">
            <span className="eyebrow">Дилерская поставка</span>
            <strong>от 500 м²</strong>
          </div>
          <div className="panel-stack" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="panels-specs">
            {specifications.map((item) => (
              <div className="panels-spec" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FireProtection() {
  return (
    <section className="section fire-section" data-testid="section-fire-protection">
      <div className="section-inner fire-grid">
        <div className="reveal">
          <span className="eyebrow">04 / Партнёрские решения</span>
          <h2 className="display">Огнезащита —<br />через партнёров.</h2>
          <p className="lead">
            ЗМК СМС-РЕСУРС не выполняет огнезащитные работы самостоятельно.
            Если такая обработка нужна по проекту, можем рекомендовать
            партнёров, которые подберут систему под требуемый предел
            огнестойкости и условия объекта. Состав работ и подтверждающие
            документы согласуются с исполнителем.
          </p>
          <div className="fire-points">
            <div className="fire-point"><Check size={16} /> Рекомендуем партнёров под требования конкретного объекта.</div>
            <div className="fire-point"><Check size={16} /> Предел огнестойкости и материалы согласуются по проекту.</div>
            <div className="fire-point"><Check size={16} /> Сертификаты и паспорта предоставляет исполнитель работ.</div>
          </div>
        </div>
        <div className="fire-diagram reveal delay-2" aria-label="Схема выбора огнезащитного решения">
          <div className="diagram-note"><strong>ПО ПРОЕКТУ</strong>требования к огнезащите согласуются с исполнителем</div>
        </div>
      </div>
    </section>
  );
}

function Structures() {
  const [active, setActive] = useState(0);
  const current = structures[active];

  return (
    <section className="section structures-section" id="structures" data-testid="section-structures">
      <div className="section-inner">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">05 / Объекты</span>
            <h2 className="display">Металл под<br />вашу задачу.</h2>
          </div>
          <p>
            От производственного корпуса до технологической площадки — входим в
            проект там, где нужны ясный расчёт, предсказуемая поставка и
            инженерный диалог.
          </p>
        </div>
        <div className="structures-layout">
          <div className="structure-tabs reveal" role="tablist" aria-label="Типы конструкций">
            {structures.map((item, index) => (
              <button
                className={`structure-tab ${active === index ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={active === index}
                key={item.label}
                onClick={() => setActive(index)}
                data-testid={`button-structure-tab-${index + 1}`}
              >
                <span>{item.label}</span>
                <span>0{index + 1}</span>
              </button>
            ))}
          </div>
          <article className="structure-detail reveal delay-1" data-testid="structure-detail">
            <span className="eyebrow">Класс задачи / 0{active + 1}</span>
            <h3 className="display">{current.title}</h3>
            <p>{current.description}</p>
            <div className="tag-row">
              {current.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Cases() {
  return (
    <section className="section cases-section" data-testid="section-cases">
      <div className="section-inner">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">06 / Практика</span>
            <h2 className="display">Конструкции<br />для реальной жизни.</h2>
          </div>
          <p>
            Проекты отличаются назначением, масштабом и условиями монтажа. Наш
            подход остаётся одним: внимательно читать задачу и выпускать
            понятный результат.
          </p>
        </div>
        <div className="cases-grid">
          {cases.map((item, index) => (
            <article className={`case-card ${item.className} reveal delay-${Math.min(index, 3)}`} key={item.number} data-testid={`card-case-${item.number}`}>
              <span className="case-number">{item.number}</span>
              <span className="case-type">{item.type}</span>
              <h3>{item.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { number: '01', title: 'Получаем задачу', copy: 'Изучаем чертежи, техническое задание, объёмы работ и требования к объекту.' },
    { number: '02', title: 'Считаем проект', copy: 'Уточняем состав работ и готовим понятное предложение.' },
    { number: '03', title: 'Изготавливаем', copy: 'Режем, сверлим, собираем, обрабатываем и маркируем детали.' },
    { number: '04', title: 'Проверяем качество', copy: 'Проверяем размеры, покрытие, комплектацию и документы.' },
    { number: '05', title: 'Отгружаем на объект', copy: 'Собираем детали для монтажа и согласовываем график поставки.' },
  ];

  return (
    <section className="section workflow-section" id="workflow" data-testid="section-workflow">
      <div className="section-inner">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">07 / Процесс</span>
            <h2 className="display">Без тумана<br />между «надо» и «готово».</h2>
          </div>
          <p>
            Прозрачный маршрут помогает держать сроки и не терять детали.
            Вы понимаете, на каком мы этапе, что уже проверено и что уедет на
            объект вместе с металлом.
          </p>
        </div>
        <div className="workflow-line">
          {steps.map((step, index) => (
            <article className={`workflow-step reveal delay-${Math.min(index, 3)}`} key={step.number} data-testid={`workflow-step-${step.number}`}>
              <span className="step-num">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Proof() {
  const proofItems = [
    { title: 'Исполнительная документация', copy: 'Собираем комплект по проекту и фактически выполненным операциям, без разрыва между цехом и стройплощадкой.', icon: ClipboardCheck },
    { title: 'Контроль качества', copy: 'Проверяем геометрию, маркировку и состояние поверхности до передачи в упаковку и отгрузку.', icon: ShieldCheck },
    { title: 'Материалы подтверждены', copy: 'Сертификаты и паспорта на применённые материалы предоставляем по запросу в составе согласованного проекта.', icon: FileCheck2 },
  ];

  return (
    <section className="section proof-section" data-testid="section-proof">
      <div className="section-inner proof-layout">
        <div className="reveal">
          <span className="eyebrow">08 / Подтверждение</span>
          <h2 className="display">Документы<br />и качество.</h2>
          <p>
            Для B2B важны не только изготовленные конструкции. Нужны
            прослеживаемость решений, понятная передача и возможность быстро
            ответить на вопрос технического заказчика.
          </p>
        </div>
        <div className="proof-list reveal delay-1">
          {proofItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article className="proof-item" key={item.title} data-testid={`proof-item-${index + 1}`}>
                <Icon size={23} strokeWidth={1.4} />
                <div><h3>{item.title}</h3><p>{item.copy}</p></div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SearchFaq() {
  const questions = [
    {
      question: 'Где купить сэндвич-панели оптом?',
      answer: 'ЗМК СМС-РЕСУРС выступает дилером сэндвич-панелей. Подберём толщину и наполнение под проект, подготовим предложение от 500 м² и организуем поставку по всей России.',
    },
    {
      question: 'Где купить металлоконструкции по проекту?',
      answer: 'Мы изготавливаем и поставляем металлоконструкции по рабочей документации (КМ/КМД): каркасы, колонны, фермы, связи, площадки и технологические элементы.',
    },
    {
      question: 'Где покрыть огнезащитой металлоконструкции?',
      answer: 'Сам завод ЗМК СМС-РЕСУРС не выполняет огнезащитные работы. По проекту можем рекомендовать партнёров, которые согласуют систему, материалы и документы с заказчиком.',
    },
    {
      question: 'Можно ли заказать доставку сэндвич-панелей по России?',
      answer: 'Да. Рассматриваем проекты из разных регионов России и организуем дилерскую поставку сэндвич-панелей по согласованным параметрам и объёму.',
    },
    {
      question: 'Какие металлоконструкции можно заказать?',
      answer: 'Выпускаем промышленные каркасы, фермы, колонны, связи, площадки, эстакады, технологические рамы и другие конструкции по задаче объекта.',
    },
    {
      question: 'Можно ли получить расчёт металлоконструкций по КМ/КМД?',
      answer: 'Да. Пришлите рабочие чертежи, ведомость или описание объекта — уточним состав работ и подготовим предварительное предложение.',
    },
  ];

  return (
    <section className="section faq-section" data-testid="section-faq">
      <div className="section-inner faq-layout">
        <div className="faq-intro reveal">
          <span className="eyebrow">Ответы по проекту</span>
          <h2 className="display">Ищете<br />поставщика?</h2>
          <p>
            Собрали основные вопросы по металлоконструкциям, сэндвич-панелям и
            партнёрским решениям по огнезащите. Опишите задачу — подскажем
            подходящий вариант поставки.
          </p>
        </div>
        <div className="faq-list reveal delay-1">
          {questions.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}<span aria-hidden="true">+</span></summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadForm, string>>>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const updateField = (field: keyof LeadForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof LeadForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = 'Укажите имя и фамилию.';
    if (!form.phone.trim() && !form.email.trim()) nextErrors.phone = 'Оставьте телефон или e-mail.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Проверьте формат e-mail.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSending(true);
    setSubmitError('');

    try {
      await submitLead(form);
      setSent(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Не удалось отправить заявку. Попробуйте ещё раз.');
    } finally {
      setSending(false);
    }
  };

  const mailto = `mailto:${businessEmail}?subject=${encodeURIComponent('Запрос на расчёт металлоконструкций')}&body=${encodeURIComponent(
    `Имя: ${form.name}\nКомпания: ${form.company || 'не указана'}\nТелефон: ${form.phone || 'не указан'}\nE-mail: ${form.email || 'не указан'}\nЗадача: ${form.details || 'нужно обсудить'}`,
  )}`;

  if (sent) {
    return (
      <div className="lead-form form-success" data-testid="form-success">
        <CheckCircle2 size={30} color="var(--orange)" />
        <strong>Запрос принят.</strong>
        <p>Мы получили данные на этой странице. Для быстрой отправки можно открыть письмо — поля уже будут заполнены.</p>
        <a href={mailto} data-testid="link-mailto-fallback">Открыть письмо в почте <ArrowUpRight size={14} /></a>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit} noValidate data-testid="lead-form">
      <p className="form-intro">Оставьте исходные данные — вернёмся с вопросами или предварительной оценкой.</p>
      <div className="field">
        <label htmlFor="lead-name">Имя и фамилия *</label>
        <input id="lead-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Как к вам обращаться" data-testid="input-lead-name" />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </div>
      <div className="field">
        <label htmlFor="lead-company">Компания</label>
        <input id="lead-company" value={form.company} onChange={(event) => updateField('company', event.target.value)} placeholder="Название организации" data-testid="input-lead-company" />
      </div>
      <div className="field">
        <label htmlFor="lead-phone">Телефон или e-mail *</label>
        <input id="lead-phone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="8 900 000 00 00" data-testid="input-lead-phone" />
        {errors.phone && <span className="field-error">{errors.phone}</span>}
      </div>
      <div className="field">
        <label htmlFor="lead-email">E-mail для ответа</label>
        <input id="lead-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="name@company.ru" data-testid="input-lead-email" />
        {errors.email && <span className="field-error">{errors.email}</span>}
      </div>
      <div className="field">
        <label htmlFor="lead-details">Что нужно рассчитать</label>
        <textarea id="lead-details" value={form.details} onChange={(event) => updateField('details', event.target.value)} placeholder="Тип объекта, объём, сроки и требования к работам. Есть ли рабочие чертежи (КМ/КМД)" data-testid="input-lead-details" />
      </div>
      <div className="form-footer">
        <span className="form-agreement">Нажимая кнопку, вы соглашаетесь на обработку обращения для подготовки ответа. Для проекта действует режим неразглашения по договорённости.</span>
        <button className="button-primary" type="submit" disabled={sending} data-testid="button-submit-lead">
          {sending ? 'Отправляем…' : 'Отправить запрос'} <Send size={15} />
        </button>
      </div>
      {submitError && <p className="submit-error" role="alert">{submitError}</p>}
    </form>
  );
}

function Contact() {
  return (
    <section className="section contact-section" id="contacts" data-testid="section-contacts">
      <div className="section-inner contact-layout">
        <div className="contact-copy reveal">
          <span className="eyebrow">09 / Следующий шаг</span>
          <h2 className="display">Давайте<br />посчитаем.</h2>
          <p>Пришлите чертежи, ведомость или просто опишите задачу. Начнём с короткого разговора и вернёмся с конкретикой.</p>
          <div className="contact-details">
            <a className="contact-link max-contact-link" href={maxChatLink} target="_blank" rel="noreferrer" data-testid="link-contact-max">
              <MessageCircle size={17} /> <span>Написать в MAX</span>
            </a>
            <a className="contact-link" href="tel:+79069624358" data-testid="link-contact-phone"><Phone size={17} /> 8 906 962 4358</a>
            <a className="contact-link" href={`mailto:${businessEmail}`} data-testid="link-contact-email"><Mail size={17} /> {businessEmail}</a>
            <span className="contact-link" data-testid="text-contact-location"><MapPin size={17} /> Работаем по всей России</span>
          </div>
        </div>
        <div className="reveal delay-1">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src={`${assetBase}brand/sms-resurs-logo.svg`} alt="ЗМК СМС-РЕСУРС" />
          <p>Металлоконструкции и обработка металла для объектов, где важны срок и точность.</p>
        </div>
        <div className="footer-block">
          <h3>Разделы</h3>
          <a href="#services" data-testid="footer-link-services">Производство</a>
          <a href="#glazing" data-testid="footer-link-glazing">Остекление и партнёры</a>
          <a href="#panels" data-testid="footer-link-panels">Сэндвич-панели</a>
          <a href="#structures" data-testid="footer-link-structures">Конструкции</a>
          <a href="#workflow" data-testid="footer-link-workflow">Процесс</a>
          <a href="#contacts" data-testid="footer-link-contacts">Запросить расчёт</a>
        </div>
        <div className="footer-block">
          <h3>Правовая информация</h3>
          <p>Политика обработки обращений — в рабочей редакции.</p>
          <p>Проектные данные не передаём третьим лицам без согласования.</p>
          <p>Материалы сайта не являются официальным предложением.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ЗМК СМС-РЕСУРС / Новосибирск</span>
        <span>Металлоконструкции · партнёрские решения · поставка</span>
      </div>
    </footer>
  );
}

function CookieBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem('sms-resurs-cookie-choice') !== 'accepted' && localStorage.getItem('sms-resurs-cookie-choice') !== 'dismissed');
  }, []);

  const choose = (choice: 'accepted' | 'dismissed') => {
    localStorage.setItem('sms-resurs-cookie-choice', choice);
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <aside className="cookie-bar" role="dialog" aria-label="Уведомление о cookie" data-testid="cookie-bar">
      <p>Мы используем только технические cookie, чтобы сайт работал корректно. Продолжая просмотр, вы принимаете это условие.</p>
      <div className="cookie-actions">
        <button type="button" onClick={() => choose('dismissed')} data-testid="button-dismiss-cookies">Скрыть</button>
        <button type="button" onClick={() => choose('accepted')} data-testid="button-accept-cookies">Принять</button>
      </div>
    </aside>
  );
}

function MobileContactBar() {
  return (
    <div className="mobile-contact-bar" aria-label="Связаться с СМС-РЕСУРС" data-testid="mobile-contact-bar">
      <a className="mobile-contact-brand" href="#top" aria-label="В начало страницы">
        <img src={`${assetBase}brand/sms-resurs-mark.svg`} alt="СМС-РЕСУРС" />
      </a>
      <a className="mobile-contact-link mobile-max-link" href={maxChatLink} target="_blank" rel="noreferrer" aria-label="Написать в MAX" data-testid="mobile-contact-max">
        <MessageCircle size={18} aria-hidden="true" />
        <span>MAX</span>
      </a>
      <a className="mobile-contact-link" href="tel:+79069624358" data-testid="mobile-contact-phone">
        <Phone size={18} aria-hidden="true" />
        <span>8 906 962 43 58</span>
      </a>
    </div>
  );
}

function LandingPage() {
  useRevealOnScroll();
  return (
    <div className="site-shell">
      <Header />
      <main>
        <Hero />
        <Stats />
        <Services />
        <Glazing />
        <SandwichPanels />
        <FireProtection />
        <Structures />
        <Cases />
        <Workflow />
        <Proof />
        <SearchFaq />
        <Contact />
      </main>
      <Footer />
      <MobileContactBar />
      <CookieBar />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;