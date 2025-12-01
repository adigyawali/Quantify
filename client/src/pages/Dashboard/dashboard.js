// pages/Dashboard/dashboard.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import { Plus, Minus, Search, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./dashboard.css";

// Configure axios
const api = axios.create({
    baseURL: "http://127.0.0.1:5000"
});

function Dashboard({ username }) {
    const navigate = useNavigate();
    const [portfolioData, setPortfolioData] = useState({
        total_value: 0,
        total_cost: 0,
        overall_gain_loss: 0,
        overall_gain_loss_percent: 0,
        holdings: []
    });
    const [loading, setLoading] = useState(true);
    const [searchTicker, setSearchTicker] = useState("");
    const [transactionTicker, setTransactionTicker] = useState("");
    const [transactionType, setTransactionType] = useState("buy"); // "buy" or "sell"
    const [transactionQuantity, setTransactionQuantity] = useState(1);
    const [transactionPrice, setTransactionPrice] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState("");
    const [selectedStock, setSelectedStock] = useState(null);
    const [stockHistory, setStockHistory] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }
        fetchPortfolio();
    }, [navigate]);

    const fetchPortfolio = async () => {
        const token = localStorage.getItem("token");
        try {
            const res = await api.get("/portfolio", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPortfolioData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401) navigate("/login");
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTicker) return;
        
        // Pre-fill modal with searched ticker
        openTransactionModal(searchTicker.toUpperCase(), "buy");
    };

    const openTransactionModal = (ticker, type) => {
        setTransactionTicker(ticker);
        setTransactionType(type);
        setTransactionQuantity(1);
        
        // Ideally fetch current price here
        // For now, user enters price or we could fetch it
        fetchCurrentPrice(ticker);
        
        setShowModal(true);
        setError("");
    };

    const fetchCurrentPrice = async (ticker) => {
        // Reuse the Finnhub proxy via our backend or just ask user
        // For this prototype, we'll ask user but try to pre-fill if possible
        // Simplified: User inputs price
        setTransactionPrice(0); 
    };

    const handleTransaction = async () => {
        const token = localStorage.getItem("token");
        const endpoint = transactionType === "buy" ? "/portfolio/add" : "/portfolio/remove";
        
        try {
            await api.post(endpoint, {
                ticker: transactionTicker,
                quantity: parseInt(transactionQuantity),
                price: parseFloat(transactionPrice)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setShowModal(false);
            fetchPortfolio();
            setSearchTicker("");
        } catch (err) {
            setError(err.response?.data?.message || "Transaction failed");
        }
    };

    const selectStock = async (ticker) => {
        if (selectedStock === ticker) {
            setSelectedStock(null);
            setStockHistory([]);
            return;
        }
        
        setSelectedStock(ticker);
        setStockHistory([]); // Clear previous data while loading

        try {
            const res = await api.get(`/stock/${ticker}/history`);
            // Transform for recharts if needed, but backend sends { date, price } which works if we map keys
            // Our backend sends [{ date: "MM/DD", price: 123.45 }, ...]
            // Recharts expects dataKey="price" (value) and label="date" (name)
            
            const formattedData = res.data.map(item => ({
                name: item.date,
                value: item.price
            }));
            setStockHistory(formattedData);
        } catch (err) {
            console.error("Failed to fetch history", err);
            // Fallback or empty
            setStockHistory([]);
        }
    };

    if (loading) return <div className="loading">Loading Dashboard...</div>;
    
    // Safeguard numerical values to prevent runtime crashes
    const totalValue = Number(portfolioData?.total_value || 0);
    const totalCost = Number(portfolioData?.total_cost || 0);
    const gainLoss = Number(portfolioData?.overall_gain_loss || 0);
    const gainLossPercent = Number(portfolioData?.overall_gain_loss_percent || 0);
    const formatMoney = (value = 0) => Number(value || 0).toFixed(2);
    const formatPercent = (value = 0) => Number(value || 0).toFixed(2);

    return (
        <div className="dashboard-container">
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>Welcome, {username}</h1>
                    
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="portfolio-search">
                        <div className="search-wrapper">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Search ticker to add..."
                                value={searchTicker}
                                onChange={(e) => setSearchTicker(e.target.value)}
                            />
                        </div>
                        <button type="submit">Add Stock</button>
                    </form>
                </div>

                {/* Portfolio Summary */}
                <div className="portfolio-summary-card">
                    <h2>Total Portfolio Value</h2>
                    <div className="value-display">
                        <span className="currency">$</span>
                        <span className="amount">{totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    
                    <div className={`pnl-indicator ${gainLoss >= 0 ? 'positive' : 'negative'}`}>
                        {gainLoss >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        <span className="pnl-amount">
                            {gainLoss >= 0 ? '+' : ''}
                            ${Math.abs(gainLoss).toFixed(2)}
                        </span>
                        <span className="pnl-percent">
                            ({gainLossPercent.toFixed(2)}%)
                        </span>
                    </div>

                    {/* Overall Graph Placeholder (or use mock data for "Overall" if history not tracked) */}
                    <div className="portfolio-graph">
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={[
                                { name: 'Start', value: totalCost },
                                { name: 'Now', value: totalValue }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Holdings List */}
                <div className="holdings-section">
                    <h3>Your Holdings</h3>
                    <div className="holdings-grid">
                        {portfolioData?.holdings?.map((stock) => (
                            <div key={stock.ticker} className={`holding-card ${selectedStock === stock.ticker ? 'selected' : ''}`}>
                                <div className="holding-header" onClick={() => selectStock(stock.ticker)}>
                                    <div className="ticker-info">
                                        <h4>{stock.ticker}</h4>
                                        <span className="shares">{stock.quantity} shares</span>
                                    </div>
                                    <div className="price-info">
                                        <div className="current-val">${formatMoney(stock.market_value)}</div>
                                        <div className={`stock-pnl ${stock.gain_loss >= 0 ? 'green' : 'red'}`}>
                                            {stock.gain_loss >= 0 ? '+' : ''}{formatMoney(stock.gain_loss)} ({formatPercent(stock.gain_loss_percent)}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded View */}
                                {selectedStock === stock.ticker && (
                                    <div className="holding-details">
                                        <div className="mini-graph">
                                            <ResponsiveContainer width="100%" height={100}>
                                                <LineChart data={stockHistory}>
                                                    <Line type="monotone" dataKey="value" stroke="#82ca9d" dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="holding-actions">
                                            <button className="btn-buy" onClick={() => openTransactionModal(stock.ticker, "buy")}>
                                                <Plus size={16} /> Buy More
                                            </button>
                                            <button className="btn-sell" onClick={() => openTransactionModal(stock.ticker, "sell")}>
                                                <Minus size={16} /> Sell
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {portfolioData?.holdings?.length === 0 && (
                            <div className="empty-portfolio">
                                <p>You don't own any stocks yet. Search above to get started!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{transactionType === 'buy' ? 'Buy' : 'Sell'} {transactionTicker}</h3>
                        
                        {error && <p className="error-text">{error}</p>}
                        
                        <div className="form-group">
                            <label>Quantity</label>
                            <input 
                                type="number" 
                                min="1"
                                value={transactionQuantity}
                                onChange={(e) => setTransactionQuantity(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Price per Share ($)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={transactionPrice}
                                onChange={(e) => setTransactionPrice(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className={`confirm-btn ${transactionType}`} onClick={handleTransaction}>
                                Confirm {transactionType === 'buy' ? 'Purchase' : 'Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
