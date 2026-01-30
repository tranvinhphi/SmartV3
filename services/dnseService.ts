
import { StockData, RRGQuadrant, NewsItem, Recommendation, IPOItem } from '../types';

export interface SectorData {
  name: string;
  status: RRGQuadrant;
  strength: number;
  topSymbols: string[];
}

export class DNSEService {
  private static mockDatabase: Record<string, { price: number; rrg: RRGQuadrant; name: string; roi: number; roe: number; pe: number; audit: string; refPrice?: number }> = {
    'FPT': { name: 'Công ty CP FPT', price: 104100, rrg: RRGQuadrant.LEADING, roi: 22.5, roe: 28.1, pe: 18.2, audit: 'Big4 - Sạch' },   
    'HPG': { name: 'Tập đoàn Hòa Phát', price: 27000, rrg: RRGQuadrant.IMPROVING, roi: 12.8, roe: 15.4, pe: 11.5, audit: 'Big4 - Sạch' },  
    'GAS': { name: 'Tổng Công ty Khí Việt Nam', price: 114100, rrg: RRGQuadrant.WEAKENING, roi: 18.2, roe: 21.0, pe: 14.8, audit: 'A&C - Sạch' }, 
    'BID': { name: 'Ngân hàng BIDV', price: 51500, rrg: RRGQuadrant.LEADING, roi: 1.2, roe: 18.5, pe: 12.1, audit: 'KPMG - Sạch' },    
    'PLX': { name: 'Tập đoàn Xăng dầu Việt Nam', price: 56800, rrg: RRGQuadrant.LAGGING, roi: 8.5, roe: 11.2, pe: 15.6, audit: 'Big4 - Sạch' },    
    'VND': { name: 'Chứng khoán VNDIRECT', price: 18750, rrg: RRGQuadrant.IMPROVING, roi: 10.1, roe: 14.2, pe: 9.8, audit: 'Deloitte - Sạch' },
    'VIC': { name: 'Tập đoàn Vingroup', price: 41500, rrg: RRGQuadrant.LAGGING, roi: 4.2, roe: 6.8, pe: 28.4, audit: 'Big4 - Sạch' },
    'VNM': { name: 'Sữa Việt Nam (Vinamilk)', price: 67500, rrg: RRGQuadrant.IMPROVING, roi: 24.1, roe: 32.5, pe: 16.2, audit: 'Big4 - Sạch' },
    'SSI': { name: 'Chứng khoán SSI', price: 33200, rrg: RRGQuadrant.LEADING, roi: 11.4, roe: 15.8, pe: 12.5, audit: 'Big4 - Sạch' },
    'TCB': { name: 'Ngân hàng Techcombank', price: 23800, rrg: RRGQuadrant.LEADING, roi: 2.8, roe: 21.4, pe: 7.2, audit: 'Big4 - Sạch' },
    'VCB': { name: 'Ngân hàng Vietcombank', price: 92500, rrg: RRGQuadrant.LEADING, roi: 3.1, roe: 24.8, pe: 14.5, audit: 'Big4 - Sạch' },
    'DGC': { name: 'Hóa chất Đức Giang', price: 121000, rrg: RRGQuadrant.LEADING, roi: 35.4, roe: 42.1, pe: 8.4, audit: 'Sạch' },
    'MWG': { name: 'Thế Giới Di Động', price: 62500, rrg: RRGQuadrant.WEAKENING, roi: 9.8, roe: 14.1, pe: 22.4, audit: 'PwC - Sạch' },
    'FRT': { name: 'Bán lẻ Kỹ thuật số FPT', price: 155000, rrg: RRGQuadrant.LEADING, roi: 14.2, roe: 18.5, pe: 45.2, audit: 'Big4 - Sạch' },
    'CTG': { name: 'Ngân hàng VietinBank', price: 34500, rrg: RRGQuadrant.LEADING, roi: 1.1, roe: 17.2, pe: 8.9, audit: 'Big4 - Sạch' },
    'DBC': { name: 'Tập đoàn Dabaco', price: 31200, rrg: RRGQuadrant.IMPROVING, roi: 12.1, roe: 16.4, pe: 10.5, audit: 'Sạch' },
    'VHM': { name: 'Vinhomes', price: 42000, rrg: RRGQuadrant.LAGGING, roi: 15.8, roe: 22.4, pe: 5.2, audit: 'Big4 - Sạch' },
    'MSN': { name: 'Tập đoàn Masan', price: 78000, rrg: RRGQuadrant.IMPROVING, roi: 6.4, roe: 9.1, pe: 35.2, audit: 'Big4 - Sạch' },
    'GVR': { name: 'Cao su Việt Nam', price: 32500, rrg: RRGQuadrant.LEADING, roi: 8.2, roe: 11.5, pe: 18.4, audit: 'Sạch' },
    'REE': { name: 'Cơ Điện Lạnh', price: 64000, rrg: RRGQuadrant.IMPROVING, roi: 14.5, roe: 19.2, pe: 10.1, audit: 'Sạch' },
    'CTR': { name: 'Viettel Construction', price: 118000, rrg: RRGQuadrant.LEADING, roi: 16.8, roe: 22.5, pe: 19.4, audit: 'Big4 - Sạch' },
    'VTP': { name: 'Viettel Post', price: 89000, rrg: RRGQuadrant.LEADING, roi: 15.1, roe: 20.4, pe: 22.1, audit: 'Big4 - Sạch' },
    'HAH': { name: 'Vận tải Hải An', price: 45000, rrg: RRGQuadrant.IMPROVING, roi: 18.4, roe: 24.1, pe: 7.5, audit: 'Sạch' },
    'SCS': { name: 'Dịch vụ Hàng hóa Sài Gòn', price: 82000, rrg: RRGQuadrant.LEADING, roi: 45.2, roe: 52.4, pe: 11.2, audit: 'Sạch' }
  };

