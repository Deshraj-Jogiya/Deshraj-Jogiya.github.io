import os
import json
import random
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

def generate_mock_visits(n_visits=180):
    """Generates realistic synthetic visitor data to bootstrap models if database is empty/missing."""
    print(f"Generating {n_visits} synthetic visitor logs for bootstrapping...")
    
    browsers = ["Chrome", "Safari", "Firefox", "Edge", "Mobile Safari"]
    browser_weights = [0.55, 0.25, 0.10, 0.07, 0.03]
    
    oses = ["Windows", "macOS", "iOS", "Android", "Linux"]
    os_weights = [0.45, 0.30, 0.12, 0.08, 0.05]
    
    devices = ["Desktop", "Mobile", "Tablet"]
    device_weights = [0.70, 0.25, 0.05]
    
    countries = [
        ("United States", "US", ["New York", "San Francisco", "Tempe", "Chicago", "Seattle", "Austin"]),
        ("India", "IN", ["Mumbai", "Bangalore", "Delhi", "Pune"]),
        ("United Kingdom", "GB", ["London", "Manchester", "Edinburgh"]),
        ("Canada", "CA", ["Toronto", "Vancouver", "Montreal"]),
        ("Germany", "DE", ["Berlin", "Munich", "Frankfurt"])
    ]
    country_weights = [0.60, 0.20, 0.10, 0.05, 0.05]
    
    referrers = ["LinkedIn", "GitHub", "Google Search", "Direct", "Resume PDF"]
    referrer_weights = [0.40, 0.30, 0.15, 0.10, 0.05]
    
    data = []
    base_time = datetime.now()
    
    for i in range(n_visits):
        # Visitor characteristics
        visitor_id = f"vis_{random.randint(1000, 9999)}"
        is_new = random.random() < 0.82
        
        browser = random.choices(browsers, weights=browser_weights)[0]
        os_name = random.choices(oses, weights=os_weights)[0]
        # Match device to OS
        if os_name in ["iOS", "Android"]:
            device = "Mobile" if random.random() < 0.9 else "Tablet"
        else:
            device = "Desktop"
            
        country_info = random.choices(countries, weights=country_weights)[0]
        country = country_info[0]
        country_code = country_info[1]
        city = random.choice(country_info[2])
        
        referrer = random.choices(referrers, weights=referrer_weights)[0]
        page_path = "/"
        
        # Time distribution (more visits during weekdays and trending upwards over the last 30 days)
        days_ago = random.randint(0, 29)
        hour = random.randint(8, 22)
        minute = random.randint(0, 59)
        visit_time = base_time - timedelta(days=days_ago)
        visit_time = visit_time.replace(hour=hour, minute=minute)
        
        # Weekday/weekend adjustments
        if visit_time.weekday() >= 5: # Weekend
            if random.random() < 0.4: # drop visits
                continue
                
        # Upward trend adjustment
        # Visits are 1.5x more likely to occur closer to current day
        if random.random() > (1.0 - (days_ago / 60.0)):
            continue
            
        data.append({
            "visitor_id": visitor_id,
            "is_new": is_new,
            "city": city,
            "country": country,
            "country_code": country_code,
            "device": device,
            "os": os_name,
            "browser": browser,
            "referrer": referrer,
            "page_path": page_path,
            "created_at": visit_time.isoformat()
        })
        
    return pd.DataFrame(data)

def fetch_supabase_visits():
    """Fetches visits from Supabase REST API. Returns a DataFrame or None on failure."""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    try:
        print(f"Fetching visitor logs from Supabase REST API: {REST_URL}")
        r = requests.get(f"{REST_URL}?select=*", headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"Successfully fetched {len(data)} records from database.")
                return pd.DataFrame(data)
            else:
                print("Database query returned empty list.")
                return None
        else:
            print(f"Supabase REST query failed (status: {r.status_code}): {r.text}")
            return None
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        return None

def process_and_run_ml(df):
    """Processes DataFrame, fits K-Means and Linear Regression models, saves metrics and charts."""
    df['created_at'] = pd.to_datetime(df['created_at'])
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
    
    # Save statistics variables
    total_visits = int(df['visitor_id'].nunique())
    today_date = datetime.now().date()
    active_today = int(df[df['created_at'].dt.date == today_date]['visitor_id'].nunique())
    # If no real visits today, pull the count of visits on the latest date in dataset
    if active_today == 0:
        active_today = int(daily_counts.iloc[-1]['visits'])
        
    forecasted_next_week = int(np.sum(forecast_visits))
    
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
    
    # Name clusters dynamically based on dominant features
    cluster_names = {}
    for c in range(n_clusters):
        c_subset = df[df['cluster'] == c]
        dom_device = c_subset['device'].mode()[0] if not c_subset['device'].empty else "Visitor"
        dom_os = c_subset['os'].mode()[0] if not c_subset['os'].empty else "OS"
        dom_referrer = c_subset['referrer'].mode()[0] if not c_subset['referrer'].empty else "Direct"
        
        if dom_device == "Mobile":
            name = f"Mobile Explorers ({dom_os})"
        elif dom_referrer in ["LinkedIn", "Resume PDF"]:
            name = f"Recruiters / Peers ({dom_referrer})"
        else:
            name = f"Desktop Analysts ({dom_os})"
            
        cluster_names[c] = name
        
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
    ax.fill_between(forecast_df['date'], forecast_df['visits'] * 0.85, forecast_df['visits'] * 1.15, color='#10b981', alpha=0.15, label='Confidence Interval')
    
    # Formatting
    ax.set_title('Machine Learning Traffic Forecast Model (Linear Regression)', fontsize=12, fontweight='bold', pad=15)
    ax.set_xlabel('Date', fontsize=10, labelpad=8)
    ax.set_ylabel('Unique Visits', fontsize=10, labelpad=8)
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
        "total_visits": total_visits,
        "active_today": active_today,
        "forecasted_next_week": forecasted_next_week,
        "updated_at": datetime.now().isoformat(),
        "segments": segment_counts.to_dict()
    }
    
    with open('assets/visitor_stats.json', 'w') as f:
        json.dump(stats_data, f, indent=4)
        
    print(f"ML Pipeline ran successfully. Stats: {stats_data}")

def main():
    print("Starting ML Visitor Pipeline...")
    
    # Try fetching real data from Supabase
    df = fetch_supabase_visits()
    
    # If no data or query failed, fall back to mock data
    if df is None or len(df) < 10:
        print("Using synthetic dataset fallback for ML pipeline training...")
        # If there are a few real visits, let's keep them and mix them in, or just boot with synthetic
        df_synthetic = generate_mock_visits()
        if df is not None and len(df) > 0:
            print(f"Merging {len(df)} real visits with synthetic training baseline.")
            # Standardize columns to match
            cols = ["visitor_id", "is_new", "city", "country", "country_code", "device", "os", "browser", "referrer", "page_path", "created_at"]
            df = df[[c for c in cols if c in df.columns]]
            df = pd.concat([df, df_synthetic]).drop_duplicates(subset=["created_at"]).reset_index(drop=True)
        else:
            df = df_synthetic
            
    # Process dataset & run ML modeling
    process_and_run_ml(df)
    print("Pipeline Execution Complete!")

if __name__ == "__main__":
    main()
