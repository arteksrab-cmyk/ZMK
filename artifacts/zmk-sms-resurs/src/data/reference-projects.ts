export type ReferenceProject = {
  id: number;
  name: string;
  location: string;
  tonnes: number | null;
  date: string | null;
  year: number | null;
  customer?: string;
};

// Transcribed from the signed reference list, with company-confirmed corrections.
// Null means the source cell is blank and no clarification has been provided.
// Keep the original numbering to make reconciliation with the PDF straightforward.
export const referenceProjects: ReferenceProject[] = [
  { id: 1, name: 'ЛДС', location: 'Губкинский', tonnes: 380, date: 'Октябрь 2023', year: 2023 },
  { id: 2, name: 'Фельдшерско-акушерский пункт', location: 'Новосибирск', tonnes: 21, date: 'Декабрь 2023', year: 2023 },
  { id: 3, name: 'Комплекс АБК, гараж', location: 'Владивосток', tonnes: 301, date: 'Январь 2024', year: 2024 },
  { id: 4, name: 'Лыжная база', location: 'Краснообск', tonnes: 41, date: 'Январь 2024', year: 2024 },
  { id: 5, name: 'Складской комплекс', location: 'Барнаул', tonnes: 182, date: 'Январь 2024', year: 2024 },
  { id: 6, name: 'ОПУ Сухой Лог', location: 'Свердловская область', tonnes: 29, date: 'Март 2024', year: 2024 },
  { id: 7, name: 'Стойки МШК', location: 'Иркутская область', tonnes: 18, date: 'Март 2024', year: 2024 },
  { id: 8, name: 'Элементы и материалы для ограждения', location: 'Южно-Сахалинск', tonnes: 7, date: 'Апрель 2024', year: 2024 },
  { id: 9, name: 'ПК «Кадалинский»', location: 'Чита', tonnes: 27, date: 'Апрель 2024', year: 2024 },
  { id: 10, name: 'Навес', location: 'Новосибирск', tonnes: 8, date: 'Май 2024', year: 2024 },
  { id: 11, name: 'Навес', location: 'Новосибирск', tonnes: 4, date: 'Май 2024', year: 2024 },
  { id: 12, name: 'Проект «Фонари»', location: 'Киров', tonnes: 55, date: 'Май 2024', year: 2024 },
  { id: 13, name: 'Банный комплекс Царицино', location: 'Южно-Сахалинск', tonnes: 111, date: 'Май 2024', year: 2024 },
  { id: 14, name: 'Навес', location: 'Новосибирск', tonnes: 16, date: 'Июнь 2024', year: 2024 },
  { id: 15, name: 'Тепличный комплекс', location: 'Магадан', tonnes: 130, date: 'Июнь 2024', year: 2024 },
  { id: 16, name: 'Склад по улице Большая', location: 'Новосибирск', tonnes: 37.5, date: 'Июль 2024', year: 2024 },
  { id: 17, name: 'Ограждения', location: 'Петропавловск-Камчатский', tonnes: 10, date: 'Август 2024', year: 2024 },
  { id: 18, name: 'Горнолыжный комплекс «Снежная»', location: 'Магадан', tonnes: 125, date: 'Август 2024', year: 2024 },
  { id: 19, name: 'Горнолыжный комплекс им. Вяльбе', location: 'Магадан', tonnes: 125, date: 'Август 2024', year: 2024 },
  { id: 20, name: 'Наружные газопроводы. Вантовый переход', location: 'Айхал', tonnes: 9, date: 'Сентябрь 2024', year: 2024 },
  { id: 21, name: 'Склад Магадан', location: 'Магадан', tonnes: 96, date: 'Октябрь 2024', year: 2024 },
  { id: 22, name: 'Жалюзийные решётки ЖК Ельцовский', location: '', tonnes: 1, date: 'Октябрь 2024', year: 2024 },
  { id: 23, name: 'Трибуны, лыжный комплекс', location: 'Магадан', tonnes: 48, date: 'Октябрь 2024', year: 2024 },
  { id: 24, name: 'Автоматизированный мусороперерабатывающий комплекс КПО Сибирь. Пункт ТО с мойкой', location: 'Томск', tonnes: 82, date: 'Октябрь 2024', year: 2024 },
  { id: 25, name: 'Техническое перевооружение ТЭЦ филиала ОТЭК', location: 'Северск', tonnes: 46, date: 'Ноябрь 2024', year: 2024 },
  { id: 26, name: 'Шпиль для банного комплекса Мира', location: '', tonnes: 1, date: 'Декабрь 2024', year: 2024 },
  { id: 27, name: 'Ограждения', location: 'Петропавловск-Камчатский', tonnes: 7, date: 'Декабрь 2024', year: 2024 },
  { id: 28, name: 'Спортивно-оздоровительный комплекс «Северный Артек»', location: 'Магадан', tonnes: 301, date: 'Январь 2025', year: 2025 },
  { id: 29, name: 'Пристрой к гимназии на 176 учащихся', location: 'Белая Гора, Абыйский улус', tonnes: 29, date: 'Январь 2025', year: 2025 },
  { id: 30, name: 'Мясной цех', location: 'Южно-Сахалинск', tonnes: 14, date: 'Апрель 2025', year: 2025 },
  { id: 31, name: 'Реконструкция нефтеналивной эстакады ТЭЦ-2 на 3 поста налива. Навес для нужд филиала «Камчатские ТЭЦ»', location: 'Петропавловск-Камчатский', tonnes: 55, date: 'Август 2025', year: 2025 },
  { id: 32, name: 'Теплицы', location: 'Грозный', tonnes: 25, date: 'Август 2025', year: 2025 },
  { id: 33, name: 'Ограждения территории здания ОМВД', location: 'Магадан', tonnes: 9.5, date: 'Сентябрь 2025', year: 2025 },
  { id: 34, name: 'Пристройка по адресу ул. Красный проспект, 171а', location: 'Новосибирск', tonnes: 8, date: 'Сентябрь 2025', year: 2025 },
  { id: 35, name: 'Цех древесных плит', location: 'Кемерово', tonnes: 1015, date: 'Октябрь 2025', year: 2025, customer: 'Кемеровский ДОК' },
  { id: 36, name: 'Всесезонный трамплинный комплекс для подготовки спортивного резерва', location: 'Магадан', tonnes: 52, date: 'Октябрь 2025', year: 2025 },
  { id: 37, name: 'Дом культуры (фермы)', location: 'Онор', tonnes: 2, date: 'Декабрь 2025', year: 2025 },
  { id: 38, name: 'Горнолыжный комплекс. Трибуны, судейские вышки', location: 'Магадан', tonnes: 70, date: 'Декабрь 2025', year: 2025 },
  { id: 39, name: 'Приют для животных без владельцев', location: 'Остров Кунашир', tonnes: 67, date: 'Январь 2026', year: 2026 },
  { id: 40, name: 'Реконструкция торгового центра «Русь»', location: 'Южно-Курильск', tonnes: 50, date: '2026', year: 2026 },
  { id: 41, name: 'Теплицы Беларуси', location: 'Беларусь', tonnes: 194, date: 'Февраль 2026', year: 2026 },
  { id: 42, name: 'Птицефабрика', location: 'Томск', tonnes: 92, date: 'Март 2026', year: 2026, customer: 'Сибагро' },
  { id: 43, name: 'Ограждения', location: 'Петропавловск-Камчатский', tonnes: 12, date: 'Март 2026', year: 2026 },
  { id: 44, name: 'Расширение тракта топливоподачи Магаданской ТЭЦ. Галерея конвейеров № 7', location: 'Магадан', tonnes: 50, date: 'Март 2026', year: 2026 },
  { id: 45, name: 'Овощехранилище на территории курорта ALTAY VILLAGE TELETSKOE', location: '', tonnes: 136, date: 'Апрель 2026', year: 2026, customer: 'ООО Строй-Ка' },
  { id: 46, name: 'Общеобразовательная школа в микрорайоне Дальнее Куйбышево', location: 'Новокузнецк', tonnes: 506, date: 'Май 2026', year: 2026, customer: 'СДС-СТРОИ' },
  // Volume and start date confirmed by the company; these cells are blank in the original signed PDF.
  { id: 47, name: 'Объект образования (общеобразовательная школа на 1 100 мест) по ул. Николая Сотникова в Кировском районе', location: 'Новосибирск', tonnes: 104, date: 'Август 2026 г.', year: 2026, customer: 'СДС-СТРОИ' },
  { id: 48, name: 'Реконструкция здания склада с административно-бытовыми помещениями по ул. Декабристов, 269', location: 'Новосибирск', tonnes: 232, date: 'Июнь 2026', year: 2026, customer: 'ООО ГРАНДЕКС' },
  { id: 49, name: 'Стружечный цех', location: 'Кемерово', tonnes: 402, date: 'Июнь 2026', year: 2026, customer: 'Кемеровский ДОК' },
  { id: 50, name: 'Силоса', location: '', tonnes: 650, date: 'Август 2026', year: 2026, customer: 'Кемеровский ДОК' },
  { id: 51, name: 'Капитальный ремонт птичников (корпус 6 и 10), производственная площадка птицефабрики', location: '', tonnes: 188, date: 'Июнь–август 2026', year: 2026, customer: 'Голден Строй' },
  { id: 52, name: 'Модернизация ПС «Северо-Западная» 110/35/10 кВ, замена КРУН-10 кВ — 34 ячейки', location: '', tonnes: 9, date: 'Апрель 2026', year: 2026, customer: 'АльянсЭнергоСтрой' },
  { id: 53, name: 'Реконструкция кровли', location: 'Магадан', tonnes: 43.18, date: 'Февраль 2026', year: 2026, customer: 'ОрлАнс' },
  { id: 54, name: 'Шпренгельные фермы для объекта образования (общеобразовательная школа на 1 100 мест) по ул. Пролетарская', location: '', tonnes: 28.4, date: 'Апрель 2026', year: 2026, customer: 'ПКФ «Агросервис»' },
  { id: 55, name: 'Балки сварные для объекта образования (общеобразовательная школа на 1 100 мест) по ул. Пролетарская', location: '', tonnes: 7.55, date: 'Май 2026', year: 2026, customer: 'ПКФ «Агросервис»' },
  { id: 56, name: 'Опоры сотовой связи', location: 'Магадан', tonnes: 10.64, date: 'Сентябрь 2026', year: 2026 },
  { id: 57, name: 'Пристройка для аэропорта в Горном-Алтае', location: 'Горный Алтай', tonnes: 13, date: 'Сентябрь 2026', year: 2026, customer: 'ООО «НТМ ЕСО»' },
  { id: 58, name: 'Площадки обслуживания и галереи для оборудования', location: '', tonnes: 412.63, date: 'Апрель–сентябрь 2026', year: 2026, customer: 'Кемеровский ДОК' },
];

const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const referencePdfPath = `${base}documents/sms-resurs-reference-2023-2026.pdf`;
