import os
import json
import requests
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

# Configuration
SUPABASE_URL = "https://mtvcrttbdjwcixzhlkvo.supabase.co"
SUPABASE_KEY = "sb_publishable_ZuB30vNfc-7b7Pr6ebZNqQ_sXjox-wu"
REST_URL = f"{SUPABASE_URL}/rest/v1/portfolio_visits"

def setup_matplotlib_theme():
    """Sets up a premium cyber-dark theme for matplotlib matching the portfolio site."""
    plt.style.use('dark_background')
    plt.rcParams.update({
        'figure.facecolor': '#0f172a',      # Slate 900
        'axes.facecolor': '#1e293b',        # Slate 800
        'axes.edgecolor': '#334155',        # Slate 700
        'grid.color': '#334155',
        'grid.alpha': 0.3,
        'text.color': '#f8fafc',            # Slate 50
        'axes.labelcolor': '#cbd5e1',       # Slate 300
        'xtick.color': '#94a3b8',           # Slate 400
        'ytick.color': '#94a3b8',
        'font.family': 'sans-serif',
        'font.sans-serif': ['Inter', 'Roboto', 'DejaVu Sans', 'Arial'],
        'figure.autolayout': True
    })

def fetch_supabase_visits():
    """Fetches every visit from Supabase, 1,000 rows per request (the API's page limit). Returns a DataFrame or None."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Range-Unit": "items",
    }
    rows, start, page_size = [], 0, 1000
    try:
        while True:
            r = requests.get(f"{REST_URL}?select=*&order=created_at.asc",
                             headers={**headers, "Range": f"{start}-{start + page_size - 1}"}, timeout=30)
            if r.status_code not in (200, 206):
                print(f"Supabase REST query failed (status: {r.status_code}): {r.text}")
                return None
            page = r.json()
            rows += page
            if len(page) < page_size:
                break
            start += page_size
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        return None
    print(f"Fetched {len(rows)} visit records from the database.")
    return pd.DataFrame(rows) if rows else None


def process_and_run_ml(df):
    """Processes DataFrame, fits K-Means and Linear Regression models, saves metrics and charts."""
    df['created_at'] = pd.to_datetime(df['created_at'], format='ISO8601', utc=True)
    df['date'] = df['created_at'].dt.date
    
    # 1. Traffic Aggregation & Linear Regression (Traffic Forecasting)
    daily_counts = df.groupby('date').size().reset_index(name='visits')
    daily_counts = daily_counts.sort_values('date')
    
    # Fill in missing dates with zero visits in the range
    idx = pd.date_range(daily_counts['date'].min(), daily_counts['date'].max())
    daily_counts = daily_counts.set_index('date').reindex(idx.date, fill_value=0).reset_index()
    daily_counts.columns = ['date', 'visits']
    
    # Create day indexes for regression
    daily_counts['day_index'] = np.arange(len(daily_counts))
    
    # Fit Linear Regression
    X = daily_counts[['day_index']].values
    y = daily_counts['visits'].values
    
    model_lr = LinearRegression()
    model_lr.fit(X, y)
    
    # Forecast next 7 days
    future_indexes = np.arange(len(daily_counts), len(daily_counts) + 7).reshape(-1, 1)
    future_dates = [daily_counts['date'].max() + timedelta(days=i) for i in range(1, 8)]
    forecast_visits = model_lr.predict(future_indexes)
    # Force positive values
    forecast_visits = np.clip(forecast_visits, 1, None).astype(int)
    
    forecast_df = pd.DataFrame({
        'date': future_dates,
        'visits': forecast_visits
    })
    
    # Real counts: unique visitors overall and today (UTC), and total sessions
    unique_visitors = int(df['visitor_id'].nunique())
    today = datetime.utcnow().date()
    visitors_today = int(df.loc[df['date'] == today, 'visitor_id'].nunique())
    sessions = int(len(df))
    forecasted_next_week = int(np.sum(forecast_visits))
    # Prediction band from the trend's own residuals (about 95%), not a fixed percentage
    residual_sd = float(np.std(y - model_lr.predict(X), ddof=1)) if len(y) > 2 else 0.0

    # 2. Feature Engineering & K-Means (Visitor Clustering)
    # Convert categoricals to numeric codes
    df['device_cat'] = df['device'].astype('category').cat.codes
    df['os_cat'] = df['os'].astype('category').cat.codes
    df['browser_cat'] = df['browser'].astype('category').cat.codes
    df['hour'] = df['created_at'].dt.hour
    df['is_weekend'] = df['created_at'].dt.dayofweek.isin([5, 6]).astype(int)
    
    # Cluster on device, OS, browser, and hour
    features = ['device_cat', 'os_cat', 'browser_cat', 'hour']
    X_clust = df[features].fillna(0).values
    
    n_clusters = min(3, len(df))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    df['cluster'] = kmeans.fit_predict(X_clust)
    
    # Name each cluster by what dominates it (device, OS, time of day in UTC); a suffix keeps names unique so
    # value_counts never merges two clusters into one bar
    def band(h):
        return "night" if h < 6 else "morning" if h < 12 else "afternoon" if h < 18 else "evening"
    cluster_names, used = {}, {}
    for c in range(n_clusters):
        sub = df[df['cluster'] == c]
        name = f"{sub['device'].mode()[0]}, {sub['os'].mode()[0]}, {band(int(sub['hour'].median()))} (UTC)"
        used[name] = used.get(name, 0) + 1
        cluster_names[c] = name if used[name] == 1 else f"{name} #{used[name]}"

    df['cluster_name'] = df['cluster'].map(cluster_names)
    
    # 3. Create & Save Plots
    setup_matplotlib_theme()
    
    # Plot A: Traffic Forecast Chart
    fig, ax = plt.subplots(figsize=(9, 4.5))
    # Plot historical data
    ax.plot(daily_counts['date'], daily_counts['visits'], label='Daily Traffic (Historical)', color='#6366f1', linewidth=2.5, marker='o', markersize=4)
    # Plot trendline
    trend_vals = model_lr.predict(X)
    ax.plot(daily_counts['date'], trend_vals, color='#8b5cf6', linestyle='--', alpha=0.7, label='Growth Trend')
    
    # Plot forecast
    ax.plot(forecast_df['date'], forecast_df['visits'], label='7-Day ML Forecast', color='#10b981', linewidth=2.5, linestyle=':', marker='s', markersize=5)
    ax.fill_between(forecast_df['date'], np.clip(forecast_df['visits'] - 1.96 * residual_sd, 0, None), forecast_df['visits'] + 1.96 * residual_sd, color='#10b981', alpha=0.15, label='~95% band (trend residuals)')
    
    # Formatting
    ax.set_title('Machine Learning Traffic Forecast Model (Linear Regression)', fontsize=12, fontweight='bold', pad=15)
    ax.set_xlabel('Date', fontsize=10, labelpad=8)
    ax.set_ylabel('Visits per day', fontsize=10, labelpad=8)
    ax.grid(True, linestyle=':', alpha=0.6)
    ax.legend(frameon=True, facecolor='#1e293b', edgecolor='#334155', loc='upper left')
    
    # Rotate x labels
    plt.xticks(rotation=25)
    plt.tight_layout()
    
    os.makedirs('assets', exist_ok=True)
    plt.savefig('assets/traffic_forecast.png', dpi=150)
    plt.close()
    
    # Plot B: Visitor Segmentation Clusters Chart
    fig, ax = plt.subplots(figsize=(9, 4.5))
    segment_counts = df['cluster_name'].value_counts()
    
    # Plot horizontal bar chart
    colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'][:len(segment_counts)]
    bars = ax.barh(segment_counts.index, segment_counts.values, color=colors, height=0.55, edgecolor='#334155')
    
    # Add values on top of bars
    for bar in bars:
        width = bar.get_width()
        ax.text(width + (max(segment_counts.values) * 0.01), bar.get_y() + bar.get_height()/2, 
                f'{int(width)} ({width/len(df)*100:.1f}%)', 
                va='center', ha='left', color='#cbd5e1', fontweight='bold', fontsize=9)
                
    ax.set_title('Visitor Cohort Segmentation Model (K-Means Clustering)', fontsize=12, fontweight='bold', pad=15)
    ax.set_xlabel('Volume of Sessions', fontsize=10, labelpad=8)
    ax.grid(True, axis='x', linestyle=':', alpha=0.6)
    ax.set_xlim(0, max(segment_counts.values) * 1.15)
    plt.tight_layout()
    
    plt.savefig('assets/visitor_segments.png', dpi=150)
    plt.close()
    
    # 4. Save JSON Stats
    stats_data = {
        "unique_visitors": unique_visitors,
        "visitors_today": visitors_today,
        "sessions": sessions,
        "first_visit": str(df['date'].min()),
        "forecasted_next_week": forecasted_next_week,
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "segments": segment_counts.to_dict(),   # sessions per K-Means segment (sums to "sessions")
    }

    with open('assets/visitor_stats.json', 'w') as f:
        json.dump(stats_data, f, indent=4)
        
    print(f"ML Pipeline ran successfully. Stats: {stats_data}")

def main():
    print("Starting ML Visitor Pipeline...")
    df = fetch_supabase_visits()
    if df is None or len(df) == 0:
        # Keep the last published stats rather than publish anything that isn't real visitor data
        print("No visitor data fetched; leaving the existing stats unchanged.")
        return
    process_and_run_ml(df)
    print("Pipeline Execution Complete!")


if __name__ == "__main__":
    main()
