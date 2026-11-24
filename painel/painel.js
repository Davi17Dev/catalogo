// Painel da consultora: mostra os pedidos da planilha e deixa marcar com um toque.
// Quem grava na planilha é o Google Apps Script (conta dona da planilha), por isso funciona
// mesmo que a conta Google da consultora esteja sem espaço. Só funciona com o link secreto (?k=...).
(function () {
  "use strict";

  const API = (window.CONFIG_CATALOGO || {}).urlPedidos;
  const CHAVE_LOCAL = "painel-chave-v1";
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const el = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

  let chave = "";
  let itens = [];
  let imagens = new Map();           // código do produto -> foto
  const escolhas = {};                // "pedido|codigo" -> "Tenho em casa" (antes de confirmar)

  // ---------- Chave secreta: vem no link (?k=...) e fica guardada neste aparelho ----------
  function lerChave() {
    const daUrl = new URLSearchParams(location.search).get("k");
    if (daUrl) {
      try { localStorage.setItem(CHAVE_LOCAL, daUrl); } catch (e) { /* sem memória */ }
      history.replaceState(null, "", location.pathname); // tira a chave da barra de endereço
      return daUrl;
    }
    try { return localStorage.getItem(CHAVE_LOCAL) || ""; } catch (e) { return ""; }
  }

  // ---------- Conversa com a planilha ----------
  async function chamar(params) {
    const url = API + "?" + new URLSearchParams({ ...params, chave }).toString();
    const resp = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    const dados = await resp.json();
    if (!dados.ok) throw new Error(dados.erro || "Não deu certo");
    return dados;
  }

  async function carregarFotos() {
    try {
      const lista = await fetch("../dados/produtos.json").then((r) => r.json());
      lista.forEach((p) => (p.tons || []).forEach((t) => imagens.set(String(t.codigo), t.imagem || (p.imagens || [])[0])));
    } catch (e) { /* sem fotos, segue */ }
  }

  async function carregar() {
    el("carregando").hidden = false;
    el("erro").hidden = true;
    try {
      const dados = await chamar({ acao: "listar" });
      itens = dados.itens || [];
      el("link-planilha").href = dados.planilha || "#";
      el("conteudo").hidden = false;
      render();
    } catch (e) {
      mostrarErro(e.message === "Link do painel inválido"
        ? "🔒 Este link do painel não vale mais. Peça o link novo."
        : "Não consegui carregar os pedidos. Confira a internet e toque em 🔄 Atualizar.");
    } finally {
      el("carregando").hidden = true;
    }
  }

  function mostrarErro(texto) {
    el("erro").textContent = texto;
    el("erro").hidden = false;
  }

  // ---------- Montagem da tela ----------
  function agrupar(lista) {
    const mapa = new Map();
    lista.forEach((it) => {
      if (!mapa.has(it.pedido)) mapa.set(it.pedido, { pedido: it.pedido, cliente: it.cliente, quando: it.quando, itens: [] });
      mapa.get(it.pedido).itens.push(it);
    });
    return [...mapa.values()].sort((a, b) => String(a.quando).localeCompare(String(b.quando)));
  }

  function quandoTexto(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const hoje = new Date();
    const ontem = new Date(hoje.getTime() - 864e5);
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoje.toDateString()) return `hoje, ${hora}`;
    if (d.toDateString() === ontem.toDateString()) return `ontem, ${hora}`;
    return `${DIAS[d.getDay()]} ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}, ${hora}`;
  }

  function produtoHTML(it, extra) {
    const foto = imagens.get(String(it.codigo));
    const etiqueta = it.pegarDe === "Tenho em casa" ? `<span class="etiqueta casa">🏠 Tenho em casa</span>`
      : it.situacao === "No carrinho MK" ? `<span class="etiqueta mk">🛒 No carrinho Mary Kay</span>` : "";
    return `
      <div class="produto ${extra || ""}">
        ${foto ? `<img src="../${esc(foto)}" alt="">` : `<span class="sem-foto">🛍️</span>`}
        <div class="produto-info">
          <strong>${esc(it.produto)}</strong>
          <small>${it.tom ? `Tom: ${esc(it.tom)} · ` : ""}${brl.format(it.preco)}</small>
          ${extra === "com-etiqueta" ? etiqueta : ""}
        </div>
      </div>`;
  }

  function topoPedido(p) {
    return `<div class="pedido-topo"><strong>${esc(p.cliente)}</strong><span>${esc(quandoTexto(p.quando))}</span></div>`;
  }

  function totalHTML(p) {
    return `<div class="pedido-total"><span>Total</span><span>${brl.format(p.itens.reduce((s, x) => s + x.preco, 0))}</span></div>`;
  }

  function render() {
    const novos = agrupar(itens.filter((i) => i.situacao === "Novo"));
    const esgotados = itens.filter((i) => i.situacao === "Esgotado MK");
    const andamento = agrupar(itens.filter((i) => i.situacao === "Confirmado" || i.situacao === "No carrinho MK"));

    el("num-novos").textContent = novos.length;
    el("num-esgotados").textContent = esgotados.length;
    el("num-andamento").textContent = andamento.length;

    el("lista-novos").innerHTML = novos.length ? novos.map((p) => `
      <article class="pedido">
        ${topoPedido(p)}
        ${p.itens.map((it) => {
          const k = `${it.pedido}|${it.codigo}`;
          const emCasa = escolhas[k] === "Tenho em casa";
          return `
          <div>
            ${produtoHTML(it)}
            <div class="escolha">
              <button class="opcao" type="button" data-escolha="${esc(k)}" data-valor="Mary Kay" aria-pressed="${!emCasa}">🛒 Pedir à Mary Kay</button>
              <button class="opcao" type="button" data-escolha="${esc(k)}" data-valor="Tenho em casa" aria-pressed="${emCasa}">🏠 Tenho em casa</button>
            </div>
          </div>`;
        }).join("")}
        ${totalHTML(p)}
        <div class="pedido-acoes">
          <button class="btn-primario btn-confirmar" type="button" data-confirmar="${esc(p.pedido)}">✅ Recebi no WhatsApp — confirmar</button>
          <button class="btn-secundario" type="button" data-cancelar="${esc(p.pedido)}">❌ Não recebi / cancelar pedido</button>
        </div>
      </article>`).join("") : `<p class="nada">Nenhum pedido novo. 🎉</p>`;

    el("lista-esgotados").innerHTML = esgotados.length ? esgotados.map((it) => `
      <article class="pedido">
        ${topoPedido(it)}
        ${produtoHTML(it, "esgotado")}
        <div class="pedido-acoes">
          <button class="btn-primario" type="button" data-tenho="${esc(it.pedido)}|${esc(it.codigo)}">🏠 Tenho em casa</button>
          <button class="btn-secundario" type="button" data-sem="${esc(it.pedido)}|${esc(it.codigo)}">❌ Não tenho — cancelar este produto</button>
        </div>
      </article>`).join("") : `<p class="nada">Nada esgotado. 🎉</p>`;

    el("lista-andamento").innerHTML = andamento.length ? andamento.map((p) => `
      <article class="pedido">
        ${topoPedido(p)}
        ${p.itens.map((it) => produtoHTML(it, "com-etiqueta")).join("")}
        ${totalHTML(p)}
        <div class="pedido-acoes">
          <button class="btn-primario btn-confirmar" type="button" data-entregue="${esc(p.pedido)}">📦 Entreguei para a cliente</button>
        </div>
      </article>`).join("") : `<p class="nada">Nenhum pedido esperando entrega.</p>`;

    const h = new Date().getHours();
    el("saudacao").textContent = h < 12 ? "Bom dia! ☀️" : h < 18 ? "Boa tarde! 🌷" : "Boa noite! 🌙";
  }

  // ---------- Ações ----------
  let timer;
  function avisar(texto) {
    const a = el("aviso-rapido");
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { a.hidden = true; }, 4500);
  }

  async function executar(botao, passos, mensagem) {
    const botoes = document.querySelectorAll("button");
    botoes.forEach((b) => { b.disabled = true; });
    const textoOriginal = botao.textContent;
    botao.textContent = "Salvando…";
    try {
      for (const p of passos) await chamar({ acao: "atualizar", ...p });
      avisar(mensagem);
      await carregar();
    } catch (e) {
      botao.textContent = textoOriginal;
      avisar("Não deu certo. Confira a internet e tente de novo.");
    } finally {
      botoes.forEach((b) => { b.disabled = false; });
    }
  }

  const qtd = (n) => (n === 1 ? "1 produto" : `${n} produtos`);

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    const d = b.dataset;

    if (b.id === "btn-atualizar") {
      carregar();
    } else if (d.escolha) {
      if (d.valor === "Tenho em casa") escolhas[d.escolha] = "Tenho em casa"; else delete escolhas[d.escolha];
      render();
    } else if (d.confirmar) {
      const doPedido = itens.filter((i) => i.pedido === d.confirmar);
      const casa = doPedido.filter((i) => escolhas[`${i.pedido}|${i.codigo}`] === "Tenho em casa");
      const passos = casa.map((i) => ({ pedido: i.pedido, codigo: i.codigo, pegarDe: "Tenho em casa" }));
      passos.push({ pedido: d.confirmar, situacao: "Confirmado" });
      const mk = doPedido.length - casa.length;
      executar(b, passos, mk
        ? `Pedido confirmado! ${qtd(mk)} para pedir à Mary Kay.${casa.length ? ` ${qtd(casa.length)} do seu estoque.` : ""}`
        : "Pedido confirmado! Tudo sai do seu estoque.");
    } else if (d.cancelar) {
      if (!confirm("Cancelar este pedido? Ele sai da lista.")) return;
      executar(b, [{ pedido: d.cancelar, situacao: "Cancelado" }], "Pedido cancelado.");
    } else if (d.tenho) {
      const [pedido, codigo] = d.tenho.split("|");
      executar(b, [{ pedido, codigo, pegarDe: "Tenho em casa", situacao: "Confirmado" }], "Anotado: esse produto sai do seu estoque.");
    } else if (d.sem) {
      if (!confirm("Cancelar este produto? Lembre de avisar a cliente.")) return;
      const [pedido, codigo] = d.sem.split("|");
      executar(b, [{ pedido, codigo, situacao: "Cancelado" }], "Produto cancelado. Lembre de avisar a cliente pelo WhatsApp.");
    } else if (d.entregue) {
      executar(b, [{ pedido: d.entregue, situacao: "Entregue" }], "Pedido entregue! 🎉");
    }
  });

  // ---------- Início ----------
  chave = lerChave();
  if (!API || !chave) {
    el("sem-chave").hidden = false;
    el("btn-atualizar").hidden = true;
    return;
  }
  carregarFotos().then(carregar);
  // Atualiza sozinho a cada 2 minutos enquanto o painel estiver aberto
  setInterval(() => { if (!document.hidden) carregar(); }, 120000);
})();
