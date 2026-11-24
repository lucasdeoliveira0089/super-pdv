"use client";

import type * as React from "react";
import { Fragment, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2Icon,
  ChevronsUpDownIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldCheckIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@super-pdv/ui/components/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@super-pdv/ui/components/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@super-pdv/ui/components/dropdown-menu";
import { Separator } from "@super-pdv/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@super-pdv/ui/components/sidebar";
import { TooltipProvider } from "@super-pdv/ui/components/tooltip";
import { etapasDoCaminho } from "./trilha";

// Casca das páginas autenticadas no estilo do bloco `sidebar-07` do shadcn
// (spec web-layout): menu lateral recolhível, contexto no topo, usuário no
// rodapé e cabeçalho com trilha de navegação.

/** Ícones do menu por chave (D2): os layouts são Server Components. */
const ICONES = {
  inicio: LayoutDashboardIcon,
  clientes: Building2Icon,
  equipe: ShieldCheckIcon,
  empresas: StoreIcon,
  usuarios: UsersIcon,
} as const;

export type ChaveIcone = keyof typeof ICONES;

export interface ItemMenu {
  href: string;
  rotulo: string;
  icone: ChaveIcone;
}

export interface UsuarioCasca {
  nome: string;
  email: string;
  /** Ex.: papel do usuário. */
  detalhe?: string;
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

export function CascaApp({
  produto,
  contexto,
  usuario,
  itens,
  acaoSair,
  menuAberto = true,
  children,
}: {
  /** Ex.: "Gestor" ou "Admin". */
  produto: string;
  /** Nome do cliente (gestor) ou "Equipe Super PDV" (admin). Só informativo. */
  contexto: string;
  usuario: UsuarioCasca;
  itens: ItemMenu[];
  acaoSair: () => Promise<void>;
  /** Estado inicial do menu, lido do cookie no servidor (D7). */
  menuAberto?: boolean;
  children: React.ReactNode;
}) {
  return (
    // Os itens do menu recolhido mostram o nome em tooltip.
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={menuAberto}>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <IdentificacaoContexto produto={produto} contexto={contexto} />
          </SidebarHeader>
          <SidebarContent>
            <MenuPrincipal itens={itens} />
          </SidebarContent>
          <SidebarFooter>
            <MenuUsuario usuario={usuario} acaoSair={acaoSair} />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <CabecalhoApp itens={itens} />
          <div className="flex flex-1 flex-col p-4 pt-6 md:p-6 md:pt-8">
            {/* Conteúdo centralizado, até 1280 px (spec web-layout). */}
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/** Topo do menu: produto e contexto, sem troca de cliente ou empresa. */
function IdentificacaoContexto({ produto, contexto }: { produto: string; contexto: string }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip={contexto}>
          <div data-testid="contexto-menu">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <StoreIcon className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{contexto}</span>
              <span className="text-muted-foreground truncate text-xs">Super PDV · {produto}</span>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function MenuPrincipal({ itens }: { itens: ItemMenu[] }) {
  const caminho = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <nav aria-label="Menu principal">
        <SidebarMenu>
          {itens.map((item) => {
            const Icone = ICONES[item.icone];
            const ativo = caminho === item.href || caminho.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={ativo}
                  tooltip={item.rotulo}
                  className="data-active:bg-primary/10 data-active:text-primary dark:data-active:text-violet-300"
                >
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    onClick={() => isMobile && setOpenMobile(false)}
                  >
                    <Icone />
                    <span>{item.rotulo}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </nav>
    </SidebarGroup>
  );
}

/** Rodapé do menu: usuário logado, "Trocar senha" e "Sair". */
export function MenuUsuario({
  usuario,
  acaoSair,
}: {
  usuario: UsuarioCasca;
  acaoSair: () => Promise<void>;
}) {
  const { isMobile } = useSidebar();
  const [saindo, iniciar] = useTransition();
  const identificacao = (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarFallback className="rounded-lg">{iniciais(usuario.nome)}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium" data-testid="usuario-logado">
          {usuario.nome}
        </span>
        <span className="text-muted-foreground truncate text-xs">{usuario.email}</span>
      </div>
    </>
  );
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label={`Menu do usuário: ${usuario.nome}`}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {identificacao}
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">{identificacao}</div>
              {usuario.detalhe && (
                <p className="text-muted-foreground px-1 pb-1.5 text-xs">{usuario.detalhe}</p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/trocar-senha">
                <KeyRoundIcon />
                Trocar senha
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={saindo}
              onSelect={() => iniciar(async () => await acaoSair())}
            >
              <LogOutIcon />
              {saindo ? "Saindo…" : "Sair"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Cabeçalho das páginas: botão do menu e trilha de navegação (D3). */
export function CabecalhoApp({ itens }: { itens: Pick<ItemMenu, "href" | "rotulo">[] }) {
  const etapas = etapasDoCaminho(usePathname(), itens);
  return (
    <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-vertical:h-4 data-vertical:self-center"
      />
      <Breadcrumb aria-label="Trilha de navegação">
        <BreadcrumbList>
          {etapas.map((etapa, i) => (
            <Fragment key={`${i}-${etapa.rotulo}`}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {etapa.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={etapa.href}>{etapa.rotulo}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{etapa.rotulo}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
