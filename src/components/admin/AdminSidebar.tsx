import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, BarChart3, Tag, Star, Truck,
  Settings, Megaphone, Shield, Gift, FolderTree, ChevronDown, Boxes,
  ClipboardList, LineChart, ShieldCheck, Wrench,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Item = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; items: Item[] };

const groups: Group[] = [
  {
    title: "Insights", icon: LineChart, items: [
      { title: "Dashboard", url: "/546498@18", icon: LayoutDashboard },
      { title: "Estatísticas", url: "/546498@18/stats", icon: BarChart3 },
      { title: "Relatórios", url: "/546498@18/reports", icon: LineChart },
      { title: "Métricas Indicações", url: "/546498@18/referrals/metrics", icon: LineChart },
    ],
  },
  {
    title: "Operações", icon: ClipboardList, items: [
      { title: "Pedidos", url: "/546498@18/orders", icon: ShoppingCart },
      { title: "Avaliações", url: "/546498@18/reviews", icon: Star },
    ],
  },
  {
    title: "Catálogo", icon: Boxes, items: [
      { title: "Produtos", url: "/546498@18/products", icon: Package },
      { title: "Categorias", url: "/546498@18/categories", icon: FolderTree },
      { title: "Banners", url: "/546498@18/banners", icon: Megaphone },
    ],
  },
  {
    title: "Configurações de Venda", icon: Wrench, items: [
      { title: "Descontos", url: "/546498@18/discounts", icon: Tag },
      { title: "Taxas de Entrega", url: "/546498@18/shipping-rates", icon: Truck },
      { title: "Indicações", url: "/546498@18/referrals", icon: Gift },
    ],
  },
  {
    title: "Sistema", icon: ShieldCheck, items: [
      { title: "Segurança", url: "/546498@18/security", icon: Shield },
      { title: "Auditoria", url: "/546498@18/audit-logs", icon: Shield },
      { title: "Configurações", url: "/546498@18/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const { pathname } = useLocation();

  // open the group containing the current route by default
  const initialOpen: Record<string, boolean> = {};
  groups.forEach((g) => {
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

        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <Collapsible
              open={open ? (openMap[group.title] ?? true) : true}
              onOpenChange={(o) => setOpenMap((m) => ({ ...m, [group.title]: o }))}
            >
              {open && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <group.icon className="h-3.5 w-3.5 opacity-70" />
                      <span className="text-[11px] uppercase tracking-wider">{group.title}</span>
                    </span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openMap[group.title] === false && "-rotate-90")} />
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
                            className="hover:bg-accent rounded-md transition-colors"
                            activeClassName="bg-accent text-accent-foreground font-medium"
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
