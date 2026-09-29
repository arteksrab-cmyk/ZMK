import './_group.css';

const services = [
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

function GlazingVisual() {
  return (
    <figure className="glazing-preview-visual">
      <img className="glazing-preview-photo" src="/__mockup/images/zmk-window-glazing.jpg" alt="" />
      <img className="glazing-preview-watermark" src="/__mockup/images/zmk-sokol-logo.svg" alt="" />
    </figure>
  );
}

function ServicesGrid() {
  return (
    <div className="glazing-preview-grid">
      {services.map((service) => (
        <article className="glazing-preview-card" key={service.index}>
          <span className="glazing-preview-index">{service.index}</span>
          <h3>{service.title}</h3>
          <p>{service.description}</p>
        </article>
      ))}
    </div>
  );
}

export function CurrentGlazing() {
  return (
    <main className="glazing-preview glazing-preview-current">
      <div className="glazing-preview-inner">
        <div className="glazing-preview-layout">
          <header className="glazing-preview-left">
            <span className="glazing-preview-eyebrow">02 / Партнёрские решения</span>
            <h1 className="glazing-preview-title">Окна, двери<br />и перегородки.</h1>
          </header>
          <div className="glazing-preview-intro">
            <GlazingVisual />
            <p className="glazing-preview-copy">
              ЗМК СМС-РЕСУРС не изготавливает окна и стеклянные изделия самостоятельно.
              Под задачу проекта можем рекомендовать наших партнёров по изготовлению и
              поставке окон, дверей, стеклопакетов и перегородок, а также помочь с
              подбором решения по рабочей документации.
            </p>
          </div>
        </div>
        <ServicesGrid />
        <footer className="glazing-preview-note">
          <span>Рекомендация партнёров · решение под проект</span>
          <span>Работаем по всей России</span>
        </footer>
      </div>
    </main>
  );
}