  private static isMarketOpen() {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const hour = now.getHours();
    const min = now.getMinutes();
    const time = hour * 100 + min;
    return (time >= 900 && time <= 1130) || (time >= 1300 && time <= 1500);
  }

  static async getMarketData(symbols: string[]): Promise<StockData[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    const marketOpen = this.isMarketOpen();

    return symbols.map(symbol => {
      const sym = symbol.toUpperCase();
      const mock = this.mockDatabase[sym] || { name: 'Doanh nghiệp chưa niêm yết', price: 50000, rrg: RRGQuadrant.LAGGING, roi: 10, roe: 12, pe: 15, audit: 'N/A' };
      const refPrice = mock.refPrice || mock.price;
      const ceilingPrice = Math.round(refPrice * 1.07 / 10) * 10;
      const floorPrice = Math.round(refPrice * 0.93 / 10) * 10;
      
      let currentPrice = refPrice;

      if (marketOpen) {
        // Nếu thị trường mở, giá nhảy random (giả lập khớp lệnh liên tục)
        const rand = Math.random();
        if (rand > 0.98) currentPrice = ceilingPrice;
        else if (rand < 0.02) currentPrice = floorPrice;
        else currentPrice = refPrice * (0.97 + Math.random() * 0.06);
      } else {
        // Nếu thị trường đóng, dùng giá chốt phiên (cố định)
        // Dùng hash của symbol để giá chốt luôn nhất quán cho mỗi mã
        const hash = sym.charCodeAt(0) + sym.charCodeAt(1) + sym.charCodeAt(2);
        const closingFactor = 0.98 + (hash % 4) / 100; // Cố định trong khoảng +/- 2%
        currentPrice = refPrice * closingFactor;
      }
      
      currentPrice = Math.round(currentPrice / 10) * 10;

      const bid1 = Math.round(currentPrice * (marketOpen ? (0.998 + Math.random() * 0.001) : 0.999) / 10) * 10;
      const ask1 = Math.round(currentPrice * (marketOpen ? (1.001 + Math.random() * 0.001) : 1.001) / 10) * 10;

      const bVol = marketOpen ? (Math.random() * 1000000) : 500000;
      const sVol = marketOpen ? (Math.random() * 1000000) : 400000;

      return {
        symbol: sym,
        companyName: mock.name,
        price: currentPrice, // GIÁ KHỚP (Realtime) hoặc GIÁ CHỐT PHIÊN (Closed)
        change: currentPrice - refPrice,
        changePercent: ((currentPrice - refPrice) / refPrice) * 100,
        volume: bVol + sVol,
        ma20: currentPrice * (0.95 + Math.random() * 0.1),
        ma50: currentPrice * (0.9 + Math.random() * 0.1),
        rsi: 30 + Math.random() * 50,
        rrg: mock.rrg,
        stoch: { k: Math.random() * 100, d: Math.random() * 100 },
        cci: (Math.random() - 0.5) * 300,
        targetPriceHigh: currentPrice * (1.1 + Math.random() * 0.05),
        targetPriceLow: currentPrice * (0.9 - Math.random() * 0.05),
        buyVolume: bVol,
        sellVolume: sVol,
        roi: mock.roi,
        roe: mock.roe,
        pe: mock.pe,
        auditStatus: mock.audit,
        ceilingPrice,
        floorPrice,
        refPrice,
        bid1,
        ask1
      };
    });
  }

  static getTopStocks(): string[] {
    return ['FPT', 'BID', 'SSI', 'TCB', 'VCB', 'DGC', 'FRT', 'CTG', 'DBC', 'HPG', 'MSN', 'VHM', 'GVR', 'CTR', 'VTP', 'REE', 'HAH', 'SCS', 'CMG', 'SAB'];
  }

