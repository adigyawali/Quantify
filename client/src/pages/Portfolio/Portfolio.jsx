import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, Search, ChevronDown, Briefcase, ArrowUpRight,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Field } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import DeltaPill from '../../components/ui/DeltaPill';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { portfolioApi } from '../../lib/api';
import { formatMoney, formatSignedCurrency } from '../../lib/format';
import './Portfolio.css';

export default function Portfolio() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // modal
  const [modal, setModal] = useState(null); // { mode, ticker }
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // search
  const [searchTk, setSearchTk] = useState('');

  const refresh = () => {
    setLoading(true);
    portfolioApi.get().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  // aggregate lots per ticker for display
  const aggregated = useMemo(() => {
    if (!data?.holdings) return [];
    const map = new Map();
    data.holdings.forEach((h) => {
      const cur = map.get(h.ticker);
      if (!cur) {
        map.set(h.ticker, {
          ticker: h.ticker,
          name: h.name,
          quantity: h.quantity,
          totalCost: h.quantity * h.avg_price,
          marketValue: h.market_value,
          currentPrice: h.current_price,
          lots: [{ ...h }],
        });
      } else {
        cur.quantity += h.quantity;
        cur.totalCost += h.quantity * h.avg_price;
        cur.marketValue += h.market_value;
        cur.lots.push(h);
      }
    });
    return [...map.values()].map((h) => ({
      ...h,
      avgPrice: h.totalCost / h.quantity,
      gain: h.marketValue - h.totalCost,
      gainPct: h.totalCost > 0 ? ((h.marketValue - h.totalCost) / h.totalCost) * 100 : 0,
    })).sort((a, b) => b.marketValue - a.marketValue);
  }, [data]);

  const totalValue = Number(data?.total_value || 0);
  const totalCost = Number(data?.total_cost || 0);
  const totalGain = Number(data?.overall_gain_loss || 0);
  const totalGainPct = Number(data?.overall_gain_loss_percent || 0);

  const openModal = (mode, ticker, defaultPrice) => {
    setModal({ mode, ticker });
    setQty(1);
    setPrice(defaultPrice ? Number(defaultPrice).toFixed(2) : '');
    setDate(new Date().toISOString().slice(0, 10));
    setErr('');
  };

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      if (modal.mode === 'buy') {
        await portfolioApi.add({ ticker: modal.ticker, quantity: parseInt(qty, 10), price: parseFloat(price), date });
      } else {
        await portfolioApi.remove({ ticker: modal.ticker, quantity: parseInt(qty, 10) });
      }
      setModal(null);
      refresh();
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to process transaction');
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const t = searchTk.trim().toUpperCase();
    if (!t) return;
    navigate(`/stock/${encodeURIComponent(t)}`);
  };

  return (
    <div className="pf">
      <header className="pf-header">
        <div>
          <h1>Your <span className="accent">portfolio</span></h1>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-sm)', marginTop: 4 }}>
            Lot-by-lot positions, live mark-to-market.
          </div>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, width: 'min(100%, 360px)' }}>
          <Input
            leading={<Search size={16} />}
            placeholder="Search ticker to add…"
            value={searchTk}
            onChange={(e) => setSearchTk(e.target.value.toUpperCase())}
          />
          <Button type="submit" leading={<Plus size={14} />}>Add</Button>
        </form>
      </header>

      {/* tiles */}
      <div className="pf-tiles">
        <Card className="pf-tile">
          <div className="pf-tile-label">Market value</div>
          <div className="pf-tile-value">
            {loading ? <Skeleton width={120} height={28} /> :
              <>$<AnimatedNumber value={totalValue} format={(n) => formatMoney(n)} /></>}
          </div>
          <div className="pf-tile-foot">
            {!loading && <DeltaPill value={totalGainPct} />}
          </div>
        </Card>
        <Card className="pf-tile" delay={0.05}>
          <div className="pf-tile-label">Cost basis</div>
          <div className="pf-tile-value">
            {loading ? <Skeleton width={120} height={28} /> : `$${formatMoney(totalCost)}`}
          </div>
          <div className="pf-tile-foot" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            What you paid
          </div>
        </Card>
        <Card className="pf-tile" delay={0.1}>
          <div className="pf-tile-label">All-time P&amp;L</div>
          <div className="pf-tile-value" style={{ color: totalGain >= 0 ? 'var(--bull)' : 'var(--bear)' }}>
            {loading ? <Skeleton width={120} height={28} /> : formatSignedCurrency(totalGain)}
          </div>
          <div className="pf-tile-foot" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            Realized + unrealized
          </div>
        </Card>
        <Card className="pf-tile" delay={0.15}>
          <div className="pf-tile-label">Positions</div>
          <div className="pf-tile-value">
            {loading ? <Skeleton width={60} height={28} /> : aggregated.length}
          </div>
          <div className="pf-tile-foot" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
            {data?.holdings?.length || 0} lots tracked
          </div>
        </Card>
      </div>

      {/* table */}
      <Card className="pf-table-card" padded={false}>
        <div className="pf-table-head">
          <div>Position</div>
          <div style={{ textAlign: 'right' }}>Quantity</div>
          <div style={{ textAlign: 'right' }}>Market value</div>
          <div style={{ textAlign: 'right' }}>Avg cost</div>
          <div style={{ textAlign: 'right' }}>P&amp;L</div>
          <div></div>
        </div>

        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div className="pf-table-row" key={i} style={{ pointerEvents: 'none' }}>
                <div className="pf-tk">
                  <Skeleton width={36} height={36} radius={8} />
                  <Skeleton width={120} height={14} />
                </div>
                <Skeleton width={60} height={14} style={{ marginLeft: 'auto' }} />
                <Skeleton width={90} height={14} style={{ marginLeft: 'auto' }} />
                <Skeleton width={70} height={14} style={{ marginLeft: 'auto' }} />
                <Skeleton width={80} height={14} style={{ marginLeft: 'auto' }} />
                <div />
              </div>
            ))}
          </div>
        ) : aggregated.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={26} />}
            title="No positions yet"
            description="Search a ticker above to add your first lot. Cost basis and live P&L will appear instantly."
            action={{ label: 'Discover stocks', icon: <Search size={14} />, onClick: () => navigate('/search') }}
          />
        ) : (
          aggregated.map((h, i) => {
            const isOpen = expanded === h.ticker;
            return (
              <div key={h.ticker}>
                <motion.div
                  className="pf-table-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  onClick={() => setExpanded(isOpen ? null : h.ticker)}
                >
                  <div className="pf-tk">
                    <div className="pf-tk-badge">{h.ticker.slice(0, 3)}</div>
                    <div className="pf-tk-meta">
                      <div className="pf-tk-sym">{h.ticker}</div>
                      <div className="pf-tk-name">{h.name}</div>
                    </div>
                  </div>
                  <div className="pf-num">
                    {h.quantity}
                    <div className="pf-num-sub">{h.lots.length} lot{h.lots.length > 1 ? 's' : ''}</div>
                  </div>
                  <div className="pf-num">
                    ${formatMoney(h.marketValue)}
                    <div className="pf-num-sub">@ ${formatMoney(h.currentPrice)}</div>
                  </div>
                  <div className="pf-num">
                    ${formatMoney(h.avgPrice)}
                  </div>
                  <div className="pf-num" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                    <DeltaPill value={h.gainPct} />
                    <div className="pf-num-sub">{formatSignedCurrency(h.gain)}</div>
                  </div>
                  <div className="pf-row-actions" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="xs" iconOnly onClick={() => navigate(`/stock/${h.ticker}`)} aria-label="Open">
                      <ArrowUpRight size={14} />
                    </Button>
                    <Button variant="ghost" size="xs" iconOnly aria-label="Expand">
                      <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                    </Button>
                  </div>
                </motion.div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="lots"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="pf-lots">
                        <div className="pf-lot-row">
                          <div className="pf-lot-label">Purchased</div>
                          <div className="pf-lot-label">Quantity</div>
                          <div className="pf-lot-label">Cost basis</div>
                          <div className="pf-lot-label">Lot value</div>
                          <div></div>
                        </div>
                        {h.lots.map((lot, idx) => (
                          <div className="pf-lot-row" key={idx}>
                            <div>{lot.purchase_date || '—'}</div>
                            <div>{lot.quantity} sh</div>
                            <div>${formatMoney(lot.avg_price)}</div>
                            <div>${formatMoney(lot.quantity * lot.current_price)}</div>
                            <div />
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <Button size="sm" variant="bull" leading={<Plus size={14} />} onClick={() => openModal('buy', h.ticker, h.currentPrice)}>
                            Buy more
                          </Button>
                          <Button size="sm" variant="bear" leading={<Minus size={14} />} onClick={() => openModal('sell', h.ticker, h.currentPrice)}>
                            Sell
                          </Button>
                          <Button size="sm" variant="secondary" trailing={<ArrowUpRight size={14} />} onClick={() => navigate(`/stock/${h.ticker}`)}>
                            View {h.ticker}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </Card>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={`${modal?.mode === 'buy' ? 'Buy' : 'Sell'} ${modal?.ticker}`}
        subtitle={modal?.mode === 'buy' ? 'Record a new lot at this cost basis.' : 'FIFO sell across your oldest lots first.'}
      >
        {err && <div className="auth-error" style={{ marginBottom: 16 }}>{err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Quantity">
            <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {modal?.mode === 'buy' && (
            <>
              <Field label="Price per share">
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  leading={<span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>$</span>}
                />
              </Field>
              <Field label="Purchase date">
                <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
              </Field>
            </>
          )}
        </div>
        <div className="ui-modal-actions">
          <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
          <Button
            variant={modal?.mode === 'buy' ? 'bull' : 'bear'}
            onClick={submit}
            disabled={busy}
            leading={modal?.mode === 'buy' ? <Plus size={14} /> : <Minus size={14} />}
          >
            {busy ? 'Working…' : (modal?.mode === 'buy' ? 'Confirm buy' : 'Confirm sell')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
