export interface ClientConfig {
  name: string
  sheetId: string
  sheetName?: string // název tabu — použij buď sheetName nebo gid
  gid?: string       // číslo tabu z URL (#gid=...)
}

// Přidat nového klienta = jeden řádek zde
export const CLIENTS: ClientConfig[] = [
  { name: 'CreatiCom',    sheetId: '1aVxtxruJdXh7UP4mxhqCy6sISP2s4ju5G6fOCKsqXBo', sheetName: 'CC_zpětné odkazy' },
  { name: 'Influencom',   sheetId: '1aVxtxruJdXh7UP4mxhqCy6sISP2s4ju5G6fOCKsqXBo', sheetName: 'Influ_Zpětné odkazy' },
  { name: 'KKD Industries', sheetId: '1RI-i-CtPMi4iXBX4CantQXKtqTHA-IIRreuN8qFsNMQ', sheetName: 'Zpětné odkazy' },
  { name: 'FINREG Partners', sheetId: '1tgCumOq0Ufao_poy0S-h-M5jEkuPEe7eM0AMtkrQpRw', sheetName: 'Zpětné odkazy' },
  { name: 'DITON', sheetId: '1jnz0GCnWP5da5fI3rtKK0jyMw5igcwcgBODWxdTV_Pc', sheetName: 'Zpětné odkazy' },
  { name: 'BuddhaBar', sheetId: '101yLzCVYE7i47Ep6_9BVngJrzjoe8CiuvScO18uK04s', sheetName: 'LinkBuilding' },
  { name: 'Somavedic', sheetId: '19LPILTCVOGaAlteKGDZ3zQ0YtW1yeTAMf9XYAovgzVg', gid: '58177701' },
  { name: 'VirginGrip', sheetId: '1x7LwQ_d32Yj-KCcngeGQgJHLjjAHULEI-VProThiq6E', sheetName: 'Linkbilding' },
  { name: 'Logicor Příšovice', sheetId: '14cgw3vx0o7EpTprIcH-rLFaczOD-Vn2ekIY0Q2XdqGo', sheetName: 'Odkazy Příšovice' },
  { name: 'Logicor Průmyslová', sheetId: '14cgw3vx0o7EpTprIcH-rLFaczOD-Vn2ekIY0Q2XdqGo', sheetName: 'Odkazy Průmyslová' },
  { name: 'Matěj Kotrby', sheetId: '17fedYCn-XBz19LpYvuKKQOPYvGI0kNMjeeW4FKGz14I', sheetName: 'Zpětné odkazy' },
  { name: 'DiamantExpo', sheetId: '15ZfBWYglEIsQ1iGcpWzykBXXGaaUSJ4K05oORqEw_Tc', sheetName: 'Zpětné odkazy' },
  { name: 'Marina', sheetId: '1HOaZWVlFmq70RU_1jlWkGxz8VpcLuRTDlyEbN0PzDjc', sheetName: 'Zpětné odkazy' },
  { name: 'Cybreg', sheetId: '1mXk96O0aS8uqkSYYBFqt94Y0R3lku_AdMh9u9Qvp-nM', sheetName: 'Zpětné odkazy Cybreg' },
  { name: 'SýkoraIT', sheetId: '1mXk96O0aS8uqkSYYBFqt94Y0R3lku_AdMh9u9Qvp-nM', sheetName: 'Zpětné odkazy Sýkora IT' },
  // Ostatní klienti — doplnit:
  // { name: 'Klient X', sheetId: '...', gid: '0' },
]
