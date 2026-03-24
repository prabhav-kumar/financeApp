"use client";
/**
 * StatCard.tsx — Reusable stat display card for dashboards
 */

import React from "react";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;       // e.g. "+12.5%"
  trendUp?: boolean;
  iconColor?: string;
  delay?: number;       // animation delay in ms
}

export default function StatCard({ label, value, icon: Icon, trend, trendUp, iconColor = "#6366f1", delay = 0 }: StatCardProps) {
  return (
    <div className="glass-card p-5 md:p-6 animate-fade-in group" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${iconColor}20, ${iconColor}10)`,
              boxShadow: `0 6px 20px ${iconColor}15`
            }}>
            <Icon size={22} style={{ color: iconColor }} strokeWidth={2.5} />
          </div>
          <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ 
              background: `radial-gradient(circle at center, ${iconColor}20, transparent 70%)`,
              filter: 'blur(8px)',
              zIndex: -1
            }} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${trendUp ? "badge-success" : "badge-danger"}`}>
            {trend}
          </span>
        )}
      </div>

      <div className="mt-auto">
        <p className="stat-value leading-tight mb-1.5 transition-colors duration-300 break-words" 
          style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        <p className="stat-label leading-tight">{label}</p>
      </div>
    </div>
  );
}
