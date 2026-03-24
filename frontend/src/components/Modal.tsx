"use client";
/**
 * Modal.tsx — Reusable modal dialog with glassmorphism backdrop
 */

import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, children, maxWidth = "520px" }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ 
        background: "rgba(0, 0, 0, 0.75)", 
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)"
      }}
      onClick={onClose}>
      <div className="glass-card p-6 w-full animate-fade-in" 
        style={{ 
          maxWidth,
          animationDelay: "100ms",
          boxShadow: "var(--shadow-luxury)"
        }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-all duration-300 hover:bg-red-500/10 text-slate-400 hover:text-red-400 group">
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
