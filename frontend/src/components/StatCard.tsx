"use client";

import React from "react";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  iconColor?: string;
  delay?: number;
}

export default function StatCard({
  label, value, icon: Icon, trend, trendUp,
  iconColor = "#6366f1", delay = 0,
}: StatCardProps) {
  return (
    <div
      className="card card-p fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div className="icon-box" style={{
          width: 40, height: 40,
          background: `${iconColor}18`,
          border: `1px solid ${iconColor}25`,
        }}>
          <Icon size={20} style={{ color: iconColor }} strokeWidth={2} />
        </div>
        {trend && (
          <span className={trendUp ? "badge badge-green" : "badge badge-red"}>
            {trend}
          </span>
        )}
      </div>
      <p className="stat-val" style={{ marginBottom: 4 }}>{value}</p>
      <p className="stat-lbl">{label}</p>
    </div>
  );
}
