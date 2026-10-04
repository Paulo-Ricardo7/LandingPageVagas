// Seleciona o formulário e a tabela no HTML.
const formulario = document.getElementById("formulario-vaga");
const tabela = document.getElementById("lista-vagas");
const mensagem = document.getElementById("mensagem");
const contador = document.getElementById("contador");
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let totalVagas = 0;

function cadastrarVaga() {
  // Evita cadastros com campos preenchidos apenas com espaços.
  for (const campo of formulario.querySelectorAll("input")) {
    campo.value = campo.value.trim();
  }
  if (!formulario.reportValidity()) return null;

  const vaga = {
    cargo: formulario.elements.cargo.value,
    empresa: formulario.elements.empresa.value,
    local: formulario.elements.local.value,
    bolsa: formulario.elements.bolsa.value,
    email: formulario.elements.email.value
  };

  // Cria a nova linha. textContent mantém os dados como texto seguro.
  const linha = document.createElement("tr");
  const dados = [
    vaga.cargo,
    vaga.empresa,
    vaga.local,
    vaga.bolsa === "" ? "A combinar" : moeda.format(Number(vaga.bolsa)),
    vaga.email
  ];
  for (const dado of dados) {
    const celula = document.createElement("td");
    celula.textContent = dado;
    linha.appendChild(celula);
  }

  document.getElementById("lista-vazia")?.remove();
  tabela.prepend(linha);
  totalVagas++;
  contador.textContent = totalVagas === 1 ? "1 vaga" : `${totalVagas} vagas`;
  mensagem.textContent = `Vaga de ${vaga.cargo} cadastrada na tabela!`;

  // Limpa os campos para o próximo cadastro.
  formulario.reset();
  formulario.elements.empresa.focus();
  return vaga;
}

// Impede que o envio do formulário recarregue a página.
formulario.addEventListener("submit", function (evento) {
  evento.preventDefault();
  cadastrarVaga();
});

// Integração opcional com navegadores que oferecem WebMCP.
// O cadastro usa a mesma função do formulário e só existe nesta página aberta.
if (document.modelContext?.registerTool) {
  const ciclo = new AbortController();
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: "cadastrar_vaga",
      title: "Cadastrar vaga de estágio",
      description: "Adiciona uma vaga à tabela desta demonstração. Os dados são apagados ao atualizar a página.",
      inputSchema: {
        type: "object",
        properties: {
          empresa: { type: "string", minLength: 1, maxLength: 100 },
          cargo: { type: "string", minLength: 1, maxLength: 100 },
          local: { type: "string", minLength: 1, maxLength: 100 },
          email: { type: "string", format: "email", maxLength: 150 },
          bolsa: { type: "number", minimum: 0, maximum: 100000, multipleOf: 0.01 }
        },
        required: ["empresa", "cargo", "local", "email"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute(dados) {
        if (!dados || typeof dados !== "object") throw new Error("Informe os dados da vaga.");
        for (const nome of ["empresa", "cargo", "local", "email"]) {
          const valor = dados[nome];
          const limite = nome === "email" ? 150 : 100;
          if (typeof valor !== "string" || !valor.trim() || valor.length > limite) {
            throw new Error(`Preencha corretamente o campo ${nome}.`);
          }
        }
        const testeEmail = document.createElement("input");
        testeEmail.type = "email";
        testeEmail.value = dados.email;
        if (!testeEmail.checkValidity()) throw new Error("Informe um e-mail válido.");
        if (dados.bolsa !== undefined && (typeof dados.bolsa !== "number" || !Number.isFinite(dados.bolsa) || dados.bolsa < 0 || dados.bolsa > 100000 || Math.abs(dados.bolsa * 100 - Math.round(dados.bolsa * 100)) > 0.000001)) {
          throw new Error("Informe uma bolsa válida, com até duas casas decimais.");
        }
        for (const nome of ["empresa", "cargo", "local", "email", "bolsa"]) {
          formulario.elements[nome].value = dados[nome] ?? "";
        }
        const vaga = cadastrarVaga();
        if (!vaga) throw new Error("Confira os campos do formulário.");
        return { cadastrada: true, vaga, total: totalVagas, duracao: "página aberta" };
      }
    }, { signal: ciclo.signal })).catch(() => {});
  } catch (_) {
    // A página continua funcionando se a integração não estiver disponível.
  }
  window.addEventListener("pagehide", evento => {
    if (!evento.persisted) ciclo.abort();
  }, { once: true });
}
