
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PortfolioInputs, AllocationResult, StockData, RRGQuadrant, TimeFrame, NewsItem, Recommendation, IPOItem } from './types';
import { DNSEService, SectorData } from './services/dnseService';
import { AllocationEngine } from './services/allocationLogic';
import { AllocationPie, ProfitBarChart } from './components/Visualizations';

const STORAGE_KEY = 'smart_capital_pro_data';

const App: React.FC = () => {
  const [inputs, setInputs] = useState<PortfolioInputs>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Lỗi parse dữ liệu cũ:", e);
      }
    }
    return {
      totalCapital: 1000000000,
      targetProfit: 150000000,
      targetProfitPercent: 15,
      symbols: ['FPT', 'HPG', 'BID', 'SSI', 'GAS', 'VND', 'VNM', 'TCB'],
      timeFrame: TimeFrame.D1
    };
  });

  const [marketData, setMarketData] = useState<StockData[]>([]);
  const [results, setResults] = useState<AllocationResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [topStocks, setTopStocks] = useState<string[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [ipoList, setIpoList] = useState<IPOItem[]>([]);
  const [activeNewsTab, setActiveNewsTab] = useState<string>('DAILY'); 
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
  }, [inputs]);

  // Kiểm tra thị trường có đang mở cửa hay không
  const isMarketOpenNow = useCallback(() => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // Thứ 7, CN nghỉ
    const hour = now.getHours();
    const min = now.getMinutes();
    const currentTime = hour * 100 + min;
    
    // Sáng: 9h00 - 11h30 | Chiều: 13h00 - 15h00
    const isOpenAM = currentTime >= 900 && currentTime <= 1130;
    const isOpenPM = currentTime >= 1300 && currentTime <= 1500;
    
    return isOpenAM || isOpenPM;
  }, []);

  const fetchData = useCallback(async (manual: boolean = false) => {
    if (manual) setIsRefreshing(true);
    setLoading(true);
    try {
      const data = await DNSEService.getMarketData(inputs.symbols);
      setMarketData(data);
      setSectors(DNSEService.getSectorAnalysis());
      setTopStocks(DNSEService.getTopStocks());
      setNews(DNSEService.getMockNews(inputs.symbols));
      setRecs(DNSEService.getDailyRecommendations());
      setIpoList(DNSEService.getIPO2026());
      setLastUpdated(new Date());
      setResults(AllocationEngine.optimize(inputs, data));
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      setLoading(false);
      if (manual) setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [inputs.symbols, inputs.timeFrame, inputs.totalCapital]);

  useEffect(() => {
    fetchData();
    
    // Chỉ thiết lập interval nếu thị trường đang mở
    const interval = setInterval(() => {
      if (isMarketOpenNow()) {
        fetchData();
      }
    }, 5000); 

    return () => clearInterval(interval);
  }, [fetchData, isMarketOpenNow]);

  const removeSymbol = (s: string) => setInputs(p => ({ ...p, symbols: p.symbols.filter(x => x !== s) }));
  const addSymbol = (s: string) => {
    const sym = s.toUpperCase().trim();
    if (sym && !inputs.symbols.includes(sym) && DNSEService.validateSymbol(sym)) {
      setInputs(p => ({ ...p, symbols: [...p.symbols, sym] }));
    }
  };

  const toggleSymbol = (s: string) => {
    if (inputs.symbols.includes(s)) {
      removeSymbol(s);
    } else {
      addSymbol(s);
    }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const onDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    const newSymbols = [...inputs.symbols];
    const itemToMove = newSymbols.splice(draggedIndex, 1)[0];
    newSymbols.splice(index, 0, itemToMove);
    setInputs({ ...inputs, symbols: newSymbols });
    setDraggedIndex(index);
    setDragOverIndex(index);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const formatCurrency = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    return sign + new Intl.NumberFormat('vi-VN').format(Math.round(absVal));
  };
  
  const formatCompactNumber = (val: number) => {
    const absVal = Math.abs(val);
    const sign = val < 0 ? "-" : "";
    let formatted = "";
    if (absVal >= 1000000000) formatted = (absVal / 1000000000).toFixed(1) + ' tỷ';
    else if (absVal >= 1000000) formatted = (absVal / 1000000).toFixed(1) + ' tr';
    else formatted = new Intl.NumberFormat('vi-VN').format(Math.round(absVal));
    return sign + formatted;
  };

  const formatInputNumber = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseInputNumber = (val: string) => {
    const cleaned = val.replace(/\./g, "");
    return isNaN(Number(cleaned)) ? 0 : Number(cleaned);
  };

  const getRRGInfo = (q: RRGQuadrant) => {
    const maps = {
      [RRGQuadrant.LEADING]: { label: 'Dẫn dắt', bg: 'bg-[#064e3b]', icon: 'fa-rocket' },
      [RRGQuadrant.IMPROVING]: { label: 'Cải thiện', bg: 'bg-[#1e3a8a]', icon: 'fa-chart-line' },
      [RRGQuadrant.WEAKENING]: { label: 'Suy yếu', bg: 'bg-[#78350f]', icon: 'fa-wind' },
      [RRGQuadrant.LAGGING]: { label: 'Tụt hậu', bg: 'bg-[#7f1d1d]', icon: 'fa-arrow-down-long' },
    };
    return maps[q] || { label: 'N/A', bg: 'bg-slate-400', icon: 'fa-eye' };
  };

  const getPriceColor = (res: AllocationResult | {price: number, ceilingPrice: number, floorPrice: number, refPrice: number}) => {
    if (res.price >= res.ceilingPrice) return 'text-[#d946ef] font-black'; // Tím (Trần)
    if (res.price <= res.floorPrice) return 'text-[#06b6d4] font-black';   // Xanh lơ (Sàn)
    if (res.price > res.refPrice) return 'text-[#10b981] font-black';      // Xanh lá (Tăng)
    if (res.price < res.refPrice) return 'text-[#ef4444] font-black';      // Đỏ (Giảm)
    return 'text-[#eab308] font-black';                                    // Vàng (Tham chiếu)
  };

  const getMarketStatus = () => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const min = now.getMinutes();
    const currentTime = hour * 100 + min;
    if (day === 0 || day === 6) return { label: 'Thị trường đóng (Cuối tuần)', color: 'text-rose-500', isClosed: true };
    if (currentTime < 900) return { label: 'Chưa mở phiên', color: 'text-slate-400', isClosed: true };
    if (currentTime >= 900 && currentTime < 915) return { label: 'Phiên ATO', color: 'text-amber-500', isClosed: false };
    if (currentTime >= 915 && currentTime < 1130) return { label: 'Khớp lệnh liên tục', color: 'text-emerald-500 animate-pulse', isClosed: false };
    if (currentTime >= 1130 && currentTime < 1300) return { label: 'Đang nghỉ trưa', color: 'text-blue-400', isClosed: true };
    if (currentTime >= 1300 && currentTime < 1430) return { label: 'Khớp lệnh liên tục', color: 'text-emerald-500 animate-pulse', isClosed: false };
    if (currentTime >= 1430 && currentTime < 1445) return { label: 'Phiên ATC', color: 'text-amber-500', isClosed: false };
    if (currentTime >= 1445 && currentTime < 1500) return { label: 'Khớp lệnh sau giờ', color: 'text-slate-500', isClosed: false };
    return { label: 'Đã đóng phiên', color: 'text-rose-500', isClosed: true };
  };

  const getTimeFrameLabel = (tf: TimeFrame) => {
    switch (tf) {
      case TimeFrame.H1: return "1 Giờ";
      case TimeFrame.H4: return "4 Giờ";
      case TimeFrame.D1: return "1 Ngày";
      case TimeFrame.W1: return "1 Tuần";
      case TimeFrame.M1: return "1 Tháng";
      default: return "Chu kỳ";
    }
  };

  const mStatus = getMarketStatus();
  const totalExpectedProfit = results.reduce((a, b) => a + b.expectedProfit, 0);
  const totalAllocated = results.reduce((a, b) => a + b.amount, 0);
  const remainingCapital = inputs.totalCapital - totalAllocated;
  const portfolioExpectedReturnPercent = (totalExpectedProfit / inputs.totalCapital) * 100;

  return (
    <div className="min-h-screen pb-20 bg-[#f8fafc] text-[#0f172a]">
      {/* HEADER LUXURY */}
      <header className="bg-[#0f172a] text-white px-6 md:px-10 py-5 shadow-xl sticky top-0 z-[100] border-b border-white/5 backdrop-blur-md bg-opacity-95">
        <div className="max-w-[1850px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-gradient-to-br from-[#d4af37] via-[#b45309] to-[#d4af37] rounded-xl flex items-center justify-center shadow-lg border border-white/10">
              <i className="fa-solid fa-crown text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-[0.1em] leading-none uppercase text-white">SmartCapital <span className="text-[#d4af37]">PRO</span></h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1.5 hidden md:block">Institutional Asset Hub</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-10 w-full md:w-auto justify-between md:justify-end">
            <button 
              onClick={() => fetchData(true)}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl transition-all group"
            >
              <i className={`fa-solid fa-arrows-rotate text-[#d4af37] ${isRefreshing ? 'animate-spin' : 'group-hover:scale-110'}`}></i>
              <span className="text-[10px] font-black uppercase tracking-widest">LÀM MỚI</span>
            </button>

            <div className="bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl flex flex-col items-center min-w-[200px]">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">HOSE | VNINDEX STATUS</span>
              <span className={`text-[10px] font-black uppercase ${mStatus.color}`}>{mStatus.label}</span>
            </div>

            <div className="hidden sm:flex flex-nowrap gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              {Object.values(TimeFrame).map(tf => (
                <button 
                  key={tf}
                  onClick={() => setInputs({...inputs, timeFrame: tf})}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${inputs.timeFrame === tf ? 'bg-[#d4af37] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* FIXED METRICS BAR */}
      <div className="sticky top-[88px] md:top-[92px] z-[90] bg-[#f8fafc] border-b border-slate-200/50 py-4 px-6 md:px-10 shadow-sm">
        <div className="max-w-[1850px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="pro-card p-4 bg-white flex flex-col justify-center border-l-4 border-slate-200">
              <label className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Vốn Đầu Tư Tổng</label>
              <div className="flex items-baseline gap-2">
                <input 
                  type="text" 
                  value={formatInputNumber(inputs.totalCapital)}
                  onChange={(e) => setInputs({...inputs, totalCapital: parseInputNumber(e.target.value)})}
                  className="w-full text-base font-black text-slate-900 bg-transparent outline-none focus:text-[#b45309] transition-all"
                />
                <span className="text-[8px] font-black text-slate-300">VND</span>
              </div>
            </div>

            <div className="pro-card p-4 bg-white flex flex-col justify-center border-l-4 border-slate-200">
              <label className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-widest">Mục Tiêu (%)</label>
              <div className="flex items-baseline gap-2">
                <input 
                  type="number" 
                  value={inputs.targetProfitPercent}
                  onChange={(e) => setInputs({...inputs, targetProfitPercent: Number(e.target.value)})}
                  className="w-full text-base font-black text-slate-900 bg-transparent outline-none focus:text-[#b45309] transition-all"
                />
                <span className="text-[8px] font-black text-slate-300">%</span>
              </div>
            </div>

            <div className="pro-card p-4 bg-white border-l-4 border-[#d4af37] flex flex-col justify-center">
              <span className="text-[8px] font-black text-[#d4af37] uppercase tracking-widest mb-1">Hiệu Suất Kỳ Vọng</span>
              <div className="flex items-baseline gap-2">
                <h2 className={`text-base font-black tracking-tight ${portfolioExpectedReturnPercent >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {portfolioExpectedReturnPercent.toFixed(1)}%
                </h2>
                <span className={`text-[8px] font-bold ${portfolioExpectedReturnPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {portfolioExpectedReturnPercent >= 0 ? '▲ ANN.' : '▼ LOSS'}
                </span>
              </div>
            </div>

            <div className="pro-card p-4 bg-white border-l-4 border-slate-800 flex flex-col justify-center relative">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">LN Dự Kiến (+{getTimeFrameLabel(inputs.timeFrame)})</span>
              <h2 className={`text-base font-black tracking-tight ${totalExpectedProfit >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {totalExpectedProfit >= 0 ? "+" : ""}{formatCurrency(totalExpectedProfit)}
              </h2>
            </div>

            <div className="luxury-gradient text-white p-4 rounded-xl shadow-lg flex flex-col justify-center border border-white/5">
              <span className="text-[8px] font-black text-[#d4af37] uppercase tracking-widest mb-1">Dòng Tiền Quản Trị</span>
              <div className="flex flex-col gap-0.5">
                 <div className="flex justify-between items-center">
                    <span className="text-[7px] font-bold text-white/40 uppercase">GIẢI NGÂN:</span>
                    <span className="text-xs font-black text-white">{formatCurrency(totalAllocated)}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-[7px] font-bold text-[#d4af37]/60 uppercase">DỰ TRỮ:</span>
                    <span className="text-base font-black text-[#d4af37]">{formatCurrency(remainingCapital)}</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1850px] mx-auto px-6 md:px-10 py-10 space-y-12">
        {/* ROW 1: TRENDS & POTENTIALS */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
          <div className="xl:col-span-4 h-full">
            <section className="pro-card p-8 bg-white h-full flex flex-col">
              <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3 border-b border-slate-50 pb-4">
                <i className="fa-solid fa-compass text-[#d4af37]"></i> CHIẾN LƯỢC DÒNG TIỀN NGÀNH
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-grow">
                {sectors.map(sector => {
                  const info = getRRGInfo(sector.status);
                  const isExpanded = expandedSector === sector.name;
                  return (
                    <div key={sector.name} className="relative group">
                      <div className="flex flex-col gap-2 cursor-pointer" onClick={() => setExpandedSector(isExpanded ? null : sector.name)}>
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-black text-slate-700 group-hover:text-[#b45309] transition-colors flex items-center gap-2 uppercase tracking-tighter">
                            {sector.name}
                            <i className={`fa-solid fa-chevron-right text-[6px] opacity-20 transition-transform ${isExpanded ? 'rotate-90' : ''}`}></i>
                          </span>
                          <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${info.bg} text-white`}>{info.label}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${info.bg} transition-all duration-1000`} style={{ width: `${sector.strength}%` }}></div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="absolute top-full left-0 right-0 z-[110] mt-3 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 min-w-[240px]">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-2">Tín hiệu ngành (Top Symbols)</p>
                          <div className="grid grid-cols-2 gap-3">
                            {sector.topSymbols.map(sym => {
                              const isAdded = inputs.symbols.includes(sym);
                              return (
                                <div key={sym} onClick={() => toggleSymbol(sym)} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${isAdded ? 'bg-[#b45309] border-[#b45309]' : 'border-slate-300'}`}>
                                    {isAdded && <i className="fa-solid fa-check text-white text-[7px]"></i>}
                                  </div>
                                  <span className="text-[10px] font-black text-slate-800">{sym}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="xl:col-span-8 h-full">
            <section className="bg-[#0f172a] p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group border border-white/5 h-full flex flex-col">
              <div className="absolute -right-24 -top-24 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-[100px] group-hover:bg-[#d4af37]/15 transition-all"></div>
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-[#d4af37] mb-8 flex items-center gap-3 relative z-10 border-b border-white/5 pb-4">
                <i className="fa-solid fa-gem text-[#d4af37]"></i> DNSE LIGHTSPEED PREMIUM POTENTIALS
              </h3>
              <div className="flex flex-wrap gap-3 relative z-10 overflow-visible flex-grow content-start">
                {topStocks.map(s => (
                  <button key={s} onClick={() => addSymbol(s)} className="bg-white/5 hover:bg-[#d4af37] hover:text-white border border-white/5 px-6 py-4 rounded-xl text-[11px] font-black flex justify-center items-center gap-2 transition-all active:scale-95 group/btn whitespace-nowrap">
                    {s} <i className="fa-solid fa-plus text-[8px] text-[#d4af37] group-hover:text-white"></i>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* MAIN ALLOCATION MATRIX */}
        <div className="pro-card overflow-hidden border border-slate-100 shadow-2xl bg-white">
          <div className="px-10 py-8 border-b border-slate-50 flex flex-col xl:flex-row justify-between items-center gap-6 bg-slate-50/20">
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">Ma trận Điều phối Vốn Thông minh</h2>
                 {mStatus.isClosed ? (
                    <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-2 py-1 rounded-lg border border-rose-100 animate-pulse">AUTO REFRESH PAUSED (CLOSED)</span>
                 ) : (
                    <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-2 py-1 rounded-lg border border-emerald-100 animate-pulse uppercase">Live Syncing every 5s</span>
                 )}
              </div>
              <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-[0.3em] opacity-60">Thứ tự ưu tiên | Kéo thả để sắp xếp danh mục</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
              <div className="relative flex-grow">
                <input 
                  type="text" 
                  placeholder="Thêm mã (VD: VCB)..." 
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addSymbol(newSymbol)}
                  className="bg-white border border-slate-200 px-6 py-3 rounded-xl text-sm font-black w-full xl:w-72 outline-none focus:ring-4 focus:ring-[#d4af37]/10 transition-all shadow-sm"
                />
                <i className="fa-solid fa-search absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
              </div>
              <button onClick={() => addSymbol(newSymbol)} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 whitespace-nowrap">TỐI ƯU HÓA</button>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50/50 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <tr>
                  <th className="px-10 py-7">Tài sản / Hệ sinh thái</th>
                  <th className="px-10 py-7">Phân tích Kỹ thuật</th>
                  <th className="px-10 py-7">Lợi nhuận Dự báo</th>
                  <th className="px-10 py-7">Dòng tiền & Volume</th>
                  <th className="px-10 py-7">Sentiment Hub</th>
                  <th className="px-10 py-7 text-right">Giải ngân Dự kiến</th>
                  <th className="px-10 py-7"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 transition-all duration-300">
                {results.map((res, index) => {
                  const info = getRRGInfo(res.rrg);
                  const isBeingDragged = draggedIndex === index;
                  
                  return (
                    <tr 
                      key={res.symbol} 
                      draggable 
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragEnter={() => onDragEnter(index)}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      className={`transition-all duration-300 group cursor-move relative
                        ${isBeingDragged ? 'bg-amber-500/5 scale-[0.98] opacity-50 border-l-4 border-[#d4af37]' : 'bg-white hover:bg-slate-50/50'}
                      `}
                    >
                      <td className="px-10 py-8">
                         <div className="flex items-center gap-6">
                           <div className="relative">
                             <div className={`w-12 h-12 rounded-xl ${info.bg} text-white flex items-center justify-center shadow-md transform group-hover:scale-110 transition-transform duration-500`}>
                               <i className={`fa-solid ${info.icon} text-lg`}></i>
                             </div>
                             <div className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded shadow ${info.bg} text-white text-[6px] font-black uppercase border-2 border-white`}>{info.label}</div>
                           </div>
                           <div className="flex flex-col">
                              <div className="text-[7px] font-black text-[#b45309] uppercase mb-1 tracking-widest">{res.sectorName}</div>
                              <div className="font-black text-slate-900 text-2xl tracking-tighter leading-none mb-2">{res.symbol}</div>
                              
                              {/* CHI TIẾT GIÁ PRO */}
                              <div className="flex flex-col gap-2 mb-2 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                                 {/* HÀNG 1: T | TC | S */}
                                 <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                                    <div className="flex flex-col items-center">
                                       <span className="text-[6px] font-black text-[#d946ef] uppercase">TRẦN (T)</span>
                                       <span className="text-[10px] font-mono font-black text-[#d946ef]">{formatCurrency(res.ceilingPrice)}</span>
                                    </div>
                                    <div className="h-4 w-[1px] bg-slate-200"></div>
                                    <div className="flex flex-col items-center">
                                       <span className="text-[6px] font-black text-[#eab308] uppercase">THAM CHIẾU (TC)</span>
                                       <span className="text-[10px] font-mono font-black text-[#eab308]">{formatCurrency(res.refPrice)}</span>
                                    </div>
                                    <div className="h-4 w-[1px] bg-slate-200"></div>
                                    <div className="flex flex-col items-center">
                                       <span className="text-[6px] font-black text-[#06b6d4] uppercase">SÀN (S)</span>
                                       <span className="text-[10px] font-mono font-black text-[#06b6d4]">{formatCurrency(res.floorPrice)}</span>
                                    </div>
                                 </div>
                                 {/* HÀNG 2: MUA 1 | BÁN 1 */}
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[7px] font-black text-slate-400">MUA 1:</span>
                                       <span className="text-[11px] font-mono font-black text-[#10b981]">{formatCurrency(res.bid1)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[7px] font-black text-slate-400">BÁN 1:</span>
                                       <span className="text-[11px] font-mono font-black text-[#ef4444]">{formatCurrency(res.ask1)}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic opacity-80 leading-tight mb-2">
                                "{res.companyName} | ROI: {res.roi}% · {res.auditStatus}"
                              </div>
                              <div className={`text-base font-mono flex items-center gap-2 ${getPriceColor(res)}`}>
                                <span className="text-[8px] opacity-40 uppercase">{mStatus.isClosed ? 'GIÁ CHỐT PHIÊN:' : 'GIÁ KHỚP:'}</span>
                                {formatCurrency(res.price)} <span className="text-[8px] opacity-40">VND</span>
                              </div>
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="space-y-3 text-[10px] font-bold">
                           <div className="text-[#b45309] bg-[#b45309]/5 px-3 py-1.5 rounded-lg inline-block border border-[#b45309]/10 font-black shadow-sm">{res.adviceDetail}</div>
                           <div className="flex gap-6 items-center border-b border-slate-50 pb-2">
                             <div className="flex items-center gap-1.5">
                               <span className="text-slate-400 uppercase text-[8px] font-black">STOCH:</span>
                               <span className={`text-[9px] font-black ${res.stochStatus.includes('Quá') ? 'text-[#b45309]' : 'text-slate-800'}`}>{res.stochStatus}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                               <span className="text-slate-400 uppercase text-[8px] font-black">CCI:</span>
                               <span className={`text-[9px] font-black ${res.cciStatus.includes('Hưng') ? 'text-emerald-600' : 'text-slate-800'}`}>{res.cciStatus}</span>
                             </div>
                           </div>
                           <div className={`mt-1.5 text-[9px] uppercase font-black flex items-center gap-2 ${res.timeframeAdvice.includes('Chốt') ? 'text-rose-600' : 'text-emerald-600'}`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${res.timeframeAdvice.includes('Chốt') ? 'bg-rose-600 shadow-[0_0_5px_rgba(225,29,72,0.3)]' : 'bg-emerald-600 shadow-[0_0_5px_rgba(5,150,105,0.3)]'}`}></div>
                             {res.timeframeAdvice}
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <div className={`text-2xl font-black tracking-tighter ${res.expectedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                           {res.expectedProfit >= 0 ? "+" : ""}{formatCurrency(res.expectedProfit)}
                         </div>
                         <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Dự báo LN {inputs.timeFrame}</div>
                      </td>
                      <td className="px-10 py-8">
                         <div className="space-y-3">
                           <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Vol: {new Intl.NumberFormat('vi-VN').format(res.totalVolume)}</span>
                              <span className={`text-[8px] font-black uppercase ${res.netFlowValue > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                Net: {formatCompactNumber(res.netFlowValue)}
                              </span>
                           </div>
                           <div className="w-44 h-1.5 bg-slate-50 rounded-full overflow-hidden flex border border-slate-100 shadow-inner">
                             <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${res.buyStrengthPercent}%` }}></div>
                           </div>
                           <div className="flex justify-between text-[9px] font-black w-44 uppercase">
                             <div className="flex flex-col">
                               <span className="text-emerald-600 text-[8px]">MUA: {res.buyStrengthPercent.toFixed(1)}%</span>
                               <span className="text-slate-800">{formatCompactNumber(res.buyFlowValue)}</span>
                             </div>
                             <div className="flex flex-col text-right">
                               <span className="text-rose-400 text-[8px]">BÁN: {(100-res.buyStrengthPercent).toFixed(1)}%</span>
                               <span className="text-rose-600">{formatCompactNumber(res.sellFlowValue)}</span>
                             </div>
                           </div>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                             <span className={`${res.sentimentScore > 50 ? 'text-emerald-600' : 'text-rose-500'}`}>{res.sentimentLabel}</span>
                             <span className="text-slate-400">Score: {res.sentimentScore.toFixed(0)}</span>
                           </div>
                           <div className="w-40 h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100 relative shadow-inner">
                             <div className={`h-full ${res.sentimentScore > 50 ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-1000`} style={{ width: `${res.sentimentScore}%` }}></div>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Impact Prob:</div>
                              <div className={`text-xs font-black ${res.impactPricePercent > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {res.impactPricePercent > 0 ? '+' : ''}{res.impactPricePercent.toFixed(1)}%
                              </div>
                           </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                         <div className="font-black text-slate-900 text-2xl tracking-tighter">{formatCurrency(res.amount)}</div>
                         <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.1em] mt-1">Tỷ trọng: {(res.weight * 100).toFixed(1)}%</div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button onClick={() => removeSymbol(res.symbol)} className="opacity-0 group-hover:opacity-100 p-3 text-slate-300 hover:text-rose-500 transition-all bg-rose-50/0 hover:bg-rose-50 rounded-2xl"><i className="fa-solid fa-trash-can text-lg"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SIGNAL LEGEND */}
          <div className="bg-[#0f172a] p-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-white/70">
             <div className="space-y-4">
               <h4 className="text-[9px] font-black text-[#d4af37] uppercase tracking-[0.3em] flex items-center gap-2">
                 <i className="fa-solid fa-circle-info"></i> GIẢI MÃ ĐỊNH LƯỢNG & GIÁ
               </h4>
               <ul className="space-y-3 text-[10px] font-bold">
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Nguồn Giá:</span> <span className="text-white">{mStatus.isClosed ? 'Giá chốt phiên (Static)' : 'Giá khớp lệnh (Realtime)'}</span></li>
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Mua 1 / Bán 1:</span> <span className="text-white">Bước giá dư mua/bán tốt nhất.</span></li>
                 <li className="flex justify-between"><span>T / TC / S:</span> <span className="text-white">Trần / Tham chiếu / Sàn của phiên.</span></li>
               </ul>
             </div>
             <div className="space-y-4 border-l border-white/10 pl-10">
               <h4 className="text-[9px] font-black text-[#d4af37] uppercase tracking-[0.3em] flex items-center gap-2">
                 <i className="fa-solid fa-chart-area"></i> STOCHASTIC DYNAMICS
               </h4>
               <ul className="space-y-3 text-[10px] font-bold">
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Overbought {'>'} 80:</span> <span className="text-rose-400">Vùng đỉnh hưng phấn.</span></li>
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Oversold {'<'} 20:</span> <span className="text-emerald-400">Vùng đáy hoảng loạn.</span></li>
                 <li className="flex justify-between"><span>Neutral 20-80:</span> <span className="text-white">Giai đoạn tích lũy.</span></li>
               </ul>
             </div>
             <div className="space-y-4 border-l border-white/10 pl-10">
               <h4 className="text-[9px] font-black text-[#d4af37] uppercase tracking-[0.3em] flex items-center gap-2">
                 <i className="fa-solid fa-gauge-high"></i> CCI MOMENTUM
               </h4>
               <ul className="space-y-3 text-[10px] font-bold">
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Strong {'>'} 100:</span> <span className="text-emerald-400">Xác nhận xu hướng tăng.</span></li>
                 <li className="flex justify-between border-b border-white/5 pb-2"><span>Weak {'<'} -100:</span> <span className="text-rose-400">Xác nhận xu hướng giảm.</span></li>
                 <li className="flex justify-between"><span>Làm mới:</span> <span className="text-[#d4af37]">{mStatus.isClosed ? 'Paused (Market Closed)' : 'Auto 5s Active'}</span></li>
               </ul>
             </div>
          </div>
        </div>

        {/* ANALYTICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="pro-card p-10 bg-white flex flex-col items-center border border-slate-100 rounded-[2rem] shadow-lg"><AllocationPie data={results} /></div>
          <div className="pro-card p-10 bg-white flex flex-col items-center border border-slate-100 rounded-[2rem] shadow-lg"><ProfitBarChart data={results} /></div>
        </div>

        {/* MARKET INTELLIGENCE HUB */}
        <section className="space-y-10">
          <div className="flex items-center gap-5 border-b border-slate-100 pb-6">
             <i className="fa-solid fa-feather-pointed text-[#b45309] text-2xl"></i>
             <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Market Intelligence Hub</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4 space-y-8">
              <div className="flex items-center min-h-[60px]">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-4 border-l-4 border-[#d4af37]">STRATEGY ADVISORY</h3>
              </div>
              <div className="space-y-6">
                {recs.map(r => (
                  <div key={r.id} className="pro-card p-8 bg-white border border-slate-100 hover:shadow-xl transition-all group/card rounded-[1.5rem]">
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full ${r.type === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.type} SIGNAL</span>
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{r.source}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 mb-3 leading-tight group-hover/card:text-[#b45309] transition-colors">{r.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium mb-4">{r.content}</p>
                    <div className="pt-4 border-t border-slate-50 flex items-center gap-3 opacity-60">
                       <i className="fa-solid fa-shield-halved text-[10px] text-[#d4af37]"></i>
                       <span className="text-[9px] font-black uppercase tracking-[0.2em]">Institutional Grade</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="flex flex-nowrap gap-3 bg-slate-100/40 p-1.5 rounded-[2rem] border border-slate-100 overflow-x-auto no-scrollbar scroll-smooth">
                <button 
                  onClick={() => setActiveNewsTab('DAILY')} 
                  className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black transition-all whitespace-nowrap ${activeNewsTab === 'DAILY' ? 'bg-[#0f172a] text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  GLOBAL NEWS FEED
                </button>
                {inputs.symbols.map(s => (
                  <button 
                    key={s} 
                    onClick={() => setActiveNewsTab(s)} 
                    className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black transition-all whitespace-nowrap ${activeNewsTab === s ? 'bg-white text-[#b45309] shadow-sm border border-slate-100' : 'text-slate-400 hover:text-[#b45309]'}`}
                  >
                    {s} ANALYSIS
                  </button>
                ))}
                <button 
                  onClick={() => setActiveNewsTab('IPO')} 
                  className={`px-6 py-3 rounded-[1.5rem] text-[10px] font-black transition-all whitespace-nowrap ${activeNewsTab === 'IPO' ? 'bg-[#d4af37] text-white shadow-md' : 'text-[#d4af37] hover:bg-[#d4af37]/5'}`}
                >
                  IPO RADAR 2026 🔥
                </button>
              </div>

              <div className="pro-card p-10 bg-white min-h-[500px] border border-slate-100 shadow-sm rounded-[2rem]">
                {activeNewsTab === 'DAILY' && (
                  <div className="space-y-10">
                     {news.slice(0, 15).map(n => (
                       <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block group cursor-pointer">
                         <div className="flex justify-between items-start mb-3">
                           <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">{n.source}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-300">{n.time}</span>
                              <i className="fa-solid fa-external-link text-[9px] text-slate-200 group-hover:text-[#d4af37]"></i>
                           </div>
                         </div>
                         <h4 className="text-lg font-black text-slate-800 group-hover:text-[#b45309] transition-colors tracking-tight leading-snug">{n.title}</h4>
                         <div className="mt-6 h-[1px] bg-slate-50"></div>
                       </a>
                     ))}
                  </div>
                )}

                {activeNewsTab === 'IPO' && (
                  <div className="space-y-8">
                    <div className="bg-[#0f172a] p-8 rounded-[1.5rem] text-white shadow-xl mb-8 border border-white/5">
                      <h4 className="text-xs font-black text-[#d4af37] uppercase mb-3 tracking-[0.2em]">Lộ trình IPO Tầm nhìn 2026</h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-widest">Doanh nghiệp chiến lược dự kiến chuyển sàn hoặc niêm yết mới.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full whitespace-nowrap">
                        <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="pb-6 text-left">Doanh nghiệp</th>
                            <th className="pb-6 text-left">Dự kiến</th>
                            <th className="pb-6 text-left">Lĩnh vực</th>
                            <th className="pb-6 text-right">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ipoList.map(ipo => (
                            <tr key={ipo.name} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-6 text-base font-black text-slate-800">{ipo.name}</td>
                              <td className="py-6 text-[11px] font-bold text-slate-500 uppercase">{ipo.expectedDate}</td>
                              <td className="py-6 text-[11px] font-bold text-slate-500">{ipo.sector}</td>
                              <td className="py-6 text-right"><span className="text-[9px] font-black bg-slate-50 px-4 py-2 rounded-xl uppercase tracking-widest border border-slate-200/40 text-slate-600">{ipo.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {inputs.symbols.includes(activeNewsTab) && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xl">{activeNewsTab}</div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Intelligence Feed</h4>
                            <p className="text-[10px] font-bold text-[#d4af37] uppercase tracking-[0.4em] mt-1">Stock Core Insights</p>
                        </div>
                    </div>
                    {news.filter(n => n.symbol === activeNewsTab).map(n => (
                      <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block group cursor-pointer">
                         <div className="flex justify-between items-start mb-3">
                           <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">{n.source}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-300">{n.time}</span>
                              <i className="fa-solid fa-external-link text-[9px] text-slate-200 group-hover:text-[#d4af37]"></i>
                           </div>
                         </div>
                         <h4 className="text-lg font-black text-slate-800 group-hover:text-[#b45309] transition-colors tracking-tight leading-snug">{n.title}</h4>
                         <div className="mt-6 h-[1px] bg-slate-50"></div>
                       </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* LUXURY FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0f172a] text-white/40 py-5 px-10 z-[100] border-t border-white/5 backdrop-blur-xl bg-opacity-[0.98] text-[9px] font-black uppercase tracking-[0.4em] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-10">
          <span className="text-[#d4af37]/80">© ANHMACDZICH INVEST HUB - 2026</span>
          <span className="opacity-30 hidden lg:inline">SYNC ENGINE ACTIVE: {lastUpdated.toLocaleTimeString()}</span>
        </div>
        <div className="flex gap-10 items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg"></div>
            <span className="text-[#d4af37]">STIER: LUXURY PRESTIGE</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
