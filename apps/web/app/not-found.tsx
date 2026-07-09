import Link from "next/link";
export default function NotFound() { return <main className="page-container"><section className="status-panel status-panel--warning"><h1>Conteúdo não encontrado</h1><p>O recurso solicitado não existe ou não está disponível para sua identidade.</p><Link className="button button--secondary" href="/empreendedor">Voltar</Link></section></main>; }
