
import { StockData, AllocationResult, PortfolioInputs, RRGQuadrant, TimeFrame } from '../types';
import { DNSEService } from './dnseService';

export class AllocationEngine {
  static getStochStatus(stoch: { k: number; d: number }): string {
    if (stoch.k >= 90) return 'Quá mua (Cực đại - Nguy cơ đỉnh)';
    if (stoch.k > 80) return 'Quá mua (Vùng đỉnh)';
    if (stoch.k <= 10) return 'Quá bán (Cực đại - Vùng đáy)';
    if (stoch.k < 20) return 'Quá bán (Tiệm cận đáy)';
    return `Ổn định (${Math.round(stoch.k)} - Sideway)`;
  }

  static getCCIStatus(cci: number): string {
    if (cci > 200) return 'Hưng phấn tột độ';
    if (cci > 100) return 'Hưng phấn (Trend mạnh)';
    if (cci < -200) return 'Hoảng loạn tột độ';
    if (cci < -100) return 'Hoảng loạn (Vùng gom)';
    return 'Bình thường (Tích lũy)';
  }

  static getTimeframeAdvice(tf: TimeFrame, rrg: RRGQuadrant): string {
    const isStrong = rrg === RRGQuadrant.LEADING || rrg === RRGQuadrant.IMPROVING;
    switch (tf) {
      case TimeFrame.H1:
      case TimeFrame.H4:
        return isStrong ? 'Lướt sóng (Mở vị thế Mua)' : 'Quan sát (Chờ tín hiệu)';
      case TimeFrame.D1:
        return isStrong ? 'Nắm giữ (Xu hướng Tăng)' : 'Chốt lời (Bảo vệ vốn)';
      case TimeFrame.W1:
      case TimeFrame.M1:
        return rrg !== RRGQuadrant.LAGGING ? 'Đầu tư dài hạn' : 'Cơ cấu (Bán giảm tỷ trọng)';
      default:
        return 'Chờ đợi xác nhận';
    }
  }

  static calculateTrendScore(data: StockData): number {
    let score = 0;
    // Phân tích các chỉ báo kỹ thuật cơ bản
    if (data.price > data.ma20) score += 1;
    if (data.ma20 > data.ma50) score += 1;
    if (data.rsi > 60) score += 0.5;
    if (data.rsi < 40) score -= 0.5; // RSI thấp làm giảm điểm xu hướng
    
    // Trạng thái RRG đóng vai trò quan trọng nhất
    if (data.rrg === RRGQuadrant.LEADING) score += 2.5;
    if (data.rrg === RRGQuadrant.IMPROVING) score += 1.5;
    if (data.rrg === RRGQuadrant.WEAKENING) score += 0.5;
    if (data.rrg === RRGQuadrant.LAGGING) score -= 1.0; // Tụt hậu có thể gây lỗ
    
    return Math.max(0, Math.min(5, score));
  }

  static optimize(inputs: PortfolioInputs, marketData: StockData[]): AllocationResult[] {
    const totalCap = inputs.totalCapital;
    const sectors = DNSEService.getSectorAnalysis();
    
    // Định nghĩa mức biến động dự kiến theo khung thời gian (Multiplier)
    const tfMultiplier: Record<string, number> = {
      [TimeFrame.H1]: 0.01,  // +/- 1%
      [TimeFrame.H4]: 0.02,  // +/- 2%
      [TimeFrame.D1]: 0.05,  // +/- 5%
      [TimeFrame.W1]: 0.12,  // +/- 12%
      [TimeFrame.M1]: 0.25   // +/- 25%
    };
    const currentMultiplier = tfMultiplier[inputs.timeFrame] || 0.05;

    const baseStats = marketData.map(d => {
      const score = this.calculateTrendScore(d);
      
      /**
       * LOGIC DỰ BÁO LỢI NHUẬN/THUA LỖ:
       * Lấy 2.5 (trung bình của 0-5) làm điểm hòa vốn (Break-even).
       * Nếu score > 2.5: Dự báo lãi.
       * Nếu score < 2.5: Dự báo lỗ.
       */
      const returnFactor = (score - 2.5) / 2.5; // Range từ -1.0 đến 1.0
      const estReturnRate = returnFactor * currentMultiplier; 
      
      const confidenceFactor = score < 1.5 ? 0.3 : (score > 4 ? 1.0 : 0.7);
      const sector = sectors.find(sec => sec.topSymbols.includes(d.symbol))?.name || 'Thị trường';

      return { data: d, score, estReturnRate, confidenceFactor, sectorName: sector };
    });

    const totalScore = baseStats.reduce((acc, curr) => acc + curr.score, 0);

    return baseStats.map(s => {
      // Trọng số phân bổ vốn vẫn ưu tiên các mã có Score cao (an toàn hơn)
      const idealWeight = totalScore > 0 ? (s.score / totalScore) : (1 / baseStats.length);
      const actualWeight = idealWeight * s.confidenceFactor;
      
      const amount = totalCap * actualWeight;
      const shares = Math.floor(amount / s.data.price);
      
      const buyFlow = s.data.buyVolume * s.data.price;
      const sellFlow = s.data.sellVolume * s.data.price;
      const netFlow = buyFlow - sellFlow;
      const bStrength = (s.data.buyVolume / (s.data.buyVolume + s.data.sellVolume)) * 100;

      let sentiment = 50 + (s.score * 10) - (Math.random() * 20);
      if (s.data.rrg === RRGQuadrant.LEADING) sentiment += 10;
      if (s.data.rrg === RRGQuadrant.LAGGING) sentiment -= 15;
      sentiment = Math.max(5, Math.min(95, sentiment));

      let sentimentLabel = 'Trung tính';
      if (sentiment > 75) sentimentLabel = 'Rất Tích cực';
      else if (sentiment > 60) sentimentLabel = 'Tích cực';
      else if (sentiment < 25) sentimentLabel = 'Rất Tiêu cực';
      else if (sentiment < 40) sentimentLabel = 'Tiêu cực';

      const impact = (sentiment - 50) / 10;

      return {
        symbol: s.data.symbol,
        companyName: s.data.companyName,
        sectorName: s.sectorName,
        weight: actualWeight,
        amount,
        shares: shares,
        expectedReturnRate: s.estReturnRate,
        expectedProfit: amount * s.estReturnRate,
        trendScore: s.score,
        rrg: s.data.rrg,
        adviceDetail: `MT (Bán): ${new Intl.NumberFormat('vi-VN').format(Math.round(s.data.targetPriceHigh))} | HT (Mua): ${new Intl.NumberFormat('vi-VN').format(Math.round(s.data.targetPriceLow))}`,
        timeframeAdvice: this.getTimeframeAdvice(inputs.timeFrame, s.data.rrg),
        stochStatus: this.getStochStatus(s.data.stoch),
        cciStatus: this.getCCIStatus(s.data.cci),
        buyStrengthPercent: bStrength,
        totalVolume: s.data.volume,
        buyFlowValue: buyFlow,
        sellFlowValue: sellFlow,
        netFlowValue: netFlow,
        sentimentScore: sentiment,
        sentimentLabel: sentimentLabel,
        impactPricePercent: impact,
        roi: s.data.roi,
        roe: s.data.roe,
        pe: s.data.pe,
        auditStatus: s.data.auditStatus,
        price: s.data.price,
        ceilingPrice: s.data.ceilingPrice,
        floorPrice: s.data.floorPrice,
        refPrice: s.data.refPrice,
        bid1: s.data.bid1,
        ask1: s.data.ask1
      };
    });
  }
}
