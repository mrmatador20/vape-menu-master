import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type OrderNotification = {
  id: string;
  customer_name: string | null;
  total_amount: number | null;
  created_at: string;
  read: boolean;
};

const STORAGE_KEY = "admin_order_notifications";
const MUTE_KEY = "admin_order_notifications_muted";
const MAX_STORED = 20;

function playBeep() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + start + duration,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // pleasant two-tone "ding-dong"
    playTone(880, 0, 0.25);
    playTone(1175, 0.18, 0.35);
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch (e) {
    console.warn("[Notify] beep failed", e);
  }
}

export function OrderNotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<OrderNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [muted, setMuted] = useState<boolean>(
    () => localStorage.getItem(MUTE_KEY) === "1",
  );
  const [ringing, setRinging] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }, [muted]);

  // realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders-notify")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const o: any = payload.new;
          const newItem: OrderNotification = {
            id: o.id,
            customer_name: o.customer_name ?? null,
            total_amount: Number(o.total_amount ?? 0),
            created_at: o.created_at ?? new Date().toISOString(),
            read: false,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newItem.id)) return prev;
            return [newItem, ...prev].slice(0, MAX_STORED);
          });

          if (!mutedRef.current) playBeep();
          setRinging(true);
          setTimeout(() => setRinging(false), 2500);

          toast.success("Novo pedido recebido!", {
            description: `${newItem.customer_name ?? "Cliente"} — R$ ${newItem.total_amount?.toFixed(2)}`,
            action: {
              label: "Ver",
              onClick: () => navigate("/546498@18/orders"),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const clearAll = () => setNotifications([]);

  return (
    <Popover onOpenChange={(o) => o && markAllRead()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações de pedidos"
        >
          {ringing ? (
            <BellRing className={cn("h-5 w-5 text-primary animate-pulse")} />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">Novos pedidos</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setMuted((m) => !m)}
              title={muted ? "Ativar som" : "Silenciar som"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={clearAll}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => navigate("/546498@18/orders")}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-accent transition-colors",
                      !n.read && "bg-accent/40",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {n.customer_name ?? "Novo cliente"}
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        R$ {(n.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleString("pt-BR")}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