  static getSectorAnalysis(): SectorData[] {
    return [
      { name: 'Công nghệ & Viễn thông', status: RRGQuadrant.LEADING, strength: 95, topSymbols: ['FPT', 'CMG', 'CTR', 'ELC'] },
      { name: 'Ngân hàng', status: RRGQuadrant.LEADING, strength: 88, topSymbols: ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB'] },
      { name: 'Vận tải & Logistics', status: RRGQuadrant.LEADING, strength: 82, topSymbols: ['VTP', 'HAH', 'SCS', 'GMD'] },
      { name: 'Chứng khoán', status: RRGQuadrant.IMPROVING, strength: 72, topSymbols: ['SSI', 'VND', 'VCI', 'HCM', 'FTS'] },
      { name: 'Sản xuất & Thép', status: RRGQuadrant.IMPROVING, strength: 65, topSymbols: ['HPG', 'HSG', 'NKG', 'DGC'] },
      { name: 'Bán lẻ', status: RRGQuadrant.WEAKENING, strength: 48, topSymbols: ['MWG', 'FRT', 'PNJ'] },
      { name: 'Bất động sản', status: RRGQuadrant.LAGGING, strength: 25, topSymbols: ['VIC', 'VHM', 'NVL', 'DIG', 'PDR'] },
      { name: 'Năng lượng', status: RRGQuadrant.WEAKENING, strength: 45, topSymbols: ['GAS', 'PVD', 'PVS', 'PLX', 'POW'] },
    ];
  }

  static getMockNews(symbols: string[]): NewsItem[] {
    const news: NewsItem[] = [];
    symbols.forEach((s, idx) => {
      news.push({
        id: `news-${idx}-1`,
        symbol: s,
        title: `Tín hiệu tích cực từ dòng tiền thông minh đổ vào mã ${s} cuối phiên`,
        source: 'Cafef',
        time: '1 giờ trước',
        url: 'https://cafef.vn/'
      });
      news.push({
        id: `news-${idx}-2`,
        symbol: s,
        title: `Phân tích triển vọng lợi nhuận năm 2026 của doanh nghiệp ${s}`,
        source: 'Vietstock',
        time: '4 giờ trước',
        url: 'https://vietstock.vn/'
      });
    });
    return news;
  }

  static getDailyRecommendations(): Recommendation[] {
    const today = new Date().toLocaleDateString('vi-VN');
    return [
      { 
        id: 'rec-fpt', 
        type: 'BUY', 
        title: `[${today}] Siêu cổ phiếu FPT`, 
        content: 'Duy trì đà tăng trưởng 2 con số từ mảng Cloud & AI. Ưu tiên giải ngân khi có nhịp chỉnh về MA20.', 
        source: 'DNSE Research' 
      },
      { 
        id: 'rec-vtp', 
        type: 'BUY', 
        title: `[${today}] Kỳ vọng VTP chuyển sàn`, 
        content: 'Viettel Post đang hưởng lợi lớn từ TMĐT. Tin tức chuyển sàn HOSE sẽ là động lực tăng giá mạnh mẽ.', 
        source: 'TCBS Advisor' 
      },
      { 
        id: 'rec-ctr', 
        type: 'BUY', 
        title: `[${today}] Đón sóng 5G cùng CTR`, 
        content: 'CTR là doanh nghiệp hưởng lợi trực tiếp nhất từ việc triển khai hạ tầng 5G tại Việt Nam.', 
        source: 'VNINDEX News' 
      },
      { 
        id: 'rec-hpg', 
        type: 'HOLD', 
        title: `[${today}] Nắm giữ HPG chờ Dung Quất 2`, 
        content: 'Chờ đợi điểm rơi lợi nhuận khi dự án Dung Quất 2 đi vào hoạt động chính thức cuối năm.', 
        source: 'RongViet Securities' 
      },
      { 
        id: 'rec-scs', 
        type: 'BUY', 
        title: `[${today}] Logistics hàng không hồi phục`, 
        content: 'SCS có biên lợi nhuận gộp cực cao, tiềm năng tăng trưởng từ việc phục hồi xuất khẩu linh kiện điện tử.', 
        source: 'SSI Research' 
      }
    ];
  }

  static getIPO2026(): IPOItem[] {
    return [
      { name: 'VinFast Green Logistics', expectedDate: 'Q2/2026', sector: 'Vận tải', status: 'Đang làm hồ sơ' },
      { name: 'Viettel Digital Bank', expectedDate: 'Q3/2026', sector: 'Tài chính số', status: 'Dự kiến' },
      { name: 'Thaco Auto Global', expectedDate: 'Q4/2026', sector: 'Công nghiệp', status: 'Lên kế hoạch' },
      { name: 'Giaohangtietkiem (GHTK)', expectedDate: 'Q2/2026', sector: 'Logistics', status: 'Dự kiến niêm yết' },
    ];
  }

  static validateSymbol(symbol: string): boolean {
    return /^[A-Z0-9]{3}$/.test(symbol.toUpperCase());
  }
}
