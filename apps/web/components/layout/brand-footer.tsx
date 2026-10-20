export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/70">
      <a
        href="https://www.fedgix.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
      >
        Fedgix Restaurant OS · Support
      </a>
      <a
        href="https://github.com/Fedgix/nodedr-restaurant-pos/tree/fedgix/development"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        Get source code · AGPL-3.0
      </a>
      <span>Based on Nodedr OrderRestro</span>
    </div>
  );
}
