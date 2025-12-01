import React, { useState } from "react";
import axios from "axios";
import "./home.css";

const api = axios.create({
    // Use env override when deploying, otherwise rely on CRA proxy in package.json
    baseURL: process.env.REACT_APP_API_BASE_URL || "",
});

function App() {
    const [ticker, setTicker] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [overallSentiment, setOverallSentiment] = useState("");
    const [news, setNews] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Calculate overall sentiment from news results
    const calculateOverallSentiment = (newsArticles) => {
        if (!newsArticles || newsArticles.length === 0) return "Neutral";

        const counts = { Bullish: 0, Bearish: 0, Neutral: 0 };
        let totalConfidence = 0;

        newsArticles.forEach(article => {
            counts[article.sentiment]++;
            totalConfidence += article.confidence;
        });

        const maxSentiment = Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
        );

        const avgConfidence = (totalConfidence / newsArticles.length).toFixed(2);
        return `${maxSentiment} (${avgConfidence} confidence)`;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!ticker.trim()) {
            setError("Please enter a ticker symbol");
            return;
        }

        setLoading(true);
        setError("");
        setHasSearched(true);

        try {
            // Call your backend: /stock/<ticker>
            const response = await api.get(`/stock/${ticker.toUpperCase()}`);
            const data = response.data;

            if (!data || !data.news || data.news.length === 0) {
                setError("No news found for this ticker");
                setLoading(false);
                return;
            }

            // Use backend’s results directly
            const processedNews = data.news.map(article => ({
                title: article.headline,
                sentiment: article.sentiment,
                confidence: article.confidence
            }));

            // Calculate overall sentiment
            const overall = calculateOverallSentiment(processedNews);

            // Update state
            setNews(processedNews);
            setOverallSentiment(overall);
            setShowResults(true);

        } catch (error) {
            console.error("Error fetching data:", error);
            const status = error.response?.status;

            if (status === 404) {
                setError("Ticker not found or no recent news available. Please try a different ticker.");
            } else if (status === 401 || status === 403) {
                setError("Invalid or unauthorized Finnhub API key on the server.");
            } else if (status === 429) {
                setError("Finnhub rate limit exceeded. Please wait a moment and try again.");
            } else if (status === 500) {
                const backendError = error.response.data?.error || "Server error. Please check if the API key is configured correctly.";
                setError(`Server Error: ${backendError}`);
            } else if (status === 502) {
                setError("Unable to reach Finnhub from the server. Check internet connectivity or firewall settings.");
            } else {
                setError(`Failed to fetch data: ${error.response?.data?.error || error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Sentiment color for styling
    const getSentimentColor = (sentiment) => {
        if (sentiment.includes('Bullish')) return '#4CAF50';
        if (sentiment.includes('Bearish')) return '#F44336';
        return '#FF9800';
    };

    return (
        <>
            <main className="content-area">
                <form
                    onSubmit={handleSubmit}
                    className={hasSearched ? "search-form-top" : "search-form"}
                >
                    {!hasSearched && (
                        <div id="titleMessage">
                            <h1 id="quantifyHeading">Quantify</h1>
                            <h2 id="headingDescription">All about the Stock Market</h2>
                        </div>
                    )}

                    {!hasSearched && <h2 id="message">Enter Ticker</h2>}

                    <div id="inputDiv">
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            placeholder="AAPL, GOOG, TSLA..."
                            className="search-input"
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading} className="search-button">
                            {loading ? "Searching..." : "Search"}
                        </button>
                    </div>
                </form>

                {error && <div className="error-message"><p>{error}</p></div>}

                {loading && <div className="loading-container"><p>Loading news and analyzing sentiment...</p></div>}

                {showResults && !loading && (
                    <div className="results-container">
                        <div className="ticker-header">
                            <h2>{ticker} Analysis</h2>
                        </div>

                        <div className="sentiment-section">
                            <h3>Overall Market Sentiment</h3>
                            <div
                                className="sentiment-badge"
                                style={{
                                    backgroundColor: getSentimentColor(overallSentiment),
                                    color: 'white',
                                    padding: '10px 20px',
                                    borderRadius: '25px',
                                    display: 'inline-block',
                                    fontWeight: 'bold'
                                }}
                            >
                                {overallSentiment}
                            </div>
                        </div>

                        <div className="news-section">
                            <h3>Latest News & Analysis</h3>
                            <div className="news-list">
                                {news.map((article, index) => (
                                    <div key={index} className="news-item">
                                        <div className="news-header">
                                            <span className="news-title">{article.title}</span>
                                            <span
                                                className="article-sentiment"
                                                style={{
                                                    backgroundColor: getSentimentColor(article.sentiment),
                                                    color: "#fff"
                                                }}
                                            >
                                                {article.sentiment} ({article.confidence})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}

export default App;
