import { useEffect, useRef, useState } from "react";
import { Bell, BellRing, Volume2, VolumeX, Play, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { playSound, SOUND_PRESETS, type SoundId } from "@/lib/notificationSounds";

type OrderNotification = {
  id: string;
  customer_name: string | null;
  total_amount: number | null;
  created_at: string;
  read: boolean;
};

const STORAGE_KEY = "admin_order_notifications";
const MUTE_KEY = "admin_order_notifications_muted";
const SOUND_KEY = "admin_order_notifications_sound";
const DEFAULT_SOUND: SoundId = "ding_dong";
const MAX_STORED = 20;

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
  const [soundId, setSoundId] = useState<SoundId>(() => {
    const stored = localStorage.getItem(SOUND_KEY) as SoundId | null;
    return stored && SOUND_PRESETS.some((s) => s.id === stored)
      ? stored
      : DEFAULT_SOUND;
  });
  const [ringing, setRinging] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const soundRef = useRef<SoundId>(soundId);
  soundRef.current = soundId;

  // persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);
  useEffect(() => {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  }, [muted]);
  useEffect(() => {
    localStorage.setItem(SOUND_KEY, soundId);
  }, [soundId]);

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

          if (!mutedRef.current) playSound(soundRef.current);
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
