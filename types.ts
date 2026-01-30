
export enum TimeFrame {
  H1 = '1H',
  H4 = '4H',
  D1 = '1D',
  W1 = '1W',
  M1 = '1M'
}

export interface StockData {
  symbol: string;
  companyName: string;
  price: number; // Đây là Giá Khớp Lệnh
  change: number;
  changePercent: number;
  volume: number;
  ma20: number;
  ma50: number;
  rsi: number;
  rrg: RRGQuadrant;
  stoch: { k: number; d: number };
  cci: number;
  targetPriceHigh: number;
  targetPriceLow: number;
  buyVolume: number;
  sellVolume: number;
  // Fundamental metrics
  roi: number;
  roe: number;
  pe: number;
  auditStatus: string;
  // Price boundaries
  ceilingPrice: number; // Giá Trần (T)
  floorPrice: number;   // Giá Sàn (S)
  refPrice: number;     // Giá Tham chiếu (TC)
  // Market Depth (Best quote)
  bid1: number;         // Giá Mua 1 tốt nhất
  ask1: number;         // Giá Bán 1 tốt nhất
}

export enum RRGQuadrant {
  LEADING = 'LEADING',
  WEAKENING = 'WEAKENING',
  LAGGING = 'LAGGING',
  IMPROVING = 'IMPROVING'
}

export interface NewsItem {
  id: string;
  symbol: string;
  title: string;
  source: string;
  time: string;
  url: string;
}

export interface Recommendation {
  id: string;
  title: string;
  type: 'BUY' | 'SELL' | 'HOLD';
  content: string;
  source: string;
}

export interface IPOItem {
  name: string;
  expectedDate: string;
  sector: string;
  status: string;
}

export interface AllocationResult {
  symbol: string;
  companyName: string;
  sectorName: string;
  weight: number;
  amount: number;
  shares: number;
  expectedReturnRate: number;
  expectedProfit: number;
  trendScore: number;
  rrg: RRGQuadrant;
  adviceDetail: string;
  timeframeAdvice: string;
  stochStatus: string;
  cciStatus: string;
  buyStrengthPercent: number;
  totalVolume: number;
  buyFlowValue: number;
  sellFlowValue: number;
  netFlowValue: number;
  sentimentScore: number;
  sentimentLabel: string;
  impactPricePercent: number;
  roi: number;
  roe: number;
  pe: number;
  auditStatus: string;
  // Price for coloring logic
  price: number;
  ceilingPrice: number;
  floorPrice: number;
  refPrice: number;
  bid1: number;
  ask1: number;
}

export interface PortfolioInputs {
  totalCapital: number;
  targetProfit: number;
  targetProfitPercent: number;
  symbols: string[];
  timeFrame: TimeFrame;
}
