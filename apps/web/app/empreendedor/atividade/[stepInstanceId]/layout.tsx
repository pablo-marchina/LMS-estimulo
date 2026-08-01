export default function ActivityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .participant-stage #conteudo-principal {
          width: 100% !important;
          max-width: none !important;
          overflow-x: clip;
          background: var(--color-background);
        }

        .participant-stage #conteudo-principal > div {
          box-sizing: border-box;
          width: 100% !important;
          max-width: none !important;
          margin-inline: 0 !important;
        }

        .participant-stage #conteudo-principal > div > .grid.items-start.gap-5 {
          display: flex !important;
          width: 100% !important;
          min-width: 0 !important;
          flex-direction: column !important;
        }

        .participant-stage #conteudo-principal > div > .grid.items-start.gap-5 > main {
          order: 2;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
        }

        .participant-stage #conteudo-principal > div > .grid.items-start.gap-5 > aside {
          position: static !important;
          inset: auto !important;
          order: 1;
          display: grid !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: none !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        .participant-stage #conteudo-principal > div > .grid.items-start.gap-5 > aside > * {
          min-width: 0;
        }

        @media (max-width: 900px) {
          .participant-stage #conteudo-principal > div > .grid.items-start.gap-5 > aside {
            grid-template-columns: minmax(0, 1fr) !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
