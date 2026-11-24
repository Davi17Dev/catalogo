// Tutorial guiado com os mascotes Bela (Base), Rubi (Batom) e Beijoca (Boquinha).
// Escurece a tela, destaca o botão explicado e mostra um balão com o mascote falando.
(function () {
  const CHAVE_VISTO = "catalogo-tutorial-visto-v1";

  const MASCOTES = {
    base: { nome: "Bela, a Base", img: "mascotes/base.svg" },
    batom: { nome: "Rubi, o Batom", img: "mascotes/batom.svg" },
    boca: { nome: "Beijoca, a Boquinha", img: "mascotes/boca.svg" }
  };

  const app = () => window.Catalogo;
  const topo = () => window.scrollTo({ top: 0, behavior: "auto" });

  const PASSOS = [
    {
      m: "base",
      titulo: "Oi, que bom ter você aqui!",
      texto: "Eu sou a Bela, a Base! Comigo estão o Rubi, o Batom, e a Beijoca, a Boquinha. " +
        "Nós vamos te mostrar, bem devagarinho, como escolher seus produtos e mandar o pedido para a sua consultora. " +
        "Toque em \"Próximo\" para começar.",
      antes: () => { app().fecharTudo(); topo(); }
    },
    {
      m: "batom", alvo: "#boas-vindas-video",
      titulo: "Um vídeo para te ajudar",
      texto: "Aqui vai ficar um vídeo curtinho mostrando tudo isso. Quando ele estiver pronto, é só tocar nele para assistir."
    },
    {
      m: "boca", alvo: "#busca",
      titulo: "Procurar um produto",
      texto: "Sabe o nome do que você quer? Toque nesta caixinha e escreva, por exemplo: batom, base ou perfume. " +
        "Os produtos aparecem sozinhos, não precisa apertar mais nada."
    },
    {
      m: "base", alvo: "#filtro-categoria",
      titulo: "Escolher uma categoria",
      texto: "Quer ver só um tipo de produto? Toque aqui e escolha: Maquiagem, Cuidados Faciais, Cuidados Corporais, " +
        "Fragrâncias ou Presentes. Para ver tudo de novo, escolha \"Todas as categorias\"."
    },
    {
      m: "batom", alvo: "#grade .card .card-botao",
      titulo: "Ver um produto",
      texto: "Cada quadrado com foto é um produto. Toque no botão rosa “Ver produto” (ou na foto) para ver tudo sobre ele: as cores, o preço e para que serve."
    },
    {
      m: "boca", alvo: "#det-tons-bloco",
      titulo: "Escolher a cor",
      texto: "Muitos produtos têm várias cores. Toque na bolinha da cor que você quer. " +
        "A foto muda e aparece escrito qual cor você escolheu.",
      antes: () => app().abrirProdutoExemplo()
    },
    {
      m: "base", alvo: "#det-adicionar",
      titulo: "Colocar no carrinho",
      texto: "Gostou? Toque neste botão. O produto vai para o seu carrinho, que é como uma sacolinha de compras."
    },
    {
      m: "batom", alvo: "#det-duvida",
      titulo: "Ficou com alguma dúvida?",
      texto: "Toque aqui e o WhatsApp abre para você conversar com a sua consultora sobre esse produto. Ela vai te ajudar!"
    },
    {
      m: "boca", alvo: "#det-infos",
      titulo: "Saber mais sobre o produto",
      texto: "Aqui embaixo tem mais informações: para que serve, como usar e os ingredientes. " +
        "Toque no título para abrir e toque de novo para fechar."
    },
    {
      m: "base", alvo: "#btn-carrinho",
      titulo: "Seu carrinho",
      texto: "Este botão fica sempre aqui em cima. O número mostra quantos produtos você já escolheu. " +
        "Toque nele para ver sua sacolinha.",
      antes: () => app().fecharTudo()
    },
    {
      m: "batom", alvo: "#btn-revisar",
      titulo: "Terminou de escolher?",
      texto: "Dentro do carrinho você vê os produtos e o total. Escreva seu nome, para a consultora saber que o pedido é seu. " +
        "Quando terminar, toque em \"Revisar e enviar pedido\".",
      antes: () => app().abrirCarrinhoExemplo()
    },
    {
      m: "boca", alvo: "#btn-confirmar-envio",
      titulo: "Enviar para a consultora",
      texto: "Confira se está tudo certinho e toque em \"Sim, enviar pelo WhatsApp\". " +
        "O WhatsApp abre com a mensagem pronta: lá, é só apertar o botão verde de enviar.",
      antes: () => app().abrirConfirmacaoExemplo()
    },
    {
      m: "base", alvo: "#btn-tutorial", nome: "Bela, Rubi e Beijoca",
      titulo: "Prontinho!",
      texto: "Viu como é fácil? Se quiser ver este passo a passo de novo, é só tocar neste botão. Boas compras!",
      antes: () => { app().voltarAoNormal(); topo(); }
    }
  ];

  let indice = 0;
  let ativo = false;
  let alvoAtual = null;
  let raiz, foco, mao, cartao, imgMascote, nome, titulo, texto, pontos, btnVoltar, btnProximo;

  function criarElementos() {
    raiz = document.createElement("div");
    raiz.className = "tut sem-alvo";
    raiz.hidden = true;
    raiz.setAttribute("role", "dialog");
    raiz.setAttribute("aria-modal", "true");
    raiz.setAttribute("aria-labelledby", "tut-titulo");
    raiz.innerHTML = `
      <div class="tut-bloqueio"></div>
      <div class="tut-foco"></div>
      <div class="tut-mao" aria-hidden="true"></div>
      <div class="tut-cartao embaixo">
        <img class="tut-mascote" alt="">
        <div>
          <p class="tut-nome"></p>
          <h2 class="tut-titulo" id="tut-titulo"></h2>
        </div>
        <p class="tut-texto" aria-live="polite"></p>
        <div class="tut-rodape">
          <div class="tut-pontos" aria-hidden="true"></div>
          <div class="tut-botoes">
            <button type="button" class="btn-secundario tut-voltar">Voltar</button>
            <button type="button" class="btn-primario tut-proximo">Próximo</button>
          </div>
          <button type="button" class="tut-pular">Pular o passo a passo</button>
        </div>
      </div>`;
    document.body.appendChild(raiz);

    foco = raiz.querySelector(".tut-foco");
    mao = raiz.querySelector(".tut-mao");
    cartao = raiz.querySelector(".tut-cartao");
    imgMascote = raiz.querySelector(".tut-mascote");
    nome = raiz.querySelector(".tut-nome");
    titulo = raiz.querySelector(".tut-titulo");
    texto = raiz.querySelector(".tut-texto");
    pontos = raiz.querySelector(".tut-pontos");
    btnVoltar = raiz.querySelector(".tut-voltar");
    btnProximo = raiz.querySelector(".tut-proximo");

    pontos.innerHTML = PASSOS.map(() => "<span></span>").join("");
    btnVoltar.addEventListener("click", () => irPara(indice - 1));
    btnProximo.addEventListener("click", () => (indice >= PASSOS.length - 1 ? fechar() : irPara(indice + 1)));
    raiz.querySelector(".tut-pular").addEventListener("click", fechar);

    document.addEventListener("keydown", (e) => {
      if (!ativo) return;
      if (e.key === "Escape") { e.stopPropagation(); fechar(); }
      else if (e.key === "ArrowRight") btnProximo.click();
      else if (e.key === "ArrowLeft" && indice > 0) btnVoltar.click();
    }, true);

    const reposicionar = () => { if (ativo) posicionar(); };
    window.addEventListener("resize", reposicionar);
    document.addEventListener("scroll", reposicionar, true);
  }

  function marcarVisto() {
    try { localStorage.setItem(CHAVE_VISTO, "1"); } catch (e) { /* sem armazenamento: tudo bem */ }
  }

  function jaViu() {
    try { return localStorage.getItem(CHAVE_VISTO) === "1"; } catch (e) { return false; }
  }

  function posicionar() {
    if (!alvoAtual || !document.body.contains(alvoAtual)) {
      raiz.classList.add("sem-alvo");
      cartao.className = "tut-cartao no-meio";
      return;
    }
    raiz.classList.remove("sem-alvo");
    const r = alvoAtual.getBoundingClientRect();
    const folga = 8;
    const topoFoco = Math.max(4, r.top - folga);
    const baseFoco = Math.min(window.innerHeight - 4, r.bottom + folga);
    foco.style.top = topoFoco + "px";
    foco.style.left = Math.max(4, r.left - folga) + "px";
    foco.style.width = Math.min(window.innerWidth - 8, r.width + folga * 2) + "px";
    foco.style.height = Math.max(20, baseFoco - topoFoco) + "px";

    // Balão no lado com mais espaço livre, para não cobrir o que está sendo explicado
    const espacoAcima = topoFoco;
    const espacoAbaixo = window.innerHeight - baseFoco;
    const alvoEmBaixo = espacoAcima > espacoAbaixo;
    cartao.className = "tut-cartao " + (alvoEmBaixo ? "em-cima" : "embaixo");

    // Mãozinha apontando para o botão
    const centro = Math.min(window.innerWidth - 44, Math.max(4, r.left + r.width / 2 - 20));
    mao.style.left = centro + "px";
    if (alvoEmBaixo) {
      mao.classList.add("para-baixo");
      mao.style.top = Math.max(4, topoFoco - 30) + "px";
    } else {
      mao.classList.remove("para-baixo");
      mao.style.top = Math.min(window.innerHeight - 50, baseFoco + 6) + "px";
    }
  }

  // Leva o botão explicado para perto do topo da tela, deixando a parte de baixo livre para o balão.
  function rolarAte(alvo) {
    if (alvo.closest(".topo")) return; // o topo fica sempre visível
    const caixaModal = alvo.closest(".modal-conteudo");
    const r = alvo.getBoundingClientRect();
    if (caixaModal) {
      const m = caixaModal.getBoundingClientRect();
      caixaModal.scrollTop += r.top - m.top - 16;
    } else {
      const fimDoTopo = document.querySelector(".topo").getBoundingClientRect().bottom;
      window.scrollBy(0, r.top - fimDoTopo - 14);
    }
  }

  function irPara(novo) {
    if (novo < 0 || novo >= PASSOS.length) return;
    indice = novo;
    const passo = PASSOS[indice];
    if (passo.antes) passo.antes();

    const mascote = MASCOTES[passo.m];
    imgMascote.src = mascote.img;
    imgMascote.classList.remove("entrando");
    void imgMascote.offsetWidth; // reinicia a animação de entrada
    imgMascote.classList.add("entrando");
    nome.textContent = passo.nome || mascote.nome;
    titulo.textContent = passo.titulo;
    texto.textContent = passo.texto;

    [...pontos.children].forEach((p, i) => {
      p.className = i === indice ? "atual" : i < indice ? "feito" : "";
    });
    btnVoltar.disabled = indice === 0;
    btnVoltar.style.visibility = indice === 0 ? "hidden" : "visible";
    btnProximo.textContent = indice === PASSOS.length - 1 ? "Começar a comprar" : "Próximo";

    alvoAtual = passo.alvo ? document.querySelector(passo.alvo) : null;
    if (alvoAtual) {
      rolarAte(alvoAtual);
      // espera a página assentar antes de medir a posição
      requestAnimationFrame(() => requestAnimationFrame(posicionar));
      setTimeout(posicionar, 350);
    } else {
      posicionar();
    }
    btnProximo.focus({ preventScroll: true });
  }

  function abrir() {
    if (!window.Catalogo) return;
    if (!raiz) criarElementos();
    ativo = true;
    document.body.classList.add("tut-ativo");
    raiz.hidden = false;
    irPara(0);
  }

  function fechar() {
    ativo = false;
    document.body.classList.remove("tut-ativo");
    raiz.hidden = true;
    marcarVisto();
    app().voltarAoNormal();
    const botao = document.getElementById("btn-tutorial");
    if (botao) botao.focus({ preventScroll: true });
  }

  // Botões que abrem o tutorial
  document.getElementById("btn-tutorial").addEventListener("click", abrir);
  document.getElementById("boas-vindas-video").addEventListener("click", abrir);

  // Na primeira visita, o tutorial começa sozinho assim que os produtos carregam
  document.addEventListener("catalogo:pronto", () => {
    if (!jaViu()) setTimeout(abrir, 700);
  });

  window.TutorialCatalogo = { abrir, fechar };
})();
