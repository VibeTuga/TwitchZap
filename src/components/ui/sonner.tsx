"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-secondary" />
        ),
        info: (
          <InfoIcon className="size-4 text-primary" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-tertiary" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-error" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-primary" />
        ),
      }}
      style={
        {
          "--normal-bg": "#1f1f23",
          "--normal-text": "#f0edf1",
          "--normal-border": "#25252a",
          "--success-bg": "#1f1f23",
          "--success-text": "#59ee50",
          "--success-border": "rgba(89, 238, 80, 0.2)",
          "--error-bg": "#1f1f23",
          "--error-text": "#ff6e84",
          "--error-border": "rgba(255, 110, 132, 0.2)",
          "--border-radius": "0.75rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !bg-surface-container-high !text-on-surface !border-surface-variant/50 !shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
          title: "!text-on-surface !font-headline !font-bold",
          description: "!text-on-surface-variant",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
