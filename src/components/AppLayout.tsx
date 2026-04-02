import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import AppSidebar from "./AppSidebar";
import SubscriptionBanner from "./SubscriptionBanner";
import SupportChatWidget from "./SupportChatWidget";

export default function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-xl px-4">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <span className="text-sm font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
            NFS-e Pro
          </span>
        </header>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <AppSidebar onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="min-h-[calc(100vh-3rem)]">
          <div className="p-4 sm:p-5">
            <SubscriptionBanner />
            {children}
          </div>
        </main>
        <SupportChatWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-[15.5rem]">
        <AppSidebar />
      </aside>
      <main className="ml-[15.5rem] min-h-screen">
        <div className="p-6 lg:p-8 xl:p-10 max-w-[1400px]">
          <SubscriptionBanner />
          {children}
        </div>
      </main>
      <SupportChatWidget />
    </div>
  );
}