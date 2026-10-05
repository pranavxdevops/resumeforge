import { useEffect, useState } from 'react';
import { Eye, Users, Download, TrendingUp, Globe, Monitor, ShieldCheck } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../lib/api';
import { PageHeading, Badge, ErrorPanel, Skeleton, EmptyState } from '../components/ui';
export function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/analytics')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div className="page">
      <PageHeading
        eyebrow="SEE YOUR STORY REACH PEOPLE"
        title="Every view is a possibility."
        description="A thoughtful look at how people discover your professional story."
      >
        <Badge tone="neutral">Last 90 days</Badge>
      </PageHeading>
      {error ? (
        <ErrorPanel message={error} />
      ) : !data ? (
        <Skeleton />
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                label: 'Resume views',
                value: data.views,
                icon: Eye,
                detail: `${data.weeklyViews} this week`,
                color: 'blue',
              },
              {
                label: 'Unique visitors',
                value: data.visitors,
                icon: Users,
                detail: 'Anonymous, per portfolio',
                color: 'purple',
              },
              {
                label: 'PDF downloads',
                value: data.downloads,
                icon: Download,
                detail: `${data.weeklyDownloads} this week`,
                color: 'teal',
              },
              {
                label: 'Views this week',
                value: data.weeklyViews,
                icon: TrendingUp,
                detail: 'Over the last 7 days',
                color: 'orange',
              },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <div className="stat-top">
                  <span>{s.label}</span>
                  <span className={`stat-icon ${s.color}`}>
                    <s.icon size={18} />
                  </span>
                </div>
                <strong>{s.value}</strong>
                <p>{s.detail}</p>
              </div>
            ))}
          </div>
          <section className="panel analytics-chart">
            <div className="panel-header">
              <div>
                <h2>A little momentum, over time.</h2>
                <p className="muted">Views and downloads over the last 14 days</p>
              </div>
              <div className="chart-legend">
                <span>
                  <i />
                  Views
                </span>
                <span>
                  <i />
                  Downloads
                </span>
              </div>
            </div>
            {data.series.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.series} margin={{ top: 20, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }
                    minTickGap={35}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      color: 'var(--text)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3154df"
                    fill="#3154df"
                    fillOpacity={0.07}
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="downloads"
                    stroke="#229781"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="Your next audience is out there"
                description="Publish a portfolio to start seeing views and downloads here."
              />
            )}
          </section>
          <div className="analytics-bottom">
            {[
              { title: 'Where people find you', icon: Globe, items: data.referrers },
              { title: 'How they view your story', icon: Monitor, items: data.devices },
            ].map((section) => (
              <section className="panel" key={section.title}>
                <div className="panel-header">
                  <h2>{section.title}</h2>
                  <section.icon size={19} />
                </div>
                {section.items.length ? (
                  <div className="data-table">
                    <div className="data-table-head">
                      <span>Source</span>
                      <span>Views</span>
                    </div>
                    {section.items.map((row: any) => (
                      <div className="data-table-row" key={row.name}>
                        <strong>{row.name}</strong>
                        <span>{row.value}</span>
                        <div className="progress-track">
                          <span
                            style={{ width: `${(row.value / Math.max(data.views, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-empty">Your first visitor will get things started.</div>
                )}
              </section>
            ))}
          </div>
          <div className="privacy-banner">
            <ShieldCheck size={19} />
            <p>
              Useful insights, with privacy in mind. No stored IP addresses, location tracking, or
              third-party analytics. Data is retained for 90 days. Downloads include your own
              exports.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
