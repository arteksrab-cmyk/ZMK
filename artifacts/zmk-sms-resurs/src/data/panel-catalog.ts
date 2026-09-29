export type PanelType = 'wall' | 'roof';
export type InsulationType = 'mineral-wool' | 'polystyrene' | 'pur-pir' | 'xps';

export const panelTypeOptions: { id: PanelType; label: string }[] = [
  { id: 'wall', label: 'Стеновые сэндвич-панели' },
  { id: 'roof', label: 'Кровельные сэндвич-панели' },
];

export const insulationOptions: { id: InsulationType; label: string }[] = [
  { id: 'mineral-wool', label: 'Минеральная вата' },
  { id: 'polystyrene', label: 'Пенополистирол' },
  { id: 'pur-pir', label: 'PUR и PIR' },
  { id: 'xps', label: 'Экструдированный пенополистирол' },
];

export type RalColor = {
  code: string;
  name: string;
  hex: string;
};

// Screen approximations sampled from the dealer's supplied RAL chart.
export const ralColors: RalColor[] = [
  { code: '1014', name: 'Слоновая кость', hex: '#DED09F' },
  { code: '1015', name: 'Светлая слоновая кость', hex: '#EADEBD' },
  { code: '1018', name: 'Цинково-жёлтый', hex: '#F3E03B' },
  { code: '2004', name: 'Чистый оранжевый', hex: '#E75B12' },
  { code: '3005', name: 'Винно-красный', hex: '#5E2028' },
  { code: '3009', name: 'Оксидно-красный', hex: '#703731' },
  { code: '3020', name: 'Транспортный красный', hex: '#C1121C' },
  { code: '5002', name: 'Ультрамариново-синий', hex: '#2B2C7C' },
  { code: '5005', name: 'Сигнально-синий', hex: '#154889' },
  { code: '5021', name: 'Водная синь', hex: '#07737A' },
  { code: '6002', name: 'Лиственно-зелёный', hex: '#276235' },
  { code: '6005', name: 'Зелёный мох', hex: '#0F4336' },
  { code: '6029', name: 'Мятно-зелёный', hex: '#007243' },
  { code: '7004', name: 'Сигнально-серый', hex: '#9EA0A1' },
  { code: '7024', name: 'Графитовый серый', hex: '#474A50' },
  { code: '7035', name: 'Светло-серый', hex: '#CBD0CC' },
  { code: '7005', name: 'Мышино-серый', hex: '#6B716F' },
  { code: '7011', name: 'Железно-серый', hex: '#555D61' },
  { code: '7047', name: 'Телегрей 4', hex: '#CFD0CF' },
  { code: '8017', name: 'Шоколадно-коричневый', hex: '#44322D' },
  { code: '8019', name: 'Серо-коричневый', hex: '#3F3A3A' },
  { code: '9002', name: 'Серо-белый', hex: '#DDDED4' },
  { code: '9003', name: 'Сигнально-белый', hex: '#F4F8F4' },
  { code: '9006', name: 'Белый алюминий', hex: '#A5A8A6' },
  { code: '9010', name: 'Чисто-белый', hex: '#F7F9EF' },
];

export const defaultRalColor = ralColors.find((color) => color.code === '5005')!;