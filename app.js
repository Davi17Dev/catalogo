(function () {
  const CFG = window.CONFIG_CATALOGO || {};
  const CHAVE_CARRINHO = "catalogo-carrinho-v3";
  const ORDEM_CATEGORIAS = ["Maquiagem", "Cuidados Faciais", "Cuidados Corporais", "Fragrâncias", "Presentes", "Seção 2", "Nova Consultora", "Destaques"];
  const NOMES_SECAO = { "Seção 2": "Itens para sua sessão" };

  const el = (id) => document.getElementById(id);
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const dinheiro = (v) => (typeof v === "number" ? brl.format(v) : "consultar");

  let produtos = [];
  let porId = new Map();
  let carrinho = carregarCarrinho(); // [{ codigo, produtoId, tom }]
  let produtoAberto = null;
  let tomEscolhido = null; // índice em tonsEscolhiveis(produtoAberto)

  // ---------- Armazenamento local (com proteção) ----------
  function carregarCarrinho() {
    try {
      const lista = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]");
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function salvarCarrinho() {
    try {
      localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
    } catch (e) {
      /* armazenamento bloqueado: o carrinho continua valendo enquanto a página estiver aberta */
    }
  }

  // ---------- Utilidades ----------
  function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  // Variações com nome (tons, tipos de pele). Produtos de opção única não pedem escolha.
  // Tons fora de linha não aparecem.
  function tonsEscolhiveis(p) {
    return (p.tons || []).filter((t) => t.nome && !t.descontinuado);
  }

  // Tons esgotados no site continuam disponíveis: a consultora pode ter o produto no estoque dela.
  function tomDisponivel(t) {
    return !t.descontinuado;
  }

  function imagemPrincipal(p) {
    const comFoto = (p.tons || []).find((t) => t.imagem);
    return (p.imagens && p.imagens[0]) || (comFoto && comFoto.imagem) || "";
  }

  function imagemHTML(src, alt) {
    if (src) return `<div class="imagem"><img src="${escapar(src)}" alt="${escapar(alt)}" loading="lazy"></div>`;
    return `<div class="imagem"><span class="swatch-unico" style="background:#e9c9d3"></span></div>`;
  }

  function precoHTML(p, classeDe) {
    const de = typeof p.precoDe === "number" && p.precoDe > p.preco
      ? `<span class="${classeDe}">${dinheiro(p.precoDe)}</span>` : "";
    return de + dinheiro(p.preco);
  }

  // ---------- Carregamento ----------
  async function carregarProdutos() {
    try {
      const resposta = await fetch(CFG.arquivoProdutos || "dados/produtos.json", { cache: "no-store" });
      if (!resposta.ok) throw new Error("HTTP " + resposta.status);
      // Produtos fora de linha ficam no arquivo, mas não aparecem para a cliente
      produtos = (await resposta.json()).filter((p) => !p.descontinuado && typeof p.preco === "number");
      porId = new Map(produtos.map((p) => [p.id, p]));
      return true;
    } catch (e) {
      el("grade").innerHTML = "";
      el("mensagem-vazia").hidden = false;
      el("mensagem-vazia").textContent =
        "Não foi possível carregar os produtos. Abra o catálogo por um endereço online ou por um servidor local.";
      return false;
    }
  }

  function ordenarCategorias(lista) {
    const pos = (c) => { const i = ORDEM_CATEGORIAS.indexOf(c); return i < 0 ? 99 : i; };
    return [...lista].sort((a, b) => pos(a) - pos(b) || a.localeCompare(b));
  }

  function preencherCategorias() {
    const select = el("filtro-categoria");
    ordenarCategorias([...new Set(produtos.map((p) => p.categoria).filter(Boolean))]).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = NOMES_SECAO[c] || c;
      select.appendChild(opt);
    });
  }

  // ---------- Grade ----------
  function cartaoHTML(p) {
    const tons = tonsEscolhiveis(p);
    const selo = p.descontinuado ? "Indisponível" : (p.selos || []).includes("Novo") ? "Novo" :
      (p.selos || []).includes("Edição Limitada") ? "Edição Limitada" : "";
    return `
      <button class="card" type="button" data-id="${escapar(p.id)}">
        ${imagemHTML(imagemPrincipal(p), p.nome)}
        ${selo ? `<span class="selo">${escapar(selo)}</span>` : ""}
        <span class="card-nome">${escapar(p.nome)}</span>
        ${tons.length > 1 ? `<span class="card-tons">${tons.length} opções</span>` : ""}
        <span class="card-preco">${precoHTML(p, "card-de")}</span>
        <span class="card-botao" aria-hidden="true">Ver produto</span>
      </button>`;
  }

  function renderGrade() {
    const termo = el("busca").value.trim().toLowerCase();
    const categoria = el("filtro-categoria").value;

    const filtrados = produtos.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (!termo) return true;
      const tons = (p.tons || []).map((t) => `${t.nome} ${t.codigo}`).join(" ");
      return `${p.nome} ${p.id} ${p.subcategoria || ""} ${tons}`.toLowerCase().includes(termo);
    });

    el("mensagem-vazia").hidden = filtrados.length > 0;

    if (termo || categoria) {
      el("grade").innerHTML = `<div class="grade-cartoes">${filtrados.map(cartaoHTML).join("")}</div>`;
      return;
    }

    const secoes = [];
    const novos = filtrados.filter((p) => (p.selos || []).includes("Novo") && !p.descontinuado);
    if (novos.length) secoes.push({ titulo: "Lançamentos", itens: novos });
    ordenarCategorias([...new Set(filtrados.map((p) => p.categoria))]).forEach((cat) => {
      secoes.push({ titulo: NOMES_SECAO[cat] || cat, itens: filtrados.filter((p) => p.categoria === cat) });
    });

    el("grade").innerHTML = secoes.map((s) => `
      <section class="secao">
        <h2 class="secao-titulo">${escapar(s.titulo)} <span>(${s.itens.length})</span></h2>
        <div class="grade-cartoes">${s.itens.map(cartaoHTML).join("")}</div>
      </section>`).join("");
  }

  // ---------- Detalhe do produto ----------
  function mostrarImagem(src) {
    el("det-imagem").innerHTML = imagemHTML(src, produtoAberto ? produtoAberto.nome : "");
    document.querySelectorAll("#det-miniaturas button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.src === src));
    });
  }

  function montarMiniaturas(p) {
    const lista = [...new Set([...(p.imagens || []), ...tonsEscolhiveis(p).map((t) => t.imagem)].filter(Boolean))].slice(0, 8);
    el("det-miniaturas").innerHTML = lista.length > 1
      ? lista.map((src, i) => `
          <button type="button" data-src="${escapar(src)}" aria-label="Foto ${i + 1}">
            <img src="${escapar(src)}" alt="" loading="lazy">
          </button>`).join("")
      : "";
  }

  function abrirProduto(id) {
    const p = porId.get(id);
    if (!p) return;
    produtoAberto = p;
    const tons = tonsEscolhiveis(p);
    tomEscolhido = tons.length === 1 && tomDisponivel(tons[0]) ? 0 : null;

    montarMiniaturas(p);
    mostrarImagem(imagemPrincipal(p));

    el("det-nome").textContent = p.nome;
    el("det-categoria").innerHTML = [escapar(NOMES_SECAO[p.categoria] || p.categoria), escapar(p.subcategoria)]
      .filter(Boolean).join(" · ") + (p.tamanho ? ` · <span class="det-tamanho">${escapar(p.tamanho)}</span>` : "");
    el("det-preco").innerHTML = precoHTML(p, "card-de");
    el("det-resumo").textContent = p.resumo || "";

    const aviso = el("det-aviso");
    aviso.hidden = !p.descontinuado;
    aviso.textContent = "Este produto saiu de linha e não pode mais ser pedido.";

    el("det-tons-bloco").hidden = tons.length === 0;
    el("det-tons-titulo").textContent = p.tituloEscolha || "Escolha o tom";
    el("det-tons").innerHTML = tons.map((t, i) => `
        <button class="tom" type="button" data-tom="${i}" aria-pressed="${tomEscolhido === i}">
          ${t.cor ? `<span class="tom-bolinha" style="background:${escapar(t.cor)}"></span>` : ""}
          <span>${escapar(t.nome)}${t.acabamento ? ` <small>(${escapar(t.acabamento)})</small>` : ""}</span>
        </button>`).join("");
    atualizarTomEscolhido();

    const bloqueado = !!p.descontinuado;
    el("det-adicionar").disabled = bloqueado;
    el("det-adicionar").textContent = bloqueado ? "Indisponível no momento" : "Adicionar ao carrinho";

    el("det-infos").innerHTML = (p.infos || []).map((s) => `
      <details>
        <summary>${escapar(s.titulo)}</summary>
        <div class="info-texto${/ingrediente/i.test(s.titulo) ? " ingredientes" : ""}">${escapar(s.texto)}</div>
      </details>`).join("");

    atualizarLinkDuvida();
    el("modal-produto").hidden = false;
    el("modal-produto").querySelector(".modal-conteudo").scrollTop = 0;
  }

  function codigoSelecionado() {
    const tons = tonsEscolhiveis(produtoAberto);
    if (tons.length && tomEscolhido !== null) return tons[tomEscolhido].codigo;
    const unico = (produtoAberto.tons || []).find(tomDisponivel);
    return unico ? unico.codigo : produtoAberto.id;
  }

  function atualizarTomEscolhido() {
    const tons = tonsEscolhiveis(produtoAberto);
    const info = el("det-tom-escolhido");
    if (tomEscolhido === null || !tons[tomEscolhido]) { info.hidden = true; return; }
    info.hidden = false;
    info.textContent = `Você escolheu: ${tons[tomEscolhido].nome}`;
  }

  function atualizarLinkDuvida() {
    const tons = tonsEscolhiveis(produtoAberto);
    const tom = tomEscolhido !== null && tons[tomEscolhido] ? `, tom ${tons[tomEscolhido].nome}` : "";
    el("det-duvida").href = urlWhatsApp(
      `Olá, consultora! Tenho uma dúvida sobre o produto ${produtoAberto.nome}${tom}.`
    );
  }

  function adicionarAoCarrinho() {
    if (!produtoAberto) return;
    const tons = tonsEscolhiveis(produtoAberto);
    if (tons.length > 1 && tomEscolhido === null) {
      alert(`Por favor, primeiro ${(produtoAberto.tituloEscolha || "escolha o tom").toLowerCase()} tocando em uma das opções.`);
      el("det-tons-bloco").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const codigo = codigoSelecionado();
    const tom = tons.length && tomEscolhido !== null ? tons[tomEscolhido].nome : "";
    if (!carrinho.some((i) => i.codigo === codigo)) {
      carrinho.push({ codigo, produtoId: produtoAberto.id, tom });
      salvarCarrinho();
    }
    atualizarContador();
    el("modal-produto").hidden = true;
    abrirCarrinho();
  }

  // ---------- Carrinho ----------
  function itensDoCarrinho() {
    return carrinho
      .map((item) => {
        const p = porId.get(item.produtoId);
        if (!p) return null;
        const t = (p.tons || []).find((x) => x.codigo === item.codigo);
        return { item, p, imagem: (t && t.imagem) || imagemPrincipal(p) };
      })
      .filter(Boolean);
  }

  function totalDoCarrinho(itens) {
    return itens.reduce((s, x) => s + (typeof x.p.preco === "number" ? x.p.preco : 0), 0);
  }

  function itemHTML({ item, p, imagem }, comRemover) {
    return `
      <li class="item-carrinho">
        ${imagem ? `<img src="${escapar(imagem)}" alt="">` : ""}
        <div class="item-info">
          <strong>${escapar(p.nome)}</strong>
          ${item.tom ? `<small>Tom: ${escapar(item.tom)}</small>` : ""}
          <small>${dinheiro(p.preco)}</small>
        </div>
        ${comRemover ? `<button type="button" data-remover="${escapar(item.codigo)}">Remover</button>` : ""}
      </li>`;
  }

  function atualizarContador() {
    el("contador-carrinho").textContent = carrinho.length;
  }

  // "itensExemplo" é usado só pelo tutorial: mostra o carrinho sem mexer no carrinho de verdade
  function renderCarrinho(itensExemplo) {
    const itens = itensExemplo || itensDoCarrinho();
    el("carrinho-vazio").hidden = itens.length > 0;
    el("lista-carrinho").innerHTML = itens.map((x) => itemHTML(x, true)).join("");
    el("carrinho-total").hidden = itens.length === 0;
    el("carrinho-total").innerHTML = `<span>Total estimado</span><span>${brl.format(totalDoCarrinho(itens))}</span>`;
    el("btn-revisar").disabled = itens.length === 0;
  }

  function abrirCarrinho(itensExemplo) {
    renderCarrinho(itensExemplo);
    el("modal-carrinho").hidden = false;
  }

  function removerDoCarrinho(codigo) {
    carrinho = carrinho.filter((i) => i.codigo !== codigo);
    salvarCarrinho();
    atualizarContador();
    renderCarrinho();
  }

  function limparCarrinho() {
    if (!carrinho.length) return;
    if (!confirm("Tem certeza que quer tirar todos os produtos do carrinho?")) return;
    carrinho = [];
    salvarCarrinho();
    atualizarContador();
    renderCarrinho();
  }

  // ---------- Revisão e envio ----------
  function abrirRevisao(itensExemplo) {
    const itens = Array.isArray(itensExemplo) ? itensExemplo : itensDoCarrinho();
    if (!itens.length) return;
    el("lista-confirmar").innerHTML = itens.map((x) => itemHTML(x, false)).join("");
    el("confirmar-total").innerHTML = `<span>Total estimado</span><span>${brl.format(totalDoCarrinho(itens))}</span>`;
    el("modal-carrinho").hidden = true;
    el("modal-confirmar").hidden = false;
  }

  function urlWhatsApp(texto) {
    const numero = (CFG.whatsapp || "").replace(/\D/g, "");
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  // Identificação interna do pedido: não aparece para a cliente nem na mensagem.
  // Serve só para a planilha não gravar o mesmo pedido duas vezes e para o robô.
  function novoIdPedido() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // A consultora reconhece o pedido pelo nome da cliente, por isso o nome é obrigatório
  const CHAVE_NOME = "catalogo-nome-v1";
  function nomeDaCliente() { return el("nome-cliente").value.trim(); }
  function lembrarNome() {
    try { localStorage.setItem(CHAVE_NOME, nomeDaCliente()); } catch (e) { /* sem memória, tudo bem */ }
  }
  function nomeLembrado() {
    try { return localStorage.getItem(CHAVE_NOME) || ""; } catch (e) { return ""; }
  }
  function revisarSeTemNome() {
    if (!nomeDaCliente()) {
      el("aviso-nome").hidden = false;
      el("nome-cliente").focus();
      return;
    }
    el("aviso-nome").hidden = true;
    lembrarNome();
    abrirRevisao();
  }

  function montarMensagem() {
    const nome = el("nome-cliente").value.trim();
    const itens = itensDoCarrinho();
    const linhas = ["Olá, consultora! Estava olhando o catálogo e encontrei tais produtos:"];
    if (nome) linhas.push(`Meu nome: ${nome}`);
    linhas.push("");
    itens.forEach(({ item, p }, idx) => {
      linhas.push(`*${idx + 1})*`);
      linhas.push(`Nome: ${p.nome}`);
      if (item.tom) linhas.push(`Tom: ${item.tom}`);
      linhas.push(`Preço: ${dinheiro(p.preco)}`);
      linhas.push("");
    });
    linhas.push(`Total estimado: ${brl.format(totalDoCarrinho(itens))}`);
    return linhas.join("\n");
  }

  // Grava o pedido na planilha da consultora (Google). Não atrapalha o envio pelo WhatsApp:
  // se a internet falhar aqui, a mensagem do WhatsApp sai do mesmo jeito.
  function registrarNaPlanilha(id) {
    const url = CFG.urlPedidos;
    if (!url) return;
    const dados = {
      pedido: id,
      cliente: nomeDaCliente(),
      itens: itensDoCarrinho().map(({ item, p }) => ({
        codigo: item.codigo, nome: p.nome, tom: item.tom || "", preco: p.preco
      }))
    };
    try {
      fetch(url, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(dados)
      }).catch(() => {});
    } catch (e) { /* segue só pelo WhatsApp */ }
  }

  function confirmarEnvio() {
    window.open(urlWhatsApp(montarMensagem()), "_blank", "noopener");
    registrarNaPlanilha(novoIdPedido());
    el("modal-confirmar").hidden = true;
  }

  // ---------- Eventos ----------
  function ligarEventos() {
    el("busca").addEventListener("input", renderGrade);
    el("filtro-categoria").addEventListener("change", renderGrade);

    el("grade").addEventListener("click", (e) => {
      const card = e.target.closest("[data-id]");
      if (card) abrirProduto(card.dataset.id);
    });

    el("det-miniaturas").addEventListener("click", (e) => {
      const b = e.target.closest("[data-src]");
      if (b) mostrarImagem(b.dataset.src);
    });

    el("det-tons").addEventListener("click", (e) => {
      const botao = e.target.closest("[data-tom]");
      if (!botao || botao.disabled) return;
      tomEscolhido = Number(botao.dataset.tom);
      document.querySelectorAll("#det-tons .tom").forEach((b) => {
        b.setAttribute("aria-pressed", String(Number(b.dataset.tom) === tomEscolhido));
      });
      const t = tonsEscolhiveis(produtoAberto)[tomEscolhido];
      if (t && t.imagem) mostrarImagem(t.imagem);
      atualizarTomEscolhido();
      atualizarLinkDuvida();
    });

    el("det-adicionar").addEventListener("click", adicionarAoCarrinho);
    el("btn-carrinho").addEventListener("click", () => abrirCarrinho());
    el("btn-revisar").addEventListener("click", revisarSeTemNome);
    el("nome-cliente").value = nomeLembrado();
    el("nome-cliente").addEventListener("input", () => { if (nomeDaCliente()) el("aviso-nome").hidden = true; });
    el("btn-limpar").addEventListener("click", limparCarrinho);
    el("btn-confirmar-envio").addEventListener("click", confirmarEnvio);
    el("btn-voltar-carrinho").addEventListener("click", () => {
      el("modal-confirmar").hidden = true;
      abrirCarrinho();
    });

    el("lista-carrinho").addEventListener("click", (e) => {
      const botao = e.target.closest("[data-remover]");
      if (botao) removerDoCarrinho(botao.dataset.remover);
    });

    document.querySelectorAll("[data-fechar]").forEach((b) => {
      b.addEventListener("click", () => (b.closest(".modal").hidden = true));
    });
    document.querySelectorAll(".modal").forEach((m) => {
      m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
    });
  }

  // ---------- Ganchos para o tutorial ----------
  // Produto de exemplo: um com várias cores e informações, para o passo a passo ficar completo.
  function produtoExemplo() {
    return produtos.find((p) => tonsEscolhiveis(p).length >= 4 && (p.infos || []).length >= 2 && p.tons.some((t) => t.cor))
      || produtos[0];
  }

  function itensExemplo() {
    const p = produtoExemplo();
    const t = tonsEscolhiveis(p)[0];
    return [{ item: { codigo: t ? t.codigo : p.id, produtoId: p.id, tom: t ? t.nome : "" }, p, imagem: (t && t.imagem) || imagemPrincipal(p) }];
  }

  function fecharTudo() {
    document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  }

  window.Catalogo = {
    fecharTudo,
    abrirProdutoExemplo() {
      fecharTudo();
      const p = produtoExemplo();
      abrirProduto(p.id);
      // mostra uma cor já escolhida, como se a cliente tivesse tocado nela
      const botao = document.querySelector('#det-tons [data-tom="0"]');
      if (botao) botao.click();
    },
    abrirCarrinhoExemplo() { fecharTudo(); abrirCarrinho(itensExemplo()); },
    abrirConfirmacaoExemplo() { fecharTudo(); abrirRevisao(itensExemplo()); },
    voltarAoNormal() { fecharTudo(); renderCarrinho(); }
  };

  // ---------- Início ----------
  async function iniciar() {
    el("titulo-consultora").textContent = "Catálogo · " + (CFG.nomeConsultora || "Consultora");
    ligarEventos();
    atualizarContador();
    if (await carregarProdutos()) {
      carrinho = carrinho.filter((i) => porId.has(i.produtoId));
      atualizarContador();
      preencherCategorias();
      renderGrade();
      document.dispatchEvent(new CustomEvent("catalogo:pronto"));
    }
  }

  iniciar();
})();
