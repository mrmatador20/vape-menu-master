import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3, Tag, Star, Truck,
  Settings, Megaphone, Shield, Gift, FolderTree, ChevronDown, Boxes,
  ClipboardList, LineChart, ShieldCheck, Wrench, Trophy, FileText,
  Store, PackageMinus, ScrollText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { isPathAllowedForModerator } from "@/lib/adminAccess";

type Item = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; items: Item[] };

const groups: Group[] = [
  {
    title: "Insights", icon: LineChart, items: [
      { title: "Dashboard", url: "/546498@18", icon: LayoutDashboard },
      { title: "Estatísticas", url: "/546498@18/stats", icon: BarChart3 },
      { title: "Relatórios", url: "/546498@18/reports", icon: LineChart },
      { title: "Métricas Indicações", url: "/546498@18/referrals/metrics", icon: LineChart },
      { title: "Métricas Parceiros", url: "/546498@18/influencer-metrics", icon: Trophy },
    ],
  },
  {
    title: "Operações", icon: ClipboardList, items: [
      { title: "Pedidos", url: "/546498@18/orders", icon: ShoppingCart },
      { title: "Avaliações", url: "/546498@18/reviews", icon: Star },
    ],
  },
  {
    title: "Balcão", icon: Store, items: [
      { title: "Balcão (PDV)", url: "/546498@18/balcao", icon: PackageMinus },
      { title: "Dashboard Balcão", url: "/546498@18/balcao-dashboard", icon: LayoutDashboard },
      { title: "Logs de Estoque", url: "/546498@18/stock-logs", icon: ScrollText },
    ],
  },
  {
    title: "Catálogo", icon: Boxes, items: [
      { title: "Produtos", url: "/546498@18/products", icon: Package },
      { title: "Categorias", url: "/546498@18/categories", icon: FolderTree },
      { title: "Banners", url: "/546498@18/banners", icon: Megaphone },
      { title: "Banners Promo (Home)", url: "/546498@18/promo-banners", icon: Megaphone },
      { title: "Carrossel Boas-Vindas", url: "/546498@18/welcome-carousel", icon: Megaphone },
    ],
  },
  {
    title: "Configurações de Venda", icon: Wrench, items: [
      { title: "Descontos", url: "/546498@18/discounts", icon: Tag },
      { title: "Desconto Loja", url: "/546498@18/store-discount", icon: Tag },
      { title: "Taxas de Entrega", url: "/546498@18/shipping-rates", icon: Truck },
      { title: "Indicações", url: "/546498@18/referrals", icon: Gift },
    ],
  },
  {
    title: "Sistema", icon: ShieldCheck, items: [
      { title: "Segurança", url: "/546498@18/security", icon: Shield },
      { title: "Auditoria", url: "/546498@18/audit-logs", icon: Shield },
      { title: "Documentos Legais", url: "/546498@18/legal-documents", icon: FileText },
      { title: "Configurações", url: "/546498@18/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const { pathname } = useLocation();
  const { data: role } = useUserRole();

  const visibleGroups = (role === "moderator"
    ? groups
        .map((g) => ({ ...g, items: g.items.filter((i) => isPathAllowedForModerator(i.url)) }))
        .filter((g) => g.items.length > 0)
    : groups);

  // open the group containing the current route by default
  const initialOpen: Record<string, boolean> = {};
  visibleGroups.forEach((g) => {
    initialOpen[g.title] = g.items.some((i) =>
      i.url === "/546498@18" ? pathname === "/546498@18" : pathname.startsWith(i.url)
    );
  });
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(
    Object.keys(initialOpen).length ? initialOpen : {}
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center justify-between border-b">
          {open && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">FV</div>
              <h2 className="text-sm font-semibold tracking-tight">Fox Velour Admin</h2>
            </div>
          )}
          <SidebarTrigger />
        </div>

        {visibleGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <Collapsible
              open={open ? (openMap[group.title] ?? true) : true}
              onOpenChange={(o) => setOpenMap((m) => ({ ...m, [group.title]: o }))}
            >
              {open && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <group.icon className="h-3.5 w-3.5 opacity-80" />
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#d4a359]">{group.title}</span>
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform opacity-80", openMap[group.title] === false && "-rotate-90")} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.url === "/546498@18"}
                            className="rounded-md transition-colors hover:bg-white/10 hover:text-white"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-bold"
                          >
                            <item.icon className="h-4 w-4" />
                            {open && <span className="text-sm">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
