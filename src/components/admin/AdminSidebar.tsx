import { LayoutDashboard, Package, ShoppingCart, BarChart3, Tag, Star, Truck } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Produtos", url: "/admin/products", icon: Package },
  { title: "Pedidos", url: "/admin/orders", icon: ShoppingCart },
  { title: "Avaliações", url: "/admin/reviews", icon: Star },
  { title: "Estatísticas", url: "/admin/stats", icon: BarChart3 },
  { title: "Descontos", url: "/admin/discounts", icon: Tag },
  { title: "Taxas de Entrega", url: "/admin/shipping-rates", icon: Truck },
];

export function AdminSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center justify-between border-b">
          {open && <h2 className="text-lg font-semibold">Admin Panel</h2>}
          <SidebarTrigger />
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/admin"}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
