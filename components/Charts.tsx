"use client";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export default function Charts({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

      {/* Ticket volume */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <p className="text-sm font-semibold mb-4">Ticket Volume (14 days)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.volume}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
            <Bar dataKey="tickets" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top tags */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <p className="text-sm font-semibold mb-4">Top Tags</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.top_tags} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <YAxis dataKey="tag" type="category" width={140} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
            <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AI resolution trend */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <p className="text-sm font-semibold mb-4">AI Resolution Rate (8 weeks)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.ai_resolution_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <YAxis unit="%" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
            <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* CSAT trend */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <p className="text-sm font-semibold mb-4">CSAT Trend (8 weeks)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.csat_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <YAxis domain={[0, 5]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151" }} />
            <Line type="monotone" dataKey="avg_csat" stroke="#F59E0B" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
