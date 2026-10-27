import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Download, Search, X } from 'lucide-react';
import { Link } from 'wouter';
import { referenceProjects, referencePdfPath } from '@/data/reference-projects';
import './reference-list.css';

const NA = 'не указано';
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
type YearFilter = 'all' | 'unknown' | number;

const referenceSeo = {
  title: 'Референс-лист металлоконструкций 2023–2026 | ЗМК СМС-РЕСУРС',
  description: 'Референс-лист ЗМК СМС-РЕСУРС за 2023–2026 годы: объекты, места, объёмы и даты начала. Сведения о заказчиках не публикуются.',
  canonical: 'https://xn----8sbtjdcksrjl.xn--p1ai/referens-list',
};

export default function ReferenceList() {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<YearFilter>('all');
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

  useEffect(() => {
    const previousTitle = document.title;
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.getAttribute('href') ?? null;
    const metaValues = [
      ['name', 'description', referenceSeo.description],
      ['property', 'og:title', referenceSeo.title],
      ['property', 'og:description', referenceSeo.description],
      ['property', 'og:url', referenceSeo.canonical],
      ['name', 'twitter:title', referenceSeo.title],
      ['name', 'twitter:description', referenceSeo.description],
    ] as const;
    const previousMeta = metaValues.map(([attribute, key]) => {
      const element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      return { element, content: element?.getAttribute('content') ?? null };
    });

    document.title = referenceSeo.title;
    canonical?.setAttribute('href', referenceSeo.canonical);
    metaValues.forEach(([attribute, key, content]) => {
      document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.setAttribute('content', content);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => {
      document.title = previousTitle;
      if (canonical && previousCanonical) canonical.setAttribute('href', previousCanonical);
      previousMeta.forEach(({ element, content }) => {
        if (element && content !== null) element.setAttribute('content', content);
      });
    };
  }, []);

  const years = useMemo(
    () => Array.from(new Set(referenceProjects.map((p) => p.year).filter((y): y is number => y !== null))).sort(),
    [],
  );
  const hasUnknown = referenceProjects.some((p) => p.year === null);
  const known = referenceProjects.filter((p) => p.tonnes !== null);
  const totalKnown = known.reduce((s, p) => s + (p.tonnes ?? 0), 0);

  const q = query.trim().toLowerCase();
  const rows = referenceProjects.filter((p) => {
    if (year === 'unknown' ? p.year !== null : year !== 'all' && p.year !== year) return false;
    return !q || `${p.name} ${p.location}`.toLowerCase().includes(q);
  });
  const reset = () => { setQuery(''); setYear('all'); };

  const chips: { key: string; value: YearFilter; label: string }[] = [
    { key: 'all', value: 'all', label: 'Все' },
    ...years.map((y) => ({ key: String(y), value: y as YearFilter, label: String(y) })),
    ...(hasUnknown ? [{ key: 'unknown', value: 'unknown' as YearFilter, label: 'Дата не указана' }] : []),
  ];

  return (
    <div className="ref-page">
      <header className="ref-top">
        <Link href="/" className="ref-brand" data-testid="link-ref-home">
          <img src={`${base}brand/sms-resurs-logo.svg`} alt="ЗМК СМС-РЕСУРС" />
        </Link>
        <Link href="/" className="ref-back" data-testid="link-ref-back">
          <ArrowLeft size={14} aria-hidden="true" /> На главную
        </Link>
      </header>

      <main className="ref-main">
        <section className="ref-hero">
          <span className="eyebrow">Опыт поставок · 2023–2026</span>
          <h1 className="display">Референс-лист</h1>
          <p>
            Публичный перечень объектов. Даты указывают на начало реализации, а не на срок завершения
            или поставки. Сведения о заказчиках в списке не публикуются.
          </p>
          <div className="ref-document-actions">
            <a className="button-primary ref-download" href={referencePdfPath} download="СМС-РЕСУРС референс-лист 2023-2026 публичная копия.pdf" data-testid="link-ref-download">
              <Download size={16} aria-hidden="true" /> Скачать PDF без заказчиков
            </a>
            <a className="ref-document-open" href={referencePdfPath} target="_blank" rel="noopener noreferrer" data-testid="link-ref-open">
              Открыть публичную копию <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <small className="ref-file">PDF, 3 страницы. Сведения о заказчиках удалены; это не подписанный оригинал.</small>
          <dl className="ref-figures">
            <div><dt>Записей в списке</dt><dd>{referenceProjects.length}</dd></div>
            <div><dt>Известный объём, т</dt><dd>{fmt(totalKnown)}</dd></div>
            <div><dt>Годы начала</dt><dd>{years[0]}–{years[years.length - 1]}</dd></div>
          </dl>
          <p className="ref-caption">
            Объём — сумма значений, указанных в списке ({known.length} из {referenceProjects.length} записей).
          </p>
        </section>

        <section aria-label="Поиск и фильтры" className="ref-controls">
          <label className="ref-search">
            <Search size={16} aria-hidden="true" />
            <span className="ref-sr">Поиск по названию или месту</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }} placeholder="Название или место" data-testid="input-ref-search" />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Очистить поиск"><X size={14} /></button>
            )}
          </label>
          <div className="ref-chips" role="group" aria-label="Год начала реализации">
            {chips.map((c) => (
              <button key={c.key} type="button" aria-pressed={year === c.value} className={year === c.value ? 'is-on' : ''} onClick={() => setYear(c.value)} data-testid={`button-ref-year-${c.key}`}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="ref-count" role="status" aria-live="polite">Показано {rows.length} из {referenceProjects.length}</p>
        </section>

        {rows.length === 0 ? (
          <div className="ref-empty" data-testid="status-ref-empty">
            <strong>Ничего не найдено</strong>
            <span>Измените запрос или снимите фильтр по году.</span>
            <button type="button" className="button-ghost" onClick={reset} data-testid="button-ref-reset">Сбросить поиск и фильтры</button>
          </div>
        ) : (
          <div className="ref-table-wrap">
            <table className="ref-table">
              <caption className="ref-sr">Референс-объекты. Дата — начало реализации.</caption>
              <thead>
                <tr>
                  <th scope="col">№</th><th scope="col">Объект</th><th scope="col">Место</th>
                  <th scope="col" className="num">Объём, т</th><th scope="col">Начало реализации</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} data-testid={`row-ref-${p.id}`}>
                    <td data-label="№" className="id">{String(p.id).padStart(2, '0')}</td>
                    <th scope="row" data-label="Объект">{p.name}</th>
                    <td data-label="Место" className={p.location ? '' : 'na'}>{p.location || NA}</td>
                    <td data-label="Объём, т" className={`num${p.tonnes === null ? ' na' : ''}`}>{p.tonnes === null ? NA : fmt(p.tonnes)}</td>
                    <td data-label="Начало реализации" className={p.date ? '' : 'na'}>{p.date ?? NA}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="ref-caption">
          Поля «не указано» не заполнены в исходном документе. Данные объекта № 47 уточнены компанией:
          объём — 104 т, начало реализации — август 2026 г.
        </p>
        <Link href="/" className="ref-back ref-back-bottom" data-testid="link-ref-back-bottom"><ArrowLeft size={14} aria-hidden="true" /> Вернуться на главную</Link>
      </main>
    </div>
  );
}